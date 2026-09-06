// =============================================================================
// File: src/lib/security/PinVault.ts
// Description: Demo transaction-PIN vault for customer Adashi payments (D-A2).
// Server-side ownership of the PIN: only a salted SHA-256 hash is stored, with
// 5-attempt lockout (15 minutes). This is the DEMO vault — it ships a known
// default PIN so the demo is operable; the production path is OTP/TOTP backed
// by the real session layer (documented in docs/customer-adashi-rebuild/).
//
// Runtime store: /tmp/korie-pin-vault.json (env PIN_VAULT_PATH override).
// NEVER committed.
// =============================================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const PIN_VAULT_PATH = process.env.PIN_VAULT_PATH || '/tmp/korie-pin-vault.json';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Demo default PIN. Can be overridden per customer with an env var of the form
// ADASHI_PIN_<CUSTOMER_ID normalized> — e.g. ADASHI_PIN_CUST_NG_001_IBRAHIM.
const DEFAULT_DEMO_PIN = '123456';

interface PinRecord {
  customerId: string;
  pinHash: string;
  salt: string;
  failedAttempts: number;
  lockedUntil?: string;
  updatedAt: string;
}

export type PinVerifyResult =
  | { ok: true }
  | { ok: false; code: 'WRONG_PIN'; attemptsLeft: number }
  | { ok: false; code: 'PIN_LOCKED'; retryAfterMs: number }
  | { ok: false; code: 'NOT_ENROLLED' };

function normalizeCustomerKey(customerId: string): string {
  return customerId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function pinEnvOverride(customerId: string): string | undefined {
  return process.env[`ADASHI_PIN_${normalizeCustomerKey(customerId)}`];
}

function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export class PinVault {
  private static instance: PinVault;

  private records = new Map<string, PinRecord>();

  private constructor() {
    this.hydrate();
  }

  public static getInstance(): PinVault {
    if (!PinVault.instance) {
      PinVault.instance = new PinVault();
    }
    return PinVault.instance;
  }

  private hydrate() {
    try {
      if (!fs.existsSync(PIN_VAULT_PATH)) return;
      const data = JSON.parse(fs.readFileSync(PIN_VAULT_PATH, 'utf8'));
      if (Array.isArray(data.records)) {
        this.records.clear();
        data.records.forEach((r: PinRecord) => this.records.set(r.customerId, r));
      }
    } catch {
      /* corrupt/missing store */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(PIN_VAULT_PATH), { recursive: true });
      fs.writeFileSync(
        PIN_VAULT_PATH,
        JSON.stringify({ records: Array.from(this.records.values()) }),
      );
    } catch {
      /* non-fatal */
    }
  }

  /** Enroll a demo customer with the documented default or env override. */
  public ensureEnrolled(customerId: string): void {
    this.hydrate();
    if (this.records.has(customerId)) return;
    const pin = pinEnvOverride(customerId) || DEFAULT_DEMO_PIN;
    if (!/^\d{6}$/.test(pin)) return; // invalid override: stay unenrolled
    const salt = crypto.randomBytes(16).toString('hex');
    this.records.set(customerId, {
      customerId,
      pinHash: hashPin(pin, salt),
      salt,
      failedAttempts: 0,
      updatedAt: new Date().toISOString(),
    });
    this.persist();
  }

  public verify(customerId: string, pin: string): PinVerifyResult {
    this.hydrate();
    const rec = this.records.get(customerId);
    if (!rec) return { ok: false, code: 'NOT_ENROLLED' };

    if (rec.lockedUntil && new Date(rec.lockedUntil).getTime() > Date.now()) {
      return {
        ok: false,
        code: 'PIN_LOCKED',
        retryAfterMs: new Date(rec.lockedUntil).getTime() - Date.now(),
      };
    }

    const ok = rec.pinHash === hashPin(pin, rec.salt);
    if (!ok) {
      rec.failedAttempts += 1;
      if (rec.failedAttempts >= MAX_ATTEMPTS) {
        rec.lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
        rec.failedAttempts = 0;
        rec.updatedAt = new Date().toISOString();
        this.persist();
        return { ok: false, code: 'PIN_LOCKED', retryAfterMs: LOCKOUT_MS };
      }
      rec.updatedAt = new Date().toISOString();
      this.persist();
      return { ok: false, code: 'WRONG_PIN', attemptsLeft: MAX_ATTEMPTS - rec.failedAttempts };
    }

    rec.failedAttempts = 0;
    rec.lockedUntil = undefined;
    rec.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true };
  }

  public changePin(customerId: string, currentPin: string, newPin: string): PinVerifyResult {
    const check = this.verify(customerId, currentPin);
    if (!check.ok) return check;
    if (!/^\d{6}$/.test(newPin)) return { ok: false, code: 'WRONG_PIN', attemptsLeft: 0 };
    const salt = crypto.randomBytes(16).toString('hex');
    this.records.set(customerId, {
      customerId,
      pinHash: hashPin(newPin, salt),
      salt,
      failedAttempts: 0,
      updatedAt: new Date().toISOString(),
    });
    this.persist();
    return { ok: true };
  }
}

export const pinVault = PinVault.getInstance();

export function demoPinHint(customerId: string): string | null {
  return process.env[`ADASHI_PIN_${normalizeCustomerKey(customerId)}`] || '123456';
}
