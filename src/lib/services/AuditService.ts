import { DbAuditEvent } from '@/types/database';
import { sanitizePayloadForLogging } from '@/lib/security/dataMinimization';

const auditEventsStore: DbAuditEvent[] = [];

export class AuditService {
  /**
   * Appends an immutable audit event.
   */
  static async log(params: {
    orgId?: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details: string;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    ipAddress: string;
    requestId: string;
    correlationId: string;
  }): Promise<DbAuditEvent> {
    const auditRecord: DbAuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      org_id: params.orgId || 'org_kor_99182',
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      actor_role: params.actorRole,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      details: params.details,
      before_state: params.beforeState ? sanitizePayloadForLogging(params.beforeState) : undefined,
      after_state: params.afterState ? sanitizePayloadForLogging(params.afterState) : undefined,
      ip_address: params.ipAddress,
      request_id: params.requestId,
      correlation_id: params.correlationId,
      created_at: new Date().toISOString(),
    };

    auditEventsStore.unshift(auditRecord);
    return auditRecord;
  }

  static async getRecentLogs(limit: number = 50): Promise<DbAuditEvent[]> {
    return auditEventsStore.slice(0, limit);
  }
}
