// Privileged Access Management (PAM), Just-In-Time (JIT) Leases & Break-Glass Engine

import { PrivilegedAccessRequest, BreakGlassEvent } from '@/types/iamEngine';

export class PrivilegedAccessEngine {
  private static instance: PrivilegedAccessEngine;

  private requests: Map<string, PrivilegedAccessRequest> = new Map();
  private breakGlassEvents: BreakGlassEvent[] = [];

  private constructor() {
    this.seedRequests();
  }

  public static getInstance(): PrivilegedAccessEngine {
    if (!PrivilegedAccessEngine.instance) {
      PrivilegedAccessEngine.instance = new PrivilegedAccessEngine();
    }
    return PrivilegedAccessEngine.instance;
  }

  private seedRequests() {
    const defaultRequests: PrivilegedAccessRequest[] = [
      {
        id: 'jit-01',
        requestReference: 'JIT-2026-0041',
        requesterEmail: 'treasury.lead@koriepay.com',
        targetRoleCode: 'TREASURY_EMERGENCY_REBALANCE',
        justification: 'Execute end-of-day multi-currency corridor rebalancing between Providus NG and Coris NE omnibus.',
        changeTicketRef: 'CHG-OPS-9921',
        durationMinutes: 45,
        status: 'APPROVED',
        checkerEmail: 'super.admin@koriepay.com',
        decidedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        leaseStartsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        leaseExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
      {
        id: 'jit-02',
        requestReference: 'JIT-2026-0042',
        requesterEmail: 'lead.investigator@koriepay.ng',
        targetRoleCode: 'AML_BULK_FREEZE_EXECUTION',
        justification: 'Deploy emergency debit restriction across 3 connected mule accounts identified in ALT-2026-009182.',
        changeTicketRef: 'INC-SEC-0089',
        durationMinutes: 30,
        status: 'PENDING',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];

    defaultRequests.forEach((r) => this.requests.set(r.id, r));
  }

  public getRequests(): PrivilegedAccessRequest[] {
    return Array.from(this.requests.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createJitRequest(params: {
    requesterEmail: string;
    targetRoleCode: string;
    justification: string;
    changeTicketRef: string;
    durationMinutes?: number;
  }): PrivilegedAccessRequest {
    const id = `jit-${Date.now().toString().slice(-4)}`;
    const ref = `JIT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const req: PrivilegedAccessRequest = {
      id,
      requestReference: ref,
      requesterEmail: params.requesterEmail,
      targetRoleCode: params.targetRoleCode,
      justification: params.justification,
      changeTicketRef: params.changeTicketRef,
      durationMinutes: params.durationMinutes || 30,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.requests.set(id, req);
    return req;
  }

  public approveJitRequest(
    requestId: string,
    checkerEmail: string
  ): { success: boolean; request?: PrivilegedAccessRequest; error?: string } {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: 'REQUEST_NOT_FOUND' };

    // SoD Check: Requester cannot approve their own privilege request
    if (req.requesterEmail.toLowerCase() === checkerEmail.toLowerCase()) {
      return { success: false, error: 'SEPARATION_OF_DUTIES_VIOLATION: Requester cannot approve own privilege elevation.' };
    }

    const now = new Date();
    req.status = 'APPROVED';
    req.checkerEmail = checkerEmail;
    req.decidedAt = now.toISOString();
    req.leaseStartsAt = now.toISOString();
    req.leaseExpiresAt = new Date(now.getTime() + req.durationMinutes * 60 * 1000).toISOString();

    this.requests.set(requestId, req);
    return { success: true, request: req };
  }

  public activateBreakGlass(params: {
    actorEmail: string;
    incidentRef: string;
    justification: string;
  }): BreakGlassEvent {
    const event: BreakGlassEvent = {
      id: `bg-${Date.now().toString().slice(-4)}`,
      incidentRef: params.incidentRef,
      actorEmail: params.actorEmail,
      justification: params.justification,
      durationMinutes: 30,
      aalUsed: 'AAL3',
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.breakGlassEvents.push(event);
    return event;
  }

  public getBreakGlassEvents(): BreakGlassEvent[] {
    return [...this.breakGlassEvents];
  }
}
