// POS Terminal Fleet, Capability Matrix & Assignment Governance Engine

import { AgencyTerminalRecord, TerminalStatus } from '@/types/agencyEngine';

export class TerminalManagementEngine {
  private static instance: TerminalManagementEngine;

  private terminals: Map<string, AgencyTerminalRecord> = new Map();

  private constructor() {
    this.seedTerminals();
  }

  public static getInstance(): TerminalManagementEngine {
    if (!TerminalManagementEngine.instance) {
      TerminalManagementEngine.instance = new TerminalManagementEngine();
    }
    return TerminalManagementEngine.instance;
  }

  private seedTerminals() {
    const defaultTerminals: AgencyTerminalRecord[] = [
      {
        id: 'term-01',
        terminalId: 'TID-NG-009182',
        terminalSerial: 'PAX-SN-99182039',
        terminalType: 'ANDROID_POS',
        agentId: 'agt-ng-001',
        agentName: 'Garba Express Services & POS',
        deviceId: 'DEV-POS-NG-01',
        status: 'ACTIVE',
        capabilities: ['CASH_IN', 'CASH_OUT', 'TRANSFER', 'CARD', 'QR', 'BILL_PAYMENT'],
        lastHeartbeatAt: new Date().toISOString(),
        createdAt: '2026-01-12T00:00:00Z',
      },
      {
        id: 'term-02',
        terminalId: 'TID-NE-002190',
        terminalSerial: 'NXG-SN-44120982',
        terminalType: 'ANDROID_POS',
        agentId: 'agt-ne-001',
        agentName: 'Sahel Kiosque Niamey',
        deviceId: 'DEV-POS-NE-01',
        status: 'ACTIVE',
        capabilities: ['CASH_IN', 'CASH_OUT', 'BCEAO_SIP_TRANSFER', 'QR'],
        lastHeartbeatAt: new Date().toISOString(),
        createdAt: '2026-02-18T00:00:00Z',
      },
      {
        id: 'term-03',
        terminalId: 'TID-NG-009341',
        terminalSerial: 'ING-SN-22819034',
        terminalType: 'MOBILE_POS',
        agentId: 'agt-ng-002',
        agentName: 'Alaba Central Float Desk',
        deviceId: 'DEV-POS-NG-02',
        status: 'RESTRICTED',
        capabilities: ['CASH_IN', 'CASH_OUT'],
        lastHeartbeatAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        createdAt: '2026-03-05T00:00:00Z',
      },
    ];

    defaultTerminals.forEach((t) => this.terminals.set(t.terminalId, t));
  }

  public getTerminals(): AgencyTerminalRecord[] {
    return Array.from(this.terminals.values());
  }

  public getTerminal(terminalId: string): AgencyTerminalRecord | undefined {
    return this.terminals.get(terminalId);
  }

  public updateTerminalStatus(terminalId: string, status: TerminalStatus): { success: boolean; terminal?: AgencyTerminalRecord } {
    const term = this.terminals.get(terminalId);
    if (!term) return { success: false };

    term.status = status;
    this.terminals.set(terminalId, term);
    return { success: true, terminal: term };
  }
}
