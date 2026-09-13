import crypto from 'crypto';
import fs from 'fs';
import { AuthService } from './authService';
import { CustomerLifecycleEngine } from '@/lib/customer/CustomerLifecycleEngine';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';

/**
 * Server session registry — OTP challenges + bearer sessions, batch-3
 * remediation for "any ≥6-digit OTP passes, kp_sess_* unregistered".
 *
 * Design mirrors the credential registry: secrets are salted SHA-256 hashes
 * (timing-safe compare), raw values exist only at issuance, everything
 * fail-closed with distinct codes, file-backed store outside the repo.
 *
 * Two deliberate sandbox honesties:
 *  1. No SMS/email provider is integrated, so `dispatched` is always false
 *     and the response says which channel was NOT used. The code is returned
 *     as `testCode` (labeled test mode — the standard test-OTP pattern) only
 *     in non-production, or in production with explicit KORIE_ALLOW_OTP_TEST.
 *     Production default: never reveal. KORIE_OTP_TEST_MODE=false kills it
 *     everywhere.
 *  2. Sessions bind to engine subjects (customer/agent records). A session
 *     whose subject no longer exists fails closed (SESSION_SUBJECT_GONE).
 */

export class SessionEngineError extends Error {
  code: string;
  httpStatus: number;
  details?: Record<string, unknown>;
  constructor(code: string, message: string, httpStatus = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SessionEngineError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export type SessionSubjectType = 'CUSTOMER' | 'AGENT';

/** User-session grant: what a verified human session may call. No admin, bank, developer or merchant scopes. */
export const SESSION_SCOPES: string[] = [
  'payments:read',
  'payments:write',
  'transfers:write',
  'wallets:read',
  'fx:read',
  'kyc:verify',
  'agency:write',
  'bills:vend',
];

const STORE_PATH = process.env.KORIE_SESSION_STORE_PATH || '/tmp/korie-sessions.json';
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ISSUES_PER_HOUR = 5;
const SESSION_TTL_MS = 12 * 3600 * 1000;

interface OtpChallenge {
  id: string;
  identifierNorm: string;
  codeHash: string;
  salt: string;
  attemptsLeft: number;
  createdAt: number;
  expiresAt: number;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  salt: string;
  subjectType: SessionSubjectType;
  subjectId: string;
  identifierMasked: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  revokedAt?: string;
}

const hashSecret = (raw: string, salt: string): string =>
  crypto.createHash('sha256').update(`${salt}:${raw}`).digest('hex');

const secretsEqual = (candidateHash: string, storedHash: string): boolean => {
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

const digitsOnly = (v: string): string => v.replace(/\D/g, '');
/** Last-10-digits comparison tolerates +234/234/0 prefix variance. */
const samePhone = (a: string, b: string): boolean => {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  return da.length >= 7 && db.length >= 7 && da.slice(-10) === db.slice(-10);
};

export function otpTestMode(): boolean {
  // Default secure: production builds never reveal codes. Non-production
  // reveals unless explicitly disabled; production reveals only with the
  // explicit escape hatch (staging/sandbox prod-builds that have no provider).
  if ((process.env.KORIE_OTP_TEST_MODE || '').trim() === 'false') return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return (process.env.KORIE_ALLOW_OTP_TEST || '').trim().toLowerCase() === 'true';
}

export class SessionEngine {
  private static instance: SessionEngine | null = null;
  public static getInstance(): SessionEngine {
    if (!SessionEngine.instance) {
      SessionEngine.instance = new SessionEngine();
      SessionEngine.instance.hydrate();
    }
    return SessionEngine.instance;
  }

  private challenges: OtpChallenge[] = [];
  private sessions: SessionRecord[] = [];
  private issueLog: Record<string, number[]> = {};
  private seq = 1;

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      if (Array.isArray(data.challenges)) this.challenges = data.challenges;
      if (Array.isArray(data.sessions)) this.sessions = data.sessions;
      if (data.issueLog) this.issueLog = data.issueLog;
      if (data.seq) this.seq = data.seq;
    } catch {
      /* corrupt or missing store — start empty */
    }
  }

  private persist() {
    try {
      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify(
          {
            challenges: this.challenges,
            sessions: this.sessions,
            issueLog: this.issueLog,
            seq: this.seq,
          },
          null,
          2
        )
      );
    } catch {
      /* ephemeral store unwritable — sessions still work in-process */
    }
  }

  /** Canonical identifier: email lowercased, phones normalized per country hint. */
  public normalizeIdentifier(identifier: string, country: 'NG' | 'NE' = 'NG'): string {
    const trimmed = (identifier || '').trim();
    if (trimmed.includes('@')) return trimmed.toLowerCase();
    return AuthService.getInstance().normalizePhone(trimmed, country);
  }

  public maskIdentifier(identifierNorm: string): string {
    const auth = AuthService.getInstance();
    return identifierNorm.includes('@') ? auth.maskEmail(identifierNorm) : auth.maskPhone(identifierNorm);
  }

  public resolveSubject(identifierNorm: string): { type: SessionSubjectType; id: string } | null {
    const isEmail = identifierNorm.includes('@');
    try {
      const customers = CustomerLifecycleEngine.getInstance().getCustomers();
      const customer = customers.find(c =>
        isEmail
          ? (c.email || '').toLowerCase() === identifierNorm
          : samePhone(c.phone || '', identifierNorm)
      );
      if (customer) return { type: 'CUSTOMER', id: customer.id };
    } catch {
      /* engine unavailable — fall through */
    }
    try {
      const agents = AgentManagementEngine.getInstance().getAgents();
      const agent = agents.find(a =>
        isEmail
          ? (a.email || '').toLowerCase() === identifierNorm
          : samePhone(a.phone || '', identifierNorm)
      );
      if (agent) return { type: 'AGENT', id: agent.id };
    } catch {
      /* engine unavailable — fall through */
    }
    return null;
  }

  private subjectExists(type: SessionSubjectType, id: string): boolean {
    try {
      if (type === 'CUSTOMER') return !!CustomerLifecycleEngine.getInstance().getCustomer(id);
      return !!AgentManagementEngine.getInstance().getAgent(id);
    } catch {
      return false;
    }
  }

  /**
   * Issues an OTP challenge. Always answers 200-shaped data for well-formed
   * identifiers (no existence oracle); throttle states are distinct codes.
   */
  public requestOtp(
    identifier: string,
    country: 'NG' | 'NE' = 'NG'
  ): {
    maskedDestination: string;
    expiresInSeconds: number;
    dispatched: boolean;
    channel: string;
    testMode: boolean;
    testCode?: string;
  } {
    this.hydrate();
    const norm = this.normalizeIdentifier(identifier, country);
    if (!norm || norm.length < 3) {
      throw new SessionEngineError('VALIDATION_ERROR', 'A valid identifier (phone or email) is required.', 400);
    }
    const now = Date.now();
    const live = this.challenges.find(c => c.identifierNorm === norm && c.expiresAt > now);
    if (live && now - live.createdAt < OTP_RESEND_COOLDOWN_MS) {
      throw new SessionEngineError(
        'OTP_RESEND_TOO_SOON',
        `A code was just sent. Wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - live.createdAt)) / 1000)}s before requesting another.`,
        429
      );
    }
    const hourAgo = now - 3600 * 1000;
    const recent = (this.issueLog[norm] || []).filter(t => t > hourAgo);
    if (recent.length >= OTP_MAX_ISSUES_PER_HOUR) {
      throw new SessionEngineError('OTP_RATE_LIMITED', 'Too many codes requested for this identifier. Try again later.', 429);
    }
    // A fresh request supersedes any live challenge for this identifier.
    this.challenges = this.challenges.filter(c => c.identifierNorm !== norm);
    const code = String(crypto.randomInt(100000, 1000000));
    const salt = crypto.randomBytes(16).toString('hex');
    this.challenges.push({
      id: `otp_${Date.now().toString(36)}_${this.seq++}`,
      identifierNorm: norm,
      codeHash: hashSecret(code, salt),
      salt,
      attemptsLeft: OTP_MAX_ATTEMPTS,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
    });
    this.issueLog[norm] = [...recent, now];
    this.persist();
    const test = otpTestMode();
    return {
      maskedDestination: this.maskIdentifier(norm),
      expiresInSeconds: OTP_TTL_MS / 1000,
      dispatched: false,
      channel: 'NONE_CONFIGURED',
      testMode: test,
      ...(test ? { testCode: code } : {}),
    };
  }

  /**
   * Verifies an OTP and mints a registered session. The code is single-use;
   * failures burn attempts, never hints about code structure.
   */
  public verifyOtp(
    identifier: string,
    code: string,
    country: 'NG' | 'NE' = 'NG'
  ): {
    sessionToken: string;
    expiresAt: string;
    subjectType: SessionSubjectType;
    subjectId: string;
    maskedDestination: string;
  } {
    this.hydrate();
    const norm = this.normalizeIdentifier(identifier, country);
    const now = Date.now();
    const challenge = this.challenges.find(c => c.identifierNorm === norm);
    if (!challenge) {
      throw new SessionEngineError('OTP_NOT_REQUESTED', 'No code was requested for this identifier. Request one first.', 404);
    }
    if (challenge.expiresAt <= now) {
      this.challenges = this.challenges.filter(c => c.id !== challenge.id);
      this.persist();
      throw new SessionEngineError('OTP_EXPIRED', 'That code has expired. Request a fresh one.', 410);
    }
    if (challenge.attemptsLeft <= 0) {
      throw new SessionEngineError('OTP_LOCKED', 'Too many wrong attempts. Request a fresh code.', 423);
    }
    const candidate = String(code || '').trim();
    if (!secretsEqual(hashSecret(candidate, challenge.salt), challenge.codeHash)) {
      challenge.attemptsLeft -= 1;
      this.persist();
      throw new SessionEngineError(
        'OTP_MISMATCH',
        challenge.attemptsLeft > 0
          ? `That code does not match — ${challenge.attemptsLeft} attempt${challenge.attemptsLeft === 1 ? '' : 's'} left.`
          : 'That code does not match. No attempts left — request a fresh code.',
        401,
        { attemptsLeft: challenge.attemptsLeft }
      );
    }
    // Single use: burn the challenge before minting.
    this.challenges = this.challenges.filter(c => c.id !== challenge.id);
    const subject = this.resolveSubject(norm);
    if (!subject) {
      this.persist();
      throw new SessionEngineError(
        'NO_SUCH_SUBJECT',
        'That identifier is not registered to any customer or agent. Register first, then verify.',
        404
      );
    }
    const raw = `kp_sess_${crypto.randomBytes(18).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const session: SessionRecord = {
      id: `sess_${Date.now().toString(36)}_${this.seq++}`,
      tokenHash: hashSecret(raw, salt),
      salt,
      subjectType: subject.type,
      subjectId: subject.id,
      identifierMasked: this.maskIdentifier(norm),
      scopes: [...SESSION_SCOPES],
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
      lastUsedAt: new Date(now).toISOString(),
    };
    this.sessions.push(session);
    this.persist();
    return {
      sessionToken: raw,
      expiresAt: session.expiresAt,
      subjectType: subject.type,
      subjectId: subject.id,
      maskedDestination: session.identifierMasked,
    };
  }

  public verifySession(
    rawToken: string
  ): { ok: true; session: SessionRecord } | { ok: false; code: 'INVALID_SESSION' | 'SESSION_REVOKED' | 'SESSION_EXPIRED' | 'SESSION_SUBJECT_GONE' } {
    this.hydrate();
    const now = Date.now();
    for (const session of this.sessions) {
      let matches = false;
      try {
        matches = secretsEqual(hashSecret(rawToken, session.salt), session.tokenHash);
      } catch {
        matches = false;
      }
      if (!matches) continue;
      if (session.revokedAt) return { ok: false, code: 'SESSION_REVOKED' };
      if (Date.parse(session.expiresAt) <= now) return { ok: false, code: 'SESSION_EXPIRED' };
      if (!this.subjectExists(session.subjectType, session.subjectId)) {
        return { ok: false, code: 'SESSION_SUBJECT_GONE' };
      }
      session.lastUsedAt = new Date(now).toISOString();
      this.persist();
      return { ok: true, session };
    }
    return { ok: false, code: 'INVALID_SESSION' };
  }

  /** Logout: destroys the session server-side. Idempotent. */
  public revokeSession(rawToken: string): boolean {
    this.hydrate();
    for (const session of this.sessions) {
      let matches = false;
      try {
        matches = secretsEqual(hashSecret(rawToken, session.salt), session.tokenHash);
      } catch {
        matches = false;
      }
      if (matches && !session.revokedAt) {
        session.revokedAt = new Date().toISOString();
        this.persist();
        return true;
      }
      if (matches) return true;
    }
    return false;
  }
}
