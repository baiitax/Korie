import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  DeveloperApplication,
  DeveloperEnvironment,
  DeveloperMember,
  DeveloperOrganization,
  ApiCredential,
  ApiRequestLog,
  WebhookEndpoint,
  HttpMethod,
} from '@/types/developer';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

/**
 * DeveloperWorkspaceEngine — server-owned state for the Sandbox Developer
 * Portal (org → applications → environments → credentials → usage).
 *
 * Repository convention: deterministic in-memory singletons. This engine is
 * the developer-platform namespace ONLY. It never reads or mutates financial
 * engines (ledger/treasury/cash/compliance) — sandbox isolation is enforced
 * at the engine boundary, not by the frontend.
 *
 * Secrets: raw keys are returned exactly once (create/rotate response) and
 * are never stored in a retrievable list payload; all list operations return
 * masked previews. DEMO runtime: state resets with the server process.
 */

export interface OnboardingStep {
  key: 'account' | 'application' | 'sandbox_key' | 'first_request' | 'webhook' | 'production_ready';
  done: boolean;
  detail: string;
}

export class DeveloperWorkspaceEngineError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus = 400,
  ) {
    super(message);
    this.name = 'DeveloperWorkspaceEngineError';
  }
}

interface StoredCredential extends ApiCredential {
  secretKeyRaw?: string;
}

const STORE_PATH =
  process.env.DEVELOPER_WS_STORE_PATH || '/tmp/korie-developer-workspace.json';

const mask = (raw: string) => {
  if (raw.length <= 12) return raw.slice(0, 4) + '…';
  return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
};

const generateKey = (env: DeveloperEnvironment, kind: 'sec' | 'pub') =>
  `kp_${env === 'PRODUCTION' ? 'live' : 'test'}_${kind}_${crypto.randomBytes(18).toString('hex')}`;

export class DeveloperWorkspaceEngine {
  private static instance: DeveloperWorkspaceEngine | null = null;
  public static getInstance(): DeveloperWorkspaceEngine {
    if (!DeveloperWorkspaceEngine.instance) {
      DeveloperWorkspaceEngine.instance = new DeveloperWorkspaceEngine();
      DeveloperWorkspaceEngine.instance.hydrate();
    }
    return DeveloperWorkspaceEngine.instance;
  }

  /* ---------------------------------------------------------- state */
  private organization: DeveloperOrganization = {
    id: 'org_kor_99182',
    name: 'Sahel Global Technologies Ltd',
    slug: 'sahel-global-tech',
    country: 'CROSS_BORDER',
    jurisdiction: 'Bilateral WAEMU',
    businessType: 'FINTECH',
    verificationStatus: 'VERIFIED',
    tier: 'ENTERPRISE',
    createdAt: '2026-01-14T08:30:00Z',
    defaultCurrency: 'NGN',
  };

  private members: DeveloperMember[] = [
    { id: 'usr_dev_01', orgId: 'org_kor_99182', name: 'Ibrahim Abubakar', email: 'i.abubakar@saheltech.io', role: 'OWNER', status: 'ACTIVE', mfaEnabled: true, lastLogin: '2026-09-03T14:15:22Z' },
    { id: 'usr_dev_02', orgId: 'org_kor_99182', name: 'Amina Bello, Lead Architect', email: 'amina.bello@saheltech.io', role: 'ADMIN', status: 'ACTIVE', mfaEnabled: true, lastLogin: '2026-09-03T15:40:10Z' },
    { id: 'usr_dev_03', orgId: 'org_kor_99182', name: 'Moussa Seydou, Integration Engineer', email: 'm.seydou@saheltech.io', role: 'DEVELOPER', status: 'ACTIVE', mfaEnabled: false, lastLogin: '2026-09-03T11:02:45Z' },
    { id: 'usr_dev_04', orgId: 'org_kor_99182', name: 'Chinedu Eze, QA Analyst', email: 'c.eze@saheltech.io', role: 'ANALYST', status: 'ACTIVE', mfaEnabled: false, lastLogin: '2026-09-02T16:20:00Z' },
  ];

  private applications: DeveloperApplication[] = [
    {
      id: 'app_sand_88201',
      orgId: 'org_kor_99182',
      name: 'Sahel Cross-Border Mobile Hub (Sandbox)',
      description: 'Bilateral remittance & retail merchant checkout simulator for Lagos & Niamey retail branches.',
      environment: 'SANDBOX',
      status: 'ACTIVE',
      enabledApis: ['payments', 'wallets', 'customers', 'kyc', 'merchant', 'agency', 'bills', 'fx_cross_border'],
      scopes: ['payments:read', 'payments:write', 'transfers:write', 'wallets:read', 'wallets:write', 'webhooks:write', 'kyc:read'],
      ipWhitelist: ['197.210.84.12', '102.89.34.190', '160.154.20.5'],
      rateLimitPerMinute: 600,
      monthlyRequestQuota: 2500000,
      createdAt: '2026-01-15T10:00:00Z',
      lastUsedAt: '2026-09-03T16:10:00Z',
    },
    {
      id: 'app_prod_99402',
      orgId: 'org_kor_99182',
      name: 'Sahel Cross-Border Production Gateway',
      description: 'Live bilateral NGN / XOF commercial clearing pipeline.',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      enabledApis: ['payments', 'wallets', 'customers', 'merchant', 'fx_cross_border'],
      scopes: ['payments:read', 'payments:write', 'transfers:write', 'wallets:read', 'webhooks:write'],
      ipWhitelist: ['197.210.84.12', '197.210.84.13', '160.154.20.10'],
      rateLimitPerMinute: 2400,
      monthlyRequestQuota: 10000000,
      createdAt: '2026-03-01T09:00:00Z',
      lastUsedAt: '2026-09-03T16:12:30Z',
    },
  ];

  /** Production key issuance is gated until the org's production access is
   *  approved — sandbox is the only self-serve environment. */
  private productionAccessStatus: 'NOT_REQUESTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' = 'NOT_REQUESTED';

  private credentials: StoredCredential[] = (() => {
    const seedPub = `kp_test_pub_${crypto.randomBytes(18).toString('hex')}`;
    const seedSec = `kp_test_sec_${crypto.randomBytes(18).toString('hex')}`;
    return [
    {
      id: 'cred_sand_01',
      appId: 'app_sand_88201',
      orgId: 'org_kor_99182',
      name: 'Sandbox Primary',
      type: 'SECRET_KEY',
      environment: 'SANDBOX',
      publicKey: seedPub,
      secretKeyMasked: mask(seedSec),
      scopes: ['payments:read', 'payments:write', 'transfers:write', 'wallets:read', 'kyc:read'],
      status: 'ACTIVE',
      createdAt: '2026-01-15T10:05:00Z',
      lastUsedAt: '2026-09-03T16:10:00Z',
      createdByName: 'Ibrahim Abubakar',
    },
    ];
  })();

  private webhookEndpoints: WebhookEndpoint[] = [
    {
      id: 'wh_sand_01',
      appId: 'app_sand_88201',
      orgId: 'org_kor_99182',
      url: 'https://webhook.saheltech.io/koriepay/sandbox',
      environment: 'SANDBOX',
      status: 'ACTIVE',
      events: ['transaction.created', 'transaction.successful', 'transaction.failed', 'customer.created'],
      signingSecretMasked: '',
      failureCount: 0,
      lastDeliveryStatus: 'DELIVERED',
      lastDeliveredAt: '2026-09-03T15:58:00Z',
      createdAt: '2026-02-02T12:00:00Z',
      retryPolicy: 'STANDARD_EXPONENTIAL',
    },
  ];

  /** Request logs: engine-owned. Starts empty — entries appear as the portal
   *  executes real sandbox requests through the gateway envelope. */
  private requestLogs: ApiRequestLog[] = [];

  private activity: { id: string; actor: string; action: string; detail: string; timestamp: string }[] = [
    { id: 'act_001', actor: 'Ibrahim Abubakar', action: 'organization.created', detail: 'Organization Sahel Global Technologies Ltd verified (ENTERPRISE, Bilateral WAEMU)', timestamp: '2026-01-14T08:30:00Z' },
    { id: 'act_002', actor: 'Ibrahim Abubakar', action: 'application.created', detail: 'Created sandbox application Sahel Cross-Border Mobile Hub (Sandbox)', timestamp: '2026-01-15T10:00:00Z' },
    { id: 'act_003', actor: 'Amina Bello', action: 'credential.generated', detail: 'Generated sandbox secret key for Sahel Cross-Border Mobile Hub (Sandbox)', timestamp: '2026-01-15T10:05:00Z' },
    { id: 'act_004', actor: 'Moussa Seydou', action: 'webhook.created', detail: 'Registered sandbox webhook endpoint https://webhook.saheltech.io/koriepay/sandbox', timestamp: '2026-02-02T12:00:00Z' },
  ];

  /* State is owned by this engine but persisted to a small JSON store so
   * every route handler (isolated module instances) sees the same truth.
   * DEMO runtime: the store lives in the OS temp dir and resets with the
   * host — deliberately never in the repo. Secrets are never persisted
   * raw; only masked previews survive restarts. */
  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (data.organization) this.organization = data.organization;
      if (data.members) this.members = data.members;
      if (data.applications) this.applications = data.applications;
      if (data.productionAccessStatus) this.productionAccessStatus = data.productionAccessStatus;
      if (data.credentials) this.credentials = data.credentials;
      if (data.webhookEndpoints) this.webhookEndpoints = data.webhookEndpoints;
      if (data.requestLogs) this.requestLogs = data.requestLogs;
      if (data.activity) this.activity = data.activity;
      if (data.seq) this.seq = data.seq;
    } catch {
      /* corrupt or missing store — keep in-memory seeds */
    }
  }

  private persist() {
    try {
      const payload = {
        organization: this.organization,
        members: this.members,
        applications: this.applications,
        productionAccessStatus: this.productionAccessStatus,
        credentials: this.credentials.map(({ secretKeyRaw: _raw, ...c }) => ({ ...c, secretKeyRaw: undefined })),
        webhookEndpoints: this.webhookEndpoints,
        requestLogs: this.requestLogs,
        activity: this.activity,
        seq: this.seq,
      };
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(payload));
    } catch {
      /* non-fatal: state stays in memory for this process */
    }
  }

  private seq = 100;
  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36)}${Date.now().toString(36).slice(-4)}`;
  }

  private now() {
    return new Date().toISOString();
  }

  private logActivity(actor: string, action: string, detail: string) {
    this.activity.unshift({ id: this.nextId('act'), actor, action, detail, timestamp: this.now() });
    if (this.activity.length > 100) this.activity.pop();
    this.persist();
  }

  /* --------------------------------------------------- workspace */
  public getWorkspace() {
    this.hydrate();
    return {
      organization: this.organization,
      members: this.members,
      applications: this.applications,
      webhookEndpointCount: this.webhookEndpoints.length,
      productionAccessStatus: this.productionAccessStatus,
      onboarding: this.getOnboardingProgress(),
      counts: {
        credentials: this.credentials.filter(c => c.status === 'ACTIVE').length,
        webhookEndpoints: this.webhookEndpoints.length,
        requestsToday: this.requestLogs.filter(r => r.timestamp.slice(0, 10) === this.now().slice(0, 10)).length,
      },
    };
  }

  public getOnboardingProgress(): OnboardingStep[] {
    this.hydrate();
    const hasActiveApp = this.applications.some(a => a.status === 'ACTIVE');
    const hasSandboxKey = this.credentials.some(c => c.status === 'ACTIVE' && c.environment === 'SANDBOX');
    const hasFirstRequest = this.requestLogs.length > 0;
    const hasWebhook = this.webhookEndpoints.some(w => w.status === 'ACTIVE');
    const prodReady = hasSandboxKey && hasFirstRequest && hasWebhook && this.productionAccessStatus === 'APPROVED';
    return [
      { key: 'account', done: true, detail: 'Organization verified' },
      { key: 'application', done: hasActiveApp, detail: hasActiveApp ? 'Sandbox application active' : 'Create your first application' },
      { key: 'sandbox_key', done: hasSandboxKey, detail: hasSandboxKey ? 'Sandbox key generated' : 'Generate sandbox credentials' },
      { key: 'first_request', done: hasFirstRequest, detail: hasFirstRequest ? 'First sandbox request executed' : 'Execute your first API request' },
      { key: 'webhook', done: hasWebhook, detail: hasWebhook ? 'Webhook endpoint configured' : 'Configure a webhook endpoint' },
      { key: 'production_ready', done: prodReady, detail: prodReady ? 'Production access approved' : 'Request production access when integration is complete' },
    ];
  }

  /* ------------------------------------------------- applications */
  public listApplications(): DeveloperApplication[] {
    this.hydrate();
    return [...this.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getApplication(id: string): DeveloperApplication {
    this.hydrate();
    const app = this.applications.find(a => a.id === id);
    if (!app) throw new DeveloperWorkspaceEngineError('NOT_FOUND', 'Application not found', 404);
    return app;
  }

  public createApplication(input: { name: string; description?: string }, actor: string): DeveloperApplication {
    const name = (input.name || '').trim();
    if (name.length < 3) throw new DeveloperWorkspaceEngineError('VALIDATION_ERROR', 'Application name must be at least 3 characters');
    if (this.applications.some(a => a.name.toLowerCase() === name.toLowerCase()))
      throw new DeveloperWorkspaceEngineError('DUPLICATE_REQUEST', 'An application with this name already exists', 409);
    const app: DeveloperApplication = {
      id: this.nextId('app'),
      orgId: this.organization.id,
      name,
      description: input.description?.trim() ?? '',
      environment: 'SANDBOX',
      status: 'ACTIVE',
      enabledApis: ['payments', 'wallets'],
      scopes: ['payments:read', 'payments:write', 'wallets:read'],
      ipWhitelist: [],
      rateLimitPerMinute: 600,
      monthlyRequestQuota: 1000000,
      createdAt: this.now(),
      lastUsedAt: '',
    };
    this.applications.unshift(app);
    this.logActivity(actor, 'application.created', `Created sandbox application ${app.name}`);
    return app;
  }

  public updateApplication(
    id: string,
    patch: { name?: string; description?: string; status?: 'ACTIVE' | 'DEPRECATED' | 'REVOKED' },
    actor: string,
  ): DeveloperApplication {
    const app = this.getApplication(id);
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 3) throw new DeveloperWorkspaceEngineError('VALIDATION_ERROR', 'Application name must be at least 3 characters');
      app.name = name;
    }
    if (patch.description !== undefined) app.description = patch.description.trim();
    if (patch.status !== undefined) {
      app.status = patch.status;
      this.logActivity(actor, 'application.status_changed', `${app.name} → ${patch.status}`);
    }
    return app;
  }

  /* -------------------------------------------------- credentials */
  public listCredentials(environment?: DeveloperEnvironment): ApiCredential[] {
    this.hydrate();
    return this.credentials
      .filter(c => !environment || c.environment === environment)
      .map(({ secretKeyRaw: _raw, ...cred }) => ({ ...cred, secretKeyMasked: cred.secretKeyMasked }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public createCredential(
    input: { appId: string; name?: string; environment: DeveloperEnvironment; scopes?: string[] },
    actor: string,
  ): { credential: ApiCredential; secretKeyRaw: string } {
    const app = this.getApplication(input.appId);
    if (app.status !== 'ACTIVE') throw new DeveloperWorkspaceEngineError('FORBIDDEN', `Application is ${app.status}`, 403);
    if (input.environment === 'PRODUCTION') {
      if (this.productionAccessStatus !== 'APPROVED')
        throw new DeveloperWorkspaceEngineError(
          'FORBIDDEN',
          'Production credentials require approved production access. Complete the sandbox checklist and request production access first.',
          403,
        );
      if (app.environment !== 'PRODUCTION')
        throw new DeveloperWorkspaceEngineError('VALIDATION_ERROR', 'Production keys require a production application', 400);
    }
    const secretKeyRaw = generateKey(input.environment, 'sec');
    const entry: StoredCredential = {
      id: this.nextId('cred'),
      appId: app.id,
      orgId: this.organization.id,
      name: (input.name || '').trim() || (input.environment === 'SANDBOX' ? 'Sandbox Primary' : 'Production Primary'),
      type: 'SECRET_KEY',
      environment: input.environment,
      publicKey: generateKey(input.environment, 'pub'),
      secretKeyMasked: mask(secretKeyRaw),
      secretKeyRaw,
      scopes: input.scopes && input.scopes.length ? input.scopes : app.scopes,
      status: 'ACTIVE',
      createdAt: this.now(),
      lastUsedAt: '',
      createdByName: actor,
    };
    this.credentials.unshift(entry);
    this.logActivity(actor, 'credential.generated', `Generated ${input.environment} secret key for ${app.name}`);
    const { secretKeyRaw: _raw, ...cred } = entry;
    return { credential: { ...cred, secretKeyMasked: entry.secretKeyMasked }, secretKeyRaw };
  }

  public rotateCredential(id: string, actor: string): { credential: ApiCredential; secretKeyRaw: string } {
    const cred = this.credentials.find(c => c.id === id);
    if (!cred) throw new DeveloperWorkspaceEngineError('NOT_FOUND', 'Credential not found', 404);
    if (cred.status === 'REVOKED') throw new DeveloperWorkspaceEngineError('FORBIDDEN', 'Revoked credentials cannot be rotated', 403);
    // Archive the old secret (grace window) and issue a fresh pair.
    cred.status = 'ROTATING';
    cred.gracePeriodExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    delete cred.secretKeyRaw;
    const app = this.getApplication(cred.appId);
    const secretKeyRaw = generateKey(cred.environment, 'sec');
    const fresh: StoredCredential = {
      id: this.nextId('cred'),
      appId: cred.appId,
      orgId: cred.orgId,
      name: `${cred.name} (rotated)`,
      type: cred.type,
      environment: cred.environment,
      publicKey: cred.publicKey,
      secretKeyMasked: mask(secretKeyRaw),
      secretKeyRaw,
      scopes: cred.scopes,
      status: 'ACTIVE',
      createdAt: this.now(),
      lastUsedAt: '',
      createdByName: actor,
    };
    this.credentials.unshift(fresh);
    this.logActivity(actor, 'credential.rotated', `Rotated ${cred.environment} secret key for ${app.name}`);
    const { secretKeyRaw: _raw, ...rest } = fresh;
    return { credential: { ...rest, secretKeyMasked: fresh.secretKeyMasked }, secretKeyRaw };
  }

  public revokeCredential(id: string, actor: string): ApiCredential {
    const cred = this.credentials.find(c => c.id === id);
    if (!cred) throw new DeveloperWorkspaceEngineError('NOT_FOUND', 'Credential not found', 404);
    if (cred.status === 'REVOKED') throw new DeveloperWorkspaceEngineError('DUPLICATE_REQUEST', 'Credential already revoked', 409);
    cred.status = 'REVOKED';
    cred.gracePeriodExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    delete cred.secretKeyRaw;
    const app = this.getApplication(cred.appId);
    this.logActivity(actor, 'credential.revoked', `Revoked ${cred.environment} secret key for ${app.name}`);
    const { secretKeyRaw: _raw, ...rest } = cred;
    return { ...rest, secretKeyMasked: cred.secretKeyMasked };
  }

  public isProductionAccessApproved(): boolean {
    this.hydrate();
    return this.productionAccessStatus === 'APPROVED';
  }

  public requestProductionAccess(actor: string): { status: string } {
    if (this.productionAccessStatus === 'APPROVED')
      return { status: this.productionAccessStatus };
    this.productionAccessStatus = 'UNDER_REVIEW';
    this.logActivity(actor, 'production_access.requested', 'Production access request submitted for review');
    return { status: this.productionAccessStatus };
  }

  /* ---------------------------------------------- request logs */
  public recordRequest(input: {
    requestId: string;
    correlationId: string;
    appId: string;
    appName: string;
    environment: DeveloperEnvironment;
    method: HttpMethod;
    endpoint: string;
    statusCode: number;
    latencyMs: number;
    ipAddress?: string;
    requestHeadersMasked: Record<string, string>;
    requestBodyMasked?: Record<string, unknown>;
    responseBodyMasked: Record<string, unknown>;
    errorMessage?: string;
    providerNode?: ApiRequestLog['providerNode'];
  }): ApiRequestLog {
    const entry: ApiRequestLog = {
      id: this.nextId('req'),
      requestId: input.requestId,
      correlationId: input.correlationId,
      appId: input.appId,
      appName: input.appName,
      environment: input.environment,
      method: input.method,
      endpoint: input.endpoint,
      statusCode: input.statusCode,
      latencyMs: input.latencyMs,
      ipAddress: input.ipAddress ?? '197.210.84.12',
      country: 'INTERNATIONAL',
      timestamp: this.now(),
      requestHeadersMasked: input.requestHeadersMasked,
      requestBodyMasked: input.requestBodyMasked,
      responseBodyMasked: input.responseBodyMasked,
      errorMessage: input.errorMessage,
      providerNode: input.providerNode,
    };
    this.requestLogs.unshift(entry);
    if (this.requestLogs.length > 500) this.requestLogs.pop();
    this.persist();
    return entry;
  }

  public listRequestLogs(filter?: { environment?: DeveloperEnvironment; status?: number; appId?: string; endpoint?: string }): ApiRequestLog[] {
    this.hydrate();
    return this.requestLogs.filter(r => {
      if (filter?.environment && r.environment !== filter.environment) return false;
      if (filter?.status && r.statusCode !== filter.status) return false;
      if (filter?.appId && r.appId !== filter.appId) return false;
      if (filter?.endpoint && !r.endpoint.includes(filter.endpoint)) return false;
      return true;
    });
  }

  public getRequestLog(requestId: string): ApiRequestLog | undefined {
    this.hydrate();
    return this.requestLogs.find(r => r.requestId === requestId);
  }

  /* ------------------------------------------------- activity */
  public listActivity() {
    this.hydrate();
    return [...this.activity];
  }

  public getGateway() {
    return ApiGatewayEngine.getInstance();
  }
}
