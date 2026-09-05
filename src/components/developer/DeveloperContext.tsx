"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DeveloperEnvironment,
  DeveloperRole,
  DeveloperOrganization,
  DeveloperMember,
  DeveloperApplication,
  ApiCredential,
  ApiProduct,
  ApiEndpoint,
  WebhookEndpoint,
  WebhookDeliveryLog,
  WebhookEventDef,
  ApiRequestLog,
  ErrorAnalyticsSummary,
  RateLimitQuota,
  SystemStatusNode,
  PlatformIncident,
  SdkPackage,
  IntegrationChecklistItem,
  ProductionAccessRequest,
  DeveloperSupportCase,
  DeveloperAuditLog,
} from '@/types/developer';
import {
  initialOrganization,
  initialMembers,
  initialApplications,
  initialCredentials,
  apiProducts,
  initialWebhooks,
  initialWebhookLogs,
  webhookEventCatalog,
  initialRequestLogs,
  initialErrorAnalytics,
  initialRateLimits,
  initialStatusNodes,
  initialIncidents,
  initialSdks,
  initialIntegrationChecklist,
  initialProductionRequest,
  initialSupportCases,
  initialDeveloperAuditLogs,
} from '@/services/developerDataService';
import { DeveloperLocale, getDeveloperTranslation } from '@/locales/developer';

interface DeveloperContextType {
  environment: DeveloperEnvironment;
  setEnvironment: (env: DeveloperEnvironment) => void;
  locale: DeveloperLocale;
  setLocale: (locale: DeveloperLocale) => void;
  t: ReturnType<typeof getDeveloperTranslation>;
  organization: DeveloperOrganization;
  members: DeveloperMember[];
  activeMember: DeveloperMember;
  setActiveMember: (m: DeveloperMember) => void;
  applications: DeveloperApplication[];
  activeApplication: DeveloperApplication;
  setActiveApplicationId: (id: string) => void;
  credentials: ApiCredential[];
  apiProductsList: ApiProduct[];
  webhooks: WebhookEndpoint[];
  webhookLogs: WebhookDeliveryLog[];
  eventCatalog: WebhookEventDef[];
  requestLogs: ApiRequestLog[];
  errorAnalytics: ErrorAnalyticsSummary[];
  rateLimits: RateLimitQuota[];
  statusNodes: SystemStatusNode[];
  incidents: PlatformIncident[];
  sdks: SdkPackage[];
  integrationChecklist: IntegrationChecklistItem[];
  productionRequest: ProductionAccessRequest | null;
  supportCases: DeveloperSupportCase[];
  auditLogs: DeveloperAuditLog[];
  
  // Actions
  createApplication: (name: string, description: string, apis: any[], ipWhitelist: string[]) => DeveloperApplication;
  createCredential: (appId: string, name: string, scopes: string[]) => { credential: ApiCredential; rawSecret: string };
  rotateCredential: (credId: string) => { newCredential: ApiCredential; rawSecret: string };
  revokeCredential: (credId: string) => void;
  createWebhook: (appId: string, url: string, events: string[]) => WebhookEndpoint;
  deleteWebhook: (whkId: string) => void;
  rotateWebhookSecret: (whkId: string) => string;
  sendTestWebhook: (webhookId: string, event: string) => Promise<WebhookDeliveryLog>;
  replayWebhookEvent: (logId: string) => Promise<WebhookDeliveryLog>;
  simulateApiCall: (path: string, method: string, body?: any, headers?: any) => Promise<{ status: number; latency: number; body: any; headers: any }>;
  submitProductionRequest: (settlementBank: string, settlementNuban: string) => ProductionAccessRequest;
  createSupportTicket: (data: { subject: string; category: any; priority: any; description: string; endpoint?: string; requestId?: string; errorCode?: string }) => DeveloperSupportCase;
  inviteTeamMember: (name: string, email: string, role: DeveloperRole) => DeveloperMember;
  removeTeamMember: (memberId: string) => void;
  updateIpWhitelist: (appId: string, ips: string[]) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

const DeveloperContext = createContext<DeveloperContextType | undefined>(undefined);

export const DeveloperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [environment, setEnvironmentState] = useState<DeveloperEnvironment>('SANDBOX');
  const [locale, setLocale] = useState<DeveloperLocale>('en');
  const [organization, setOrganization] = useState<DeveloperOrganization>(initialOrganization);
  const [members, setMembers] = useState<DeveloperMember[]>(initialMembers);
  const [activeMember, setActiveMember] = useState<DeveloperMember>(initialMembers[0]);
  const [applications, setApplications] = useState<DeveloperApplication[]>(initialApplications);
  const [activeApplicationId, setActiveApplicationIdState] = useState<string>(initialApplications[0].id);
  const [credentials, setCredentials] = useState<ApiCredential[]>(initialCredentials);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(initialWebhooks);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>(initialWebhookLogs);
  const [requestLogs, setRequestLogs] = useState<ApiRequestLog[]>(initialRequestLogs);
  const [errorAnalytics, setErrorAnalytics] = useState<ErrorAnalyticsSummary[]>(initialErrorAnalytics);
  const [rateLimits, setRateLimits] = useState<RateLimitQuota[]>(initialRateLimits);
  const [statusNodes, setStatusNodes] = useState<SystemStatusNode[]>(initialStatusNodes);
  const [incidents, setIncidents] = useState<PlatformIncident[]>(initialIncidents);
  const [integrationChecklist, setIntegrationChecklist] = useState<IntegrationChecklistItem[]>(initialIntegrationChecklist);
  const [productionRequest, setProductionRequest] = useState<ProductionAccessRequest | null>(initialProductionRequest);
  const [supportCases, setSupportCases] = useState<DeveloperSupportCase[]>(initialSupportCases);
  const [auditLogs, setAuditLogs] = useState<DeveloperAuditLog[]>(initialDeveloperAuditLogs);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const t = getDeveloperTranslation(locale);

  // Derive active application
  const activeApplication = applications.find(a => a.id === activeApplicationId) || applications[0];

  const setEnvironment = (env: DeveloperEnvironment) => {
    setEnvironmentState(env);
    // Find matching application for selected environment if available
    const matchingApp = applications.find(a => a.environment === env);
    if (matchingApp) {
      setActiveApplicationIdState(matchingApp.id);
    }
  };

  const setActiveApplicationId = (id: string) => {
    const app = applications.find(a => a.id === id);
    if (app) {
      setActiveApplicationIdState(id);
      setEnvironmentState(app.environment);
    }
  };

  const logAudit = (action: string, resourceType: DeveloperAuditLog['resourceType'], resourceId: string, details: string) => {
    const newLog: DeveloperAuditLog = {
      id: `daudit_${Date.now()}`,
      actorEmail: activeMember.email,
      actorRole: activeMember.role,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: '197.210.84.12',
      timestamp: new Date().toISOString(),
      environment,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const createApplication = (name: string, description: string, apis: any[], ipWhitelist: string[]): DeveloperApplication => {
    const newApp: DeveloperApplication = {
      id: `app_${environment.toLowerCase()}_${Math.floor(10000 + Math.random() * 90000)}`,
      orgId: organization.id,
      name,
      description,
      environment,
      status: 'ACTIVE',
      enabledApis: apis,
      scopes: ['payments:read', 'payments:write', 'wallets:read'],
      ipWhitelist,
      rateLimitPerMinute: environment === 'PRODUCTION' ? 2400 : 600,
      monthlyRequestQuota: environment === 'PRODUCTION' ? 10000000 : 2500000,
      createdAt: new Date().toISOString(),
      lastUsedAt: 'Just now',
    };
    setApplications(prev => [newApp, ...prev]);
    setActiveApplicationIdState(newApp.id);
    logAudit('APPLICATION_CREATED', 'APPLICATION', newApp.id, `Created ${environment} application: ${name}`);
    return newApp;
  };

  const createCredential = (appId: string, name: string, scopes: string[]) => {
    const rawSecret = environment === 'PRODUCTION' 
      ? `kp_live_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      : `kp_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    const publicKey = environment === 'PRODUCTION'
      ? `pk_live_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      : `pk_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newCred: ApiCredential = {
      id: `cred_${environment.toLowerCase().slice(0, 4)}_${Math.floor(1000 + Math.random() * 9000)}`,
      appId,
      orgId: organization.id,
      name,
      type: 'SECRET_KEY',
      environment,
      publicKey,
      secretKeyMasked: `${rawSecret.slice(0, 8)}••••••••••••••••••••••••${rawSecret.slice(-6)}`,
      secretKeyRaw: rawSecret,
      scopes,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastUsedAt: 'Never',
      createdByName: activeMember.name,
    };

    setCredentials(prev => [newCred, ...prev]);
    logAudit('CREDENTIAL_CREATED', 'CREDENTIAL', newCred.id, `Generated ${environment} key: ${name}`);
    return { credential: newCred, rawSecret };
  };

  const rotateCredential = (credId: string) => {
    const oldCred = credentials.find(c => c.id === credId);
    if (!oldCred) throw new Error('Credential not found');

    const rawSecret = oldCred.environment === 'PRODUCTION'
      ? `kp_live_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      : `kp_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const publicKey = oldCred.environment === 'PRODUCTION'
      ? `pk_live_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      : `pk_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const updatedOldCred: ApiCredential = {
      ...oldCred,
      status: 'ROTATING',
      gracePeriodExpiresAt: gracePeriodEnd,
    };

    const newCred: ApiCredential = {
      id: `cred_${oldCred.environment.toLowerCase().slice(0, 4)}_${Math.floor(1000 + Math.random() * 9000)}`,
      appId: oldCred.appId,
      orgId: oldCred.orgId,
      name: `${oldCred.name} (Rotated Active)`,
      type: oldCred.type,
      environment: oldCred.environment,
      publicKey,
      secretKeyMasked: `${rawSecret.slice(0, 8)}••••••••••••••••••••••••${rawSecret.slice(-6)}`,
      secretKeyRaw: rawSecret,
      scopes: oldCred.scopes,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastUsedAt: 'Just created',
      createdByName: activeMember.name,
    };

    setCredentials(prev => [newCred, ...prev.map(c => c.id === credId ? updatedOldCred : c)]);
    logAudit('CREDENTIAL_ROTATED', 'CREDENTIAL', credId, `Initiated 7-day zero-downtime rotation for ${oldCred.name}`);
    return { newCredential: newCred, rawSecret };
  };

  const revokeCredential = (credId: string) => {
    setCredentials(prev => prev.map(c => c.id === credId ? { ...c, status: 'REVOKED' } : c));
    logAudit('CREDENTIAL_REVOKED', 'CREDENTIAL', credId, `Revoked API key ${credId}`);
  };

  const createWebhook = (appId: string, url: string, events: string[]): WebhookEndpoint => {
    const rawSecret = `whsec_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const newWhk: WebhookEndpoint = {
      id: `whk_${environment.toLowerCase().slice(0, 4)}_${Math.floor(1000 + Math.random() * 9000)}`,
      appId,
      orgId: organization.id,
      url,
      environment,
      status: 'ACTIVE',
      events,
      signingSecretMasked: `${rawSecret.slice(0, 6)}••••••••••••••••••••••••${rawSecret.slice(-4)}`,
      signingSecretRaw: rawSecret,
      failureCount: 0,
      lastDeliveryStatus: 'PENDING',
      lastDeliveredAt: 'Never',
      createdAt: new Date().toISOString(),
      retryPolicy: 'STANDARD_EXPONENTIAL',
    };
    setWebhooks(prev => [newWhk, ...prev]);
    logAudit('WEBHOOK_CREATED', 'WEBHOOK', newWhk.id, `Subscribed webhook endpoint: ${url}`);
    return newWhk;
  };

  const deleteWebhook = (whkId: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== whkId));
    logAudit('WEBHOOK_DELETED', 'WEBHOOK', whkId, `Removed webhook ${whkId}`);
  };

  const rotateWebhookSecret = (whkId: string): string => {
    const rawSecret = `whsec_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setWebhooks(prev => prev.map(w => w.id === whkId ? {
      ...w,
      signingSecretMasked: `${rawSecret.slice(0, 6)}••••••••••••••••••••••••${rawSecret.slice(-4)}`,
      signingSecretRaw: rawSecret,
    } : w));
    logAudit('WEBHOOK_SECRET_ROTATED', 'WEBHOOK', whkId, `Rotated HMAC signing secret for webhook ${whkId}`);
    return rawSecret;
  };

  const sendTestWebhook = async (webhookId: string, event: string): Promise<WebhookDeliveryLog> => {
    const whk = webhooks.find(w => w.id === webhookId);
    const eventDef = webhookEventCatalog.find(e => e.event === event) || webhookEventCatalog[0];
    
    // Simulate real network latency (100ms - 250ms)
    await new Promise(r => setTimeout(r, 180));

    const newLog: WebhookDeliveryLog = {
      id: `wlog_${Date.now()}`,
      webhookId,
      event,
      endpointUrl: whk?.url || 'https://webhook.saheltech.io/sandbox/koriepay-events',
      environment,
      attemptNumber: 1,
      maxAttempts: 5,
      httpStatus: 200,
      latencyMs: 135,
      status: 'DELIVERED',
      idempotencyKey: `idem_evt_${Math.floor(100000 + Math.random() * 900000)}`,
      signatureHeader: `t=${Math.floor(Date.now() / 1000)},v1=${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      payload: eventDef.samplePayload,
      responseBody: JSON.stringify({ status: 'ok', received_at: new Date().toISOString() }),
      timestamp: new Date().toISOString(),
    };

    setWebhookLogs(prev => [newLog, ...prev]);
    setWebhooks(prev => prev.map(w => w.id === webhookId ? { ...w, lastDeliveredAt: 'Just now', lastDeliveryStatus: 'DELIVERED' } : w));
    logAudit('WEBHOOK_TEST_DISPATCHED', 'WEBHOOK', webhookId, `Dispatched manual test ping for event ${event}`);
    return newLog;
  };

  const replayWebhookEvent = async (logId: string): Promise<WebhookDeliveryLog> => {
    const existingLog = webhookLogs.find(l => l.id === logId);
    if (!existingLog) throw new Error('Log not found');

    await new Promise(r => setTimeout(r, 200));

    const replayedLog: WebhookDeliveryLog = {
      ...existingLog,
      id: `wlog_${Date.now()}`,
      attemptNumber: existingLog.attemptNumber + 1,
      status: 'REPLAYED',
      timestamp: new Date().toISOString(),
    };

    setWebhookLogs(prev => [replayedLog, ...prev]);
    logAudit('WEBHOOK_REPLAYED', 'WEBHOOK', existingLog.webhookId, `Replayed event ${existingLog.event} (log ${logId})`);
    return replayedLog;
  };

  const simulateApiCall = async (path: string, method: string, body?: any, headers?: any) => {
    const latency = Math.floor(35 + Math.random() * 90);
    await new Promise(r => setTimeout(r, latency));

    let statusCode = 200;
    let responseBody: any = {
      status: 'success',
      timestamp: new Date().toISOString(),
      request_id: `KP-REQ-${Math.floor(100000 + Math.random() * 900000).toString(16)}`,
    };

    if (path.includes('/transfers/cross-border')) {
      if (body?.amount && body.amount < 100) {
        statusCode = 422;
        responseBody = {
          status: 'error',
          code: 'INVALID_AMOUNT',
          message: 'Amount must be an integer >= 100 minor currency units.',
        };
      } else {
        responseBody = {
          status: 'success',
          code: 'TRANSFER_COMMITTED',
          data: {
            transfer_reference: `KP-XB-${Date.now()}`,
            merchant_reference: body?.reference || 'TRX-SAMPLE-001',
            source: { currency: body?.source_currency || 'NGN', amount: body?.amount || 5000000, bank_node: 'Providus Bank Nigeria' },
            destination: { currency: body?.destination_currency || 'XOF', amount: Math.floor((body?.amount || 5000000) * 0.43), bank_node: 'Coris Bank Niger Republic' },
            exchange_rate: 0.43,
            settlement_status: 'COMPLETED',
          },
        };
      }
    } else if (path.includes('/merchant/checkout')) {
      statusCode = 201;
      responseBody = {
        status: 'success',
        data: {
          reference: body?.reference || `ORD-${Date.now()}`,
          checkout_url: `https://pay.koriepay.com/checkout/${body?.reference || 'ORD-99042'}`,
          virtual_account: {
            bank_name: 'Providus Bank',
            account_number: '9928193820',
            account_name: 'KORIE / SAHEL STORE',
          },
        },
      };
    } else if (path.includes('/fx/corridor-rates')) {
      responseBody = {
        status: 'success',
        data: {
          corridor: 'NGN_XOF',
          ngn_to_xof: { rate: 0.43, inverse: 2.325, spread_bps: 18, market_status: 'OPEN' },
          xof_to_ngn: { rate: 2.31, inverse: 0.432, spread_bps: 18, market_status: 'OPEN' },
        },
      };
    } else if (path.includes('/wallets') && method === 'GET') {
      responseBody = {
        status: 'success',
        data: {
          wallet_id: 'wal_ngn_99182',
          currency: 'NGN',
          available_balance: 84500000,
          ledger_balance: 85000000,
          formatted_available: '₦845,000.00',
        },
      };
    }

    // Append to live request logs
    const newReqLog: ApiRequestLog = {
      id: `req_log_${Date.now()}`,
      requestId: `KP-REQ-${Math.floor(100000 + Math.random() * 900000).toString(16)}`,
      correlationId: `corr_${Math.floor(100000 + Math.random() * 900000)}`,
      appId: activeApplication.id,
      appName: activeApplication.name,
      environment,
      method: method as any,
      endpoint: path,
      statusCode,
      latencyMs: latency,
      ipAddress: '197.210.84.12',
      country: 'NG',
      timestamp: new Date().toISOString(),
      requestHeadersMasked: {
        'Authorization': 'Bearer kp_test_••••••••••••••••••••••••3829fa01',
        'Content-Type': 'application/json',
      },
      requestBodyMasked: body,
      responseBodyMasked: responseBody,
    };
    setRequestLogs(prev => [newReqLog, ...prev.slice(0, 49)]);

    return {
      status: statusCode,
      latency,
      body: responseBody,
      headers: {
        'content-type': 'application/json',
        'x-request-id': newReqLog.requestId,
        'x-ratelimit-remaining': '598',
        'x-koriepay-node': 'Providus-NIP-Gateway-01',
      },
    };
  };

  const submitProductionRequest = (settlementBank: string, settlementNuban: string): ProductionAccessRequest => {
    const newReq: ProductionAccessRequest = {
      id: `prod_req_${Date.now()}`,
      orgId: organization.id,
      orgName: organization.name,
      applicantEmail: activeMember.email,
      requestedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      readinessScore: 100,
      complianceKybStatus: 'VERIFIED',
      settlementAccountVerified: true,
      settlementBank,
      settlementNuban,
      checklistResults: {
        authentication: true,
        sandboxSuccess: true,
        webhookSignatureTested: true,
        idempotencyEnforced: true,
        errorHandlingVerified: true,
        ipWhitelistConfigured: true,
      },
    };
    setProductionRequest(newReq);
    logAudit('PRODUCTION_ACCESS_REQUESTED', 'PRODUCTION_ACCESS', newReq.id, `Submitted live production access application with settlement bank ${settlementBank}`);
    return newReq;
  };

  const createSupportTicket = (data: { subject: string; category: any; priority: any; description: string; endpoint?: string; requestId?: string; errorCode?: string }): DeveloperSupportCase => {
    const newCase: DeveloperSupportCase = {
      id: `case_dev_${Date.now()}`,
      ticketNumber: `DEV-CASE-${Math.floor(10000 + Math.random() * 90000)}`,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: 'OPEN',
      applicationId: activeApplication.id,
      environment,
      endpoint: data.endpoint,
      requestId: data.requestId,
      errorCode: data.errorCode,
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messagesCount: 1,
    };
    setSupportCases(prev => [newCase, ...prev]);
    logAudit('SUPPORT_TICKET_OPENED', 'TEAM', newCase.id, `Opened developer support case #${newCase.ticketNumber}`);
    return newCase;
  };

  const inviteTeamMember = (name: string, email: string, role: DeveloperRole): DeveloperMember => {
    const newMember: DeveloperMember = {
      id: `usr_dev_${Date.now()}`,
      orgId: organization.id,
      name,
      email,
      role,
      status: 'INVITED',
      mfaEnabled: false,
      lastLogin: 'Never',
    };
    setMembers(prev => [...prev, newMember]);
    logAudit('TEAM_MEMBER_INVITED', 'TEAM', newMember.id, `Invited ${email} with role ${role}`);
    return newMember;
  };

  const removeTeamMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    logAudit('TEAM_MEMBER_REMOVED', 'TEAM', memberId, `Removed team member ${memberId}`);
  };

  const updateIpWhitelist = (appId: string, ips: string[]) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, ipWhitelist: ips } : a));
    logAudit('IP_WHITELIST_MODIFIED', 'APPLICATION', appId, `Updated IP whitelist to: ${ips.join(', ')}`);
  };

  return (
    <DeveloperContext.Provider
      value={{
        environment,
        setEnvironment,
        locale,
        setLocale,
        t,
        organization,
        members,
        activeMember,
        setActiveMember,
        applications,
        activeApplication,
        setActiveApplicationId,
        credentials,
        apiProductsList: apiProducts,
        webhooks,
        webhookLogs,
        eventCatalog: webhookEventCatalog,
        requestLogs,
        errorAnalytics,
        rateLimits,
        statusNodes,
        incidents,
        sdks: initialSdks,
        integrationChecklist,
        productionRequest,
        supportCases,
        auditLogs,
        createApplication,
        createCredential,
        rotateCredential,
        revokeCredential,
        createWebhook,
        deleteWebhook,
        rotateWebhookSecret,
        sendTestWebhook,
        replayWebhookEvent,
        simulateApiCall,
        submitProductionRequest,
        createSupportTicket,
        inviteTeamMember,
        removeTeamMember,
        updateIpWhitelist,
        isSearchOpen,
        setIsSearchOpen,
      }}
    >
      {children}
    </DeveloperContext.Provider>
  );
};

export const useDeveloper = () => {
  const context = useContext(DeveloperContext);
  if (!context) {
    throw new Error('useDeveloper must be used within a DeveloperProvider');
  }
  return context;
};
