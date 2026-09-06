/* Admin Configuration & Automation Engine — server-owned, file-backed (DEMO runtime).
 *
 * Owns: external fintech connector registry (gateways, settlement rails, bank nodes,
 * liquidity pools, WhatsApp agents, KYC sources, FX sources, CIT couriers, notification
 * providers, AI decision services, custom REST), live probe + OpenAPI capability
 * discovery, automation rules + decision service, system parameters, and the audit log.
 *
 * State persists to /tmp/korie-admin-config.json (never committed; env override
 * ADMIN_CONFIG_STORE_PATH). Every public method hydrates at entry; mutations persist via
 * logAudit()/persist() so cross-route Next.js workers stay consistent.
 * Raw secrets are never persisted — only a masked preview; a live secret may be supplied
 * at runtime through the environment (KORIE_CONNECTOR_<CODE>_SECRET).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import {
  ConnectorCategorySpec,
  ConnectorRecord,
  ConnectorRole,
  AutomationAuditKind,
  AutomationAuditEntry,
  AutomationContext,
  AutomationDecisionResult,
  AutomationRule,
  SystemParameter,
  AdminConfigOverview,
} from '@/types/adminConfiguration';

const STORE_PATH =
  process.env.ADMIN_CONFIG_STORE_PATH || '/tmp/korie-admin-config.json';

export class AdminConfigurationEngineError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus = 400,
  ) {
    super(message);
    this.name = 'AdminConfigurationEngineError';
  }
}

/* ------------------------------------------------ catalog presets */

const CATEGORY_FIELDS: Record<string, { key: string; label: string; kind: 'text' | 'number' | 'select'; options?: string[]; placeholder?: string }[]> = {
  PAYMENT_GATEWAY: [
    { key: 'chargeEndpoint', label: 'Charge endpoint path', kind: 'text', placeholder: '/v1/charges' },
    { key: 'payoutEndpoint', label: 'Payout endpoint path', kind: 'text', placeholder: '/v1/payouts' },
    { key: 'webhookEvent', label: 'Webhook event prefix', kind: 'text', placeholder: 'charge.success' },
  ],
  SETTLEMENT_RAIL: [
    { key: 'clearingCode', label: 'Clearing code', kind: 'text', placeholder: 'NIP / BCEAO-SIT' },
    { key: 'settlementCycle', label: 'Settlement cycle', kind: 'select', options: ['T+0', 'T+1', 'T+2', 'T+7'] },
    { key: 'statementEndpoint', label: 'Statement endpoint path', kind: 'text', placeholder: '/v1/statements' },
  ],
  BANK_NODE: [
    { key: 'institutionCode', label: 'Institution / bank code', kind: 'text' },
    { key: 'accountPrefix', label: 'NUBAN / account prefix', kind: 'text' },
    { key: 'transferSupport', label: 'Transfer rails supported', kind: 'select', options: ['NIP', 'CFA-SIT', 'NIP + CFA-SIT', 'BOTH + CROSS_BORDER'] },
  ],
  BANK_LIQUIDITY_POOL: [
    { key: 'poolId', label: 'Pool identifier', kind: 'text' },
    { key: 'poolCap', label: 'Pool cap', kind: 'number', placeholder: '500000000' },
    { key: 'targetBalance', label: 'Target balance', kind: 'number', placeholder: '250000000' },
    { key: 'topUpTriggerPct', label: 'Top-up trigger (%)', kind: 'number', placeholder: '30' },
  ],
  WHATSAPP_AGENT: [
    { key: 'phoneNumberId', label: 'WhatsApp phone number id', kind: 'text' },
    { key: 'agentQueue', label: 'Agent queue name', kind: 'text', placeholder: 'support-tier-1' },
    { key: 'autoReplyTemplate', label: 'Auto-reply template key', kind: 'text', placeholder: 'welcome_ack' },
    { key: 'officeHours', label: 'Office hours', kind: 'text', placeholder: 'Mon–Sat 08:00–20:00 WAT' },
  ],
  KYC_SOURCE: [
    { key: 'products', label: 'Verification products', kind: 'text', placeholder: 'BVN, NIN, NIMC, DOCUMENT' },
    { key: 'syncMode', label: 'Verification mode', kind: 'select', options: ['SYNC', 'ASYNC_CALLBACK'] },
  ],
  FX_SOURCE: [
    { key: 'pairs', label: 'Currency pairs', kind: 'text', placeholder: 'NGN/XOF, XOF/NGN' },
    { key: 'refreshCadenceMin', label: 'Refresh cadence (minutes)', kind: 'number', placeholder: '5' },
  ],
  CIT_COURIER: [
    { key: 'tripEndpoint', label: 'Trip telemetry path', kind: 'text', placeholder: '/v1/trips' },
    { key: 'vehicleMapping', label: 'Vehicle id mapping', kind: 'text' },
  ],
  NOTIFICATION_PROVIDER: [
    { key: 'senderId', label: 'Sender id', kind: 'text' },
    { key: 'channel', label: 'Channel', kind: 'select', options: ['SMS', 'EMAIL', 'PUSH', 'ALL'] },
  ],
  AI_DECISION_SERVICE: [
    { key: 'modelId', label: 'Model identifier', kind: 'text' },
    { key: 'allowedDecisionClasses', label: 'Allowed decision classes', kind: 'text', placeholder: 'SCORE, KYC_FLAG, FRAUD' },
  ],
  CUSTOM_REST: [],
};

export const CONNECTOR_CATEGORY_SPECS: ConnectorCategorySpec[] = [
  { key: 'PAYMENT_GATEWAY', label: 'Payment gateway', description: 'Charging / disbursing fintech APIs used for live payment routing.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.PAYMENT_GATEWAY },
  { key: 'SETTLEMENT_RAIL', label: 'Settlement rail', description: 'Clearing & settlement APIs (NIP, BCEAO-SIT, partner banks).', healthPathDefault: '/health', fields: CATEGORY_FIELDS.SETTLEMENT_RAIL },
  { key: 'BANK_NODE', label: 'Bank node connection', description: 'Commercial-bank core API connection (Providus, Coris, other banks).', healthPathDefault: '/health', fields: CATEGORY_FIELDS.BANK_NODE },
  { key: 'BANK_LIQUIDITY_POOL', label: 'Bank liquidity pool', description: 'Funding / nostro pool configuration with caps and top-up triggers.', fields: CATEGORY_FIELDS.BANK_LIQUIDITY_POOL },
  { key: 'WHATSAPP_AGENT', label: 'WhatsApp support agent', description: 'WhatsApp Business API desks for support automation.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.WHATSAPP_AGENT },
  { key: 'KYC_SOURCE', label: 'KYC / verification source', description: 'Identity sources (NIMC, NIBSS BVN, bank KYC) feeding KYC review.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.KYC_SOURCE },
  { key: 'FX_SOURCE', label: 'FX rate source', description: 'Rate feed APIs powering the FX rates engine.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.FX_SOURCE },
  { key: 'CIT_COURIER', label: 'CIT / cash courier', description: 'Cash-in-transit telemetry and vault APIs.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.CIT_COURIER },
  { key: 'NOTIFICATION_PROVIDER', label: 'Notification provider', description: 'Email / SMS / push delivery APIs.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.NOTIFICATION_PROVIDER },
  { key: 'AI_DECISION_SERVICE', label: 'AI decision service', description: 'Model endpoints consumed by AI & decision intelligence.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.AI_DECISION_SERVICE },
  { key: 'CUSTOM_REST', label: 'Custom REST API', description: 'Any future category — declare an endpoint catalogue manually.', healthPathDefault: '/health', fields: CATEGORY_FIELDS.CUSTOM_REST },
];

export const AUTOMATION_ACTION_SPECS = [
  { key: 'maker_checker.approve', label: 'Maker–checker auto-approval', module: 'Global governance', description: 'Auto-approve privileged financial authorizations inside caps; larger or riskier ones still open the dual-control modal.', defaultMaxAmount: 250000, defaultCurrency: 'NGN', exampleScopes: ['country', 'amount', 'riskLevel', 'category'] },
  { key: 'kyc.approve_application', label: 'KYC / KYB auto-approval', module: 'KYC review', description: 'Auto-approve applications when the connected verification source confirms identity within risk policy.', exampleScopes: ['country', 'riskLevel'] },
  { key: 'settlement.batch_execute', label: 'Settlement batch auto-run', module: 'Settlements', description: 'Auto-create, auto-approve and auto-execute settlement batches on schedule (dry-run first supported).', defaultMaxAmount: 50000000, defaultCurrency: 'NGN', exampleScopes: ['country', 'amount'] },
  { key: 'support.auto_triage', label: 'Support auto-triage & assignment', module: 'Support tickets', description: 'Auto-acknowledge, classify, assign by queue load and route to a connected WhatsApp support agent; escalate on SLA breach.', exampleScopes: ['category'] },
  { key: 'cash.movement_approval', label: 'Cash movement approvals', module: 'Cash operations', description: 'Auto-approve till handovers / vault movements within till rules; the rest goes to maker–checker.', defaultMaxAmount: 1000000, defaultCurrency: 'NGN', exampleScopes: ['amount', 'country'] },
  { key: 'treasury.drawdown_approval', label: 'Treasury drawdown approvals', module: 'Treasury & liquidity', description: 'Auto-approve drawdowns within facility utilisation caps; raise liquidity alert otherwise.', defaultMaxAmount: 50000000, defaultCurrency: 'NGN', exampleScopes: ['amount'] },
  { key: 'reconciliation.auto_resolve', label: 'Reconciliation auto-resolve', module: 'Reconciliation', description: 'Auto-resolve deterministic matches (zero variance); genuine breaks still require human check.', exampleScopes: ['category'] },
  { key: 'security.jit_approval', label: 'JIT access approvals', module: 'Security', description: 'Auto-approve just-in-time privileged access within policy window; break-glass stays dual-control.', exampleScopes: ['riskLevel'] },
  { key: 'security.idle_session_revoke', label: 'Idle session auto-revoke', module: 'Security', description: 'Auto-revoke sessions idle beyond policy duration.', exampleScopes: [] },
  { key: 'systemhealth.dlq_replay', label: 'DLQ auto-replay', module: 'System health', description: 'Auto-replay idempotent dead-letter jobs up to N attempts with backoff.', exampleScopes: [] },
  { key: 'bankingnode.failover', label: 'Node failover automation', module: 'Banking nodes', description: 'Continuous heartbeat; auto-switch PRIMARY routing to a healthy failover node on degradation.', exampleScopes: ['country'] },
  { key: 'intelligence.decision_execute', label: 'AI decision auto-execute', module: 'AI & decision intel', description: 'Execute approved decision classes automatically within governance caps; kill-switch overrides.', exampleScopes: ['category', 'riskLevel'] },
  { key: 'reports.regulator_submission', label: 'Scheduled regulator submissions', module: 'Reports / compliance', description: 'Generate, approve and submit reports on the regulator calendar window.', exampleScopes: ['country'] },
  { key: 'adashi.rotation_disbursement', label: 'Adashi rotation & disbursement', module: 'Adashi / ROSCA', description: 'Schedule-driven rotation and disbursement events; maker–checker only above thresholds.', defaultMaxAmount: 10000000, defaultCurrency: 'NGN', exampleScopes: ['amount'] },
];

export const DEMO_PROVIDERS = [
  { code: 'PROV-NG-01', name: 'Providus Bank Nigeria Plc (built-in demo node)', country: 'NG' },
  { code: 'KORIS-NE-01', name: 'Coris Bank Niger SA (built-in demo node)', country: 'NE' },
];

export const DEFAULT_PARAMETERS: SystemParameter[] = [
  { key: 'ng.tier1DailyLimit', label: 'Tier 1 daily limit', group: 'NIGERIA', type: 'number', value: '50000', currency: 'NGN' },
  { key: 'ng.tier3DailyLimit', label: 'Tier 3 daily limit', group: 'NIGERIA', type: 'number', value: '5000000', currency: 'NGN' },
  { key: 'ng.nipSingleCap', label: 'Single NIP transfer cap', group: 'NIGERIA', type: 'number', value: '10000000', currency: 'NGN' },
  { key: 'ng.defaultBankingGateway', label: 'Default banking gateway', group: 'NIGERIA', type: 'text', value: 'Providus Bank Nigeria Plc', locked: true, lockedHint: 'Change by registering a BANK_NODE connector and setting it PRIMARY.' },
  { key: 'ne.tier1DailyLimit', label: 'Tier 1 daily limit', group: 'NIGER_REPUBLIC', type: 'number', value: '100000', currency: 'XOF' },
  { key: 'ne.tier3DailyLimit', label: 'Tier 3 daily limit', group: 'NIGER_REPUBLIC', type: 'number', value: '10000000', currency: 'XOF' },
  { key: 'ne.defaultBankingGateway', label: 'Default banking gateway', group: 'NIGER_REPUBLIC', type: 'text', value: 'Coris Bank SA (Niamey)', locked: true, lockedHint: 'Change by registering a BANK_NODE connector and setting it PRIMARY.' },
  { key: 'fee.payoutMdrBps', label: 'Payout MDR (basis points)', group: 'FEE_ENGINE', type: 'number', value: '75' },
  { key: 'fee.cashOutCapPct', label: 'Agency cash-out cap (of wallet)', group: 'FEE_ENGINE', type: 'number', value: '40' },
  { key: 'aml.ctrThreshold', label: 'CTR reporting threshold', group: 'REGULATORY_REPORTING', type: 'number', value: '5000000', currency: 'NGN' },
  { key: 'aml.strThreshold', label: 'STR reporting threshold', group: 'REGULATORY_REPORTING', type: 'number', value: '2000000', currency: 'NGN' },
  { key: 'reg.nipReportingCutoff', label: 'NIP transaction reporting cutoff', group: 'REGULATORY_REPORTING', type: 'text', value: 'T+1 06:00 WAT' },
];

export const EXAMPLE_RULES: AutomationRule[] = [
  {
    id: 'rule_example_01', actionKey: 'settlement.batch_execute', name: 'Example — auto-run settlement batches ≤ ₦50M (off)', enabled: false,
    dryRun: true, maxAmount: 50000000, currency: 'NGN', countries: ['NG', 'NE'], createdAt: '', updatedAt: '', createdByName: 'system',
  },
  {
    id: 'rule_example_02', actionKey: 'kyc.approve_application', name: 'Example — auto-approve KYC on verified source (off)', enabled: false,
    dryRun: true, countries: ['NG', 'NE'], riskLevels: ['LOW'], createdAt: '', updatedAt: '', createdByName: 'system',
  },
];

/* -------------------------------------------------- engine */

const mask = (secret: string) =>
  secret.length <= 12 ? `${secret.slice(0, 4)}…` : `${secret.slice(0, 8)}…${secret.slice(-4)}`;

export class AdminConfigurationEngine {
  private static instance: AdminConfigurationEngine;

  private connectors: ConnectorRecord[] = [];
  private rules: AutomationRule[] = [];
  private parameters: SystemParameter[] = DEFAULT_PARAMETERS.map(p => ({ ...p }));
  private audit: AutomationAuditEntry[] = [];
  private seq = 1000;

  private constructor() {
    // demo example rules are present but disabled — nothing auto-executes until the operator enables a rule
    this.rules = EXAMPLE_RULES.map(r => ({ ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  }

  public static getInstance(): AdminConfigurationEngine {
    if (!AdminConfigurationEngine.instance) AdminConfigurationEngine.instance = new AdminConfigurationEngine();
    AdminConfigurationEngine.instance.hydrate();
    return AdminConfigurationEngine.instance;
  }

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      if (data.connectors) this.connectors = data.connectors;
      if (data.rules) this.rules = data.rules;
      if (data.parameters) this.parameters = data.parameters;
      if (data.audit) this.audit = data.audit;
      if (data.seq) this.seq = data.seq;
    } catch {
      /* corrupt/missing store — keep in-memory defaults */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify({ connectors: this.connectors, rules: this.rules, parameters: this.parameters, audit: this.audit, seq: this.seq }),
      );
    } catch {
      /* non-fatal */
    }
  }

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36)}${Date.now().toString(36).slice(-4)}`;
  }

  private now() {
    return new Date().toISOString();
  }

  private logAudit(actor: string, kind: AutomationAuditKind, detail: string, extra: Partial<AutomationAuditEntry> = {}) {
    this.audit.unshift({
      id: this.nextId('aud'),
      at: this.now(),
      actor,
      kind,
      detail,
      ...extra,
    });
    if (this.audit.length > 400) this.audit.pop();
    this.persist();
  }

  private envSecretFor(connector: ConnectorRecord): string | null {
    const envKey = `KORIE_CONNECTOR_${connector.code.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}_SECRET`;
    const fromEnv = process.env[envKey];
    if (fromEnv) return fromEnv;
    return null;
  }

  /* ---------------------------------------------- connectors */

  public listConnectors(category?: string): ConnectorRecord[] {
    this.hydrate();
    let list = this.connectors;
    if (category) list = list.filter(c => c.category === category);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public getConnector(id: string): ConnectorRecord {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    return { ...c, secretMasked: c.secretMasked };
  }

  public getConnectorCategorySpecs() {
    return CONNECTOR_CATEGORY_SPECS;
  }

  public addConnector(input: {
    category: string; name: string; code?: string; vendor?: string; country?: string; currency?: string;
    environment?: string; baseUrl?: string; healthPath?: string; authType?: string; secret?: string;
    metadata?: Record<string, string>;
  }, actor: string): ConnectorRecord {
    this.hydrate();
    const spec = CONNECTOR_CATEGORY_SPECS.find(s => s.key === input.category);
    if (!spec) throw new AdminConfigurationEngineError('VALIDATION_ERROR', `Unknown connector category ${input.category}`);
    const name = (input.name || '').trim();
    if (name.length < 3) throw new AdminConfigurationEngineError('VALIDATION_ERROR', 'Connector name must be at least 3 characters');
    let code = (input.code || '').trim().toUpperCase().replace(/\s+/g, '-');
    if (!code) code = name.slice(0, 4).toUpperCase() + '-' + (input.country || 'XX').toUpperCase().slice(0, 2) + '-' + this.seq.toString(36).slice(-3).toUpperCase();
    if (this.connectors.some(c => c.code === code))
      throw new AdminConfigurationEngineError('DUPLICATE_REQUEST', `Connector code ${code} already exists`, 409);
    const now = this.now();
    const connector: ConnectorRecord = {
      id: this.nextId('con'),
      code,
      name,
      vendor: (input.vendor || '').trim() || 'Self-registered',
      category: input.category as ConnectorRecord['category'],
      country: (input.country || 'NG').toUpperCase(),
      currency: (input.currency || (input.category === 'SETTLEMENT_RAIL' || input.category === 'BANK_LIQUIDITY_POOL' ? 'XOF' : 'NGN')).toUpperCase(),
      environment: (input.environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX'),
      baseUrl: (input.baseUrl || '').trim().replace(/\/+$/, ''),
      healthPath: (input.healthPath || '').trim() || spec.healthPathDefault || undefined,
      authType: (input.authType as ConnectorRecord['authType']) || (input.secret ? 'BEARER' : 'NONE'),
      secretMasked: input.secret ? mask(input.secret) : '',
      hasSecretConfigured: Boolean(input.secret),
      capabilities: [],
      role: 'NONE',
      status: input.baseUrl ? 'CONFIGURED' : 'CONFIGURED',
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
      createdByName: actor,
    };
    this.connectors.unshift(connector);
    this.logAudit(actor, 'CONNECTOR_ADDED', `${spec.label} connector ${name} (${code}) registered`, { connectorId: connector.id, connectorName: name });
    return { ...connector };
  }

  public updateConnector(id: string, patch: Partial<ConnectorRecord> & { secret?: string }, actor: string): ConnectorRecord {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    const { secret, ...rest } = patch;
    Object.assign(c, rest);
    if (secret !== undefined) {
      if (secret === '') {
        c.hasSecretConfigured = false;
        c.secretMasked = '';
      } else {
        c.hasSecretConfigured = true;
        c.secretMasked = mask(secret);
      }
    }
    c.updatedAt = this.now();
    if (patch.status === 'PAUSED' || patch.status === 'CONFIGURED') c.status = patch.status;
    this.logAudit(actor, 'CONNECTOR_UPDATED', `Updated connector ${c.name} (${c.code})`, { connectorId: c.id, connectorName: c.name });
    return { ...c };
  }

  public removeConnector(id: string, actor: string): void {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    this.connectors = this.connectors.filter(x => x.id !== id);
    this.logAudit(actor, 'CONNECTOR_REMOVED', `Removed connector ${c.name} (${c.code})`, { connectorId: c.id, connectorName: c.name });
  }

  public setConnectorRole(id: string, role: ConnectorRole, actor: string): ConnectorRecord {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    if (role !== 'NONE' && role !== 'OBSERVE') {
      // one PRIMARY per category; one FAILOVER per category
      const sameCat = this.connectors.filter(x => x.id !== id && x.category === c.category);
      if (role === 'PRIMARY' && sameCat.some(x => x.role === 'PRIMARY'))
        throw new AdminConfigurationEngineError('CONFLICT', `A PRIMARY connector already exists for ${c.category}`, 409);
      if (role === 'FAILOVER' && sameCat.some(x => x.role === 'FAILOVER'))
        throw new AdminConfigurationEngineError('CONFLICT', `A FAILOVER connector already exists for ${c.category}`, 409);
    }
    c.role = role;
    if (role === 'PRIMARY' && c.status === 'FAILED')
      throw new AdminConfigurationEngineError('CONFLICT', 'A FAILED connector cannot be PRIMARY — probe it first', 409);
    c.updatedAt = this.now();
    this.logAudit(actor, 'CONNECTOR_UPDATED', `Connector ${c.name} (${c.code}) set as ${role}`, { connectorId: c.id, connectorName: c.name });
    return { ...c };
  }

  public async probeConnector(id: string, actor: string): Promise<ConnectorRecord> {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    if (c.status === 'PAUSED') throw new AdminConfigurationEngineError('FORBIDDEN', 'Paused connectors cannot be probed', 403);
    c.status = 'CONNECTING';
    this.persist();
    const url = c.healthPath ? `${c.baseUrl}${c.healthPath.startsWith('/') ? c.healthPath : '/' + c.healthPath}` : c.baseUrl;
    const started = Date.now();
    let result: ConnectorRecord['lastProbe'];
    if (!c.baseUrl) {
      result = { at: this.now(), ok: false, error: 'NO_BASE_URL — provide a base URL + health path to run a live probe' };
      c.status = 'CONFIGURED';
    } else {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const headers: Record<string, string> = { Accept: 'application/json' };
        const liveSecret = this.envSecretFor(c);
        if (liveSecret && c.authType === 'BEARER') headers.Authorization = `Bearer ${liveSecret}`;
        if (liveSecret && c.authType === 'API_KEY') headers['X-Api-Key'] = liveSecret;
        if (liveSecret && c.authType === 'BASIC') headers.Authorization = `Basic ${Buffer.from(liveSecret + ':').toString('base64')}`;
        const res = await fetch(url, { method: 'GET', headers, signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        const latencyMs = Date.now() - started;
        const ok = res.ok;
        result = { at: this.now(), ok, httpStatus: res.status, latencyMs, error: ok ? undefined : `HTTP ${res.status}` };
        c.status = ok ? 'CONNECTED' : 'FAILED';
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result = { at: this.now(), ok: false, error: msg.includes('abort') ? 'TIMEOUT after 6s' : msg.includes('fetch') ? 'NETWORK_UNREACHABLE' : msg };
        c.status = 'FAILED';
      }
    }
    c.lastProbe = result;
    c.updatedAt = this.now();
    this.logAudit(actor, 'CONNECTOR_PROBED', `Probe ${c.name} (${c.code}) → ${result.ok ? 'CONNECTED' : 'FAILED'} ${result.error ? '· ' + result.error : ''}${result.latencyMs ? ' · ' + result.latencyMs + 'ms' : ''}`, { connectorId: c.id, connectorName: c.name });
    return { ...c };
  }

  public async discoverCapabilities(id: string, actor: string): Promise<ConnectorRecord> {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    const discovered: ConnectorRecord['capabilities'] = [];
    let note = '';
    if (!c.baseUrl) {
      note = 'NO_BASE_URL — no spec document to discover; map capabilities manually';
    } else {
      const docCandidates = ['/openapi.json', '/swagger.json', '/api-docs', '/v1/openapi.json', '/openapi/v3.json'];
      let fetched = false;
      for (const suffix of docCandidates) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${c.baseUrl}${suffix}`, { method: 'GET', signal: controller.signal, cache: 'no-store' });
          clearTimeout(timer);
          if (!res.ok) continue;
          const doc = await res.json();
          fetched = true;
          const paths = doc?.paths && typeof doc.paths === 'object' ? doc.paths : null;
          if (!paths) { note = `SPEC_FOUND at ${suffix} but no paths map`; break; }
          const capByKey: Record<string, ConnectorRecord['capabilities'][0]> = {};
          for (const [p, ops] of Object.entries<any>(paths)) {
            for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
              const op = ops?.[method.toLowerCase()];
              if (!op) continue;
              const key = `${method}_${p.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 60);
              const summary = op.summary || op.operationId || `${method} ${p}`;
              if (!capByKey[key])
                capByKey[key] = { key, label: String(summary).slice(0, 80), method: method as any, path: p, discovered: true };
            }
          }
          discovered.push(...Object.values(capByKey).slice(0, 40));
          note = `Discovered ${discovered.length} operations from ${suffix}`;
          break;
        } catch {
          continue;
        }
      }
      if (!fetched && !note) note = 'No OpenAPI/Swagger doc reachable — map capabilities manually';
    }
    // merge, keep manual entries that exist already
    const manual = c.capabilities.filter(x => !x.discovered);
    const seen = new Set(manual.map(x => x.key));
    for (const d of discovered) if (!seen.has(d.key)) { seen.add(d.key); manual.push(d); }
    c.capabilities = manual.slice(0, 60);
    c.updatedAt = this.now();
    this.logAudit(actor, 'CONNECTOR_CAPABILITIES', `Capabilities for ${c.name}: ${discovered.length ? note : note + ' — 0 discovered'}`, { connectorId: c.id, connectorName: c.name });
    return { ...c };
  }

  public addConnectorCapability(id: string, cap: { key: string; label?: string; method?: string; path: string }, actor: string): ConnectorRecord {
    this.hydrate();
    const c = this.connectors.find(x => x.id === id);
    if (!c) throw new AdminConfigurationEngineError('NOT_FOUND', 'Connector not found', 404);
    const method = (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).includes(cap.method as any) ? cap.method as any : 'POST';
    const key = cap.key || `${method}_${cap.path.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 60);
    if (!c.capabilities.some(x => x.key === key)) {
      c.capabilities.push({ key, label: cap.label || `${method} ${cap.path}`, method, path: cap.path, discovered: false });
      c.updatedAt = this.now();
      this.logAudit(actor, 'CONNECTOR_CAPABILITIES', `Manual capability ${key} mapped on ${c.name}`, { connectorId: c.id, connectorName: c.name });
    }
    return { ...c };
  }

  /* ---------------------------------------------- automation rules */

  public listRules(): AutomationRule[] {
    this.hydrate();
    return [...this.rules].sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  }

  public getAutomationActionSpecs() {
    return AUTOMATION_ACTION_SPECS;
  }

  public addRule(input: { actionKey: string; name: string; enabled?: boolean; dryRun?: boolean; maxAmount?: number; currency?: string; countries?: string[]; riskLevels?: string[]; category?: string }, actor: string): AutomationRule {
    this.hydrate();
    const spec = AUTOMATION_ACTION_SPECS.find(a => a.key === input.actionKey);
    if (!spec) throw new AdminConfigurationEngineError('VALIDATION_ERROR', `Unknown automation action ${input.actionKey}`);
    const name = (input.name || '').trim();
    if (name.length < 3) throw new AdminConfigurationEngineError('VALIDATION_ERROR', 'Rule name must be at least 3 characters');
    const now = this.now();
    const rule: AutomationRule = {
      id: this.nextId('rule'),
      actionKey: input.actionKey,
      name,
      enabled: input.enabled !== false,
      dryRun: input.dryRun === true,
      maxAmount: input.maxAmount !== undefined && input.maxAmount > 0 ? input.maxAmount : undefined,
      currency: input.currency || spec.defaultCurrency,
      countries: input.countries?.length ? input.countries : undefined,
      riskLevels: input.riskLevels?.length ? input.riskLevels : undefined,
      category: input.category as any || undefined,
      createdAt: now,
      updatedAt: now,
      createdByName: actor,
    };
    this.rules.unshift(rule);
    this.logAudit(actor, 'RULE_CREATED', `Automation rule "${name}" for ${spec.label} (${rule.dryRun ? 'dry-run' : rule.enabled ? 'live' : 'disabled'})`, { ruleId: rule.id, ruleName: name, actionKey: input.actionKey });
    return { ...rule };
  }

  public updateRule(id: string, patch: Partial<AutomationRule>, actor: string): AutomationRule {
    this.hydrate();
    const r = this.rules.find(x => x.id === id);
    if (!r) throw new AdminConfigurationEngineError('NOT_FOUND', 'Automation rule not found', 404);
    Object.assign(r, patch);
    r.updatedAt = this.now();
    this.logAudit(actor, 'RULE_UPDATED', `Automation rule "${r.name}" updated (${r.enabled ? (r.dryRun ? 'dry-run' : 'live') : 'disabled'})`, { ruleId: r.id, ruleName: r.name, actionKey: r.actionKey });
    return { ...r };
  }

  public removeRule(id: string, actor: string): void {
    this.hydrate();
    const r = this.rules.find(x => x.id === id);
    if (!r) throw new AdminConfigurationEngineError('NOT_FOUND', 'Automation rule not found', 404);
    this.rules = this.rules.filter(x => x.id !== id);
    this.logAudit(actor, 'RULE_REMOVED', `Removed automation rule "${r.name}"`, { ruleId: r.id, ruleName: r.name, actionKey: r.actionKey });
  }

  /** Decision service: consulted before any privileged/actionable flow.
   *  AUTO_EXECUTE only when an ENABLED live (non-dry-run) rule matches; dry-run rules
   *  audit a would-be execution and return REQUIRE_REVIEW so behaviour stays honest. */
  public decide(actionKey: string, ctx: AutomationContext = {}, actor: string): AutomationDecisionResult {
    this.hydrate();
    const matching = this.rules.filter(r => r.actionKey === actionKey && r.enabled);
    if (matching.length === 0) {
      return { decision: 'REQUIRE_REVIEW', reason: 'No enabled automation rule for this action — manual review required.' };
    }
    for (const rule of matching) {
      if (rule.maxAmount !== undefined && (ctx.amount === undefined || ctx.amount > rule.maxAmount)) continue;
      if (rule.currency && rule.currency !== 'ANY' && ctx.currency && ctx.currency !== rule.currency && rule.maxAmount !== undefined) continue;
      if (rule.countries?.length && ctx.country && !rule.countries.includes(ctx.country)) continue;
      if (rule.riskLevels?.length && ctx.riskLevel && !rule.riskLevels.includes(ctx.riskLevel)) continue;
      if (rule.category && ctx.category && ctx.category !== rule.category) continue;
      if (rule.dryRun) {
        this.logAudit(actor, 'AUTO_EXECUTED', `DRY-RUN would auto-approve ${actionKey} under "${rule.name}" — review still required`, { actionKey, ruleId: rule.id, ruleName: rule.name });
        return { decision: 'REQUIRE_REVIEW', reason: `Dry-run rule "${rule.name}" matched (no live execution). Manual review required.`, ruleId: rule.id, ruleName: rule.name, dryRun: true };
      }
      const decisionId = this.nextId('dec');
      this.logAudit(actor, 'AUTO_EXECUTED', `Auto-approved ${actionKey} via rule "${rule.name}"`, { actionKey, ruleId: rule.id, ruleName: rule.name, decisionId });
      return { decision: 'AUTO_EXECUTE', reason: `Matched rule "${rule.name}" — within automation policy.`, ruleId: rule.id, ruleName: rule.name, decisionId };
    }
    return { decision: 'REQUIRE_REVIEW', reason: 'Action exceeds the scope of matching automation rules — manual review required.' };
  }

  public completeDecision(decisionId: string, outcome: 'SUCCESS' | 'FAILED', actor: string): void {
    this.hydrate();
    const entry = this.audit.find(a => a.decisionId === decisionId);
    if (!entry) throw new AdminConfigurationEngineError('NOT_FOUND', 'Decision not found', 404);
    entry.outcome = outcome;
    entry.detail = `${entry.detail} → ${outcome}`;
    entry.at = this.now();
    this.logAudit(actor, outcome === 'SUCCESS' ? 'AUTO_EXECUTED' : 'AUTO_EXECUTE_FAILED', `Automation ${decisionId} finished ${outcome}`, { actionKey: entry.actionKey, ruleId: entry.ruleId, ruleName: entry.ruleName, decisionId });
  }

  /* ---------------------------------------------- parameters + audit */

  public getParameters(): SystemParameter[] {
    this.hydrate();
    return this.parameters.map(p => ({ ...p }));
  }

  public updateParameters(values: Record<string, string>, actor: string): SystemParameter[] {
    this.hydrate();
    for (const [key, raw] of Object.entries(values)) {
      const p = this.parameters.find(x => x.key === key);
      if (!p) throw new AdminConfigurationEngineError('VALIDATION_ERROR', `Unknown parameter ${key}`);
      if (p.locked) throw new AdminConfigurationEngineError('FORBIDDEN', `Parameter ${p.label} is locked — ${p.lockedHint || 'managed by the connector registry'}`, 403);
      const value = (raw || '').trim();
      if (p.type === 'number') {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new AdminConfigurationEngineError('VALIDATION_ERROR', `${p.label} must be a positive number`);
      }
      p.value = value;
    }
    this.logAudit(actor, 'PARAMETERS_UPDATED', `Updated ${Object.keys(values).length} system parameter(s)`);
    return this.parameters.map(p => ({ ...p }));
  }

  public listAudit(kind?: string, limit = 50): AutomationAuditEntry[] {
    this.hydrate();
    let list = this.audit;
    if (kind && kind !== 'ALL') list = list.filter(a => a.kind === kind);
    return list.slice(0, limit);
  }

  public getGateway() {
    return ApiGatewayEngine.getInstance();
  }

  public getOverview(): AdminConfigOverview {
    this.hydrate();
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    for (const c of this.connectors) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byRole[c.role] = (byRole[c.role] || 0) + 1;
    }
    return {
      connectors: { total: this.connectors.length, byStatus, byCategory, byRole },
      automationRules: {
        total: this.rules.length,
        enabled: this.rules.filter(r => r.enabled && !r.dryRun).length,
        dryRun: this.rules.filter(r => r.dryRun).length,
      },
      recentAudit: this.audit.slice(0, 12),
      demoProviders: DEMO_PROVIDERS,
    };
  }
}
