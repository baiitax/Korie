// Tier-1 Agent Lifecycle, Hierarchy, Float & Risk Control Engine

import { AgentRecord, AgentStatus, AgentTier } from '@/types/agentDeviceTerminalEngine';
import { SubledgerEngine } from '../financial/SubledgerEngine';

export class AgentManagementEngine {
  private static instance: AgentManagementEngine;

  private agents: Map<string, AgentRecord> = new Map();

  private constructor() {
    this.seedAgents();
  }

  public static getInstance(): AgentManagementEngine {
    if (!AgentManagementEngine.instance) {
      AgentManagementEngine.instance = new AgentManagementEngine();
    }
    return AgentManagementEngine.instance;
  }

  private seedAgents() {
    const defaultAgents: AgentRecord[] = [
      {
        id: 'agt-ng-001',
        agentCode: 'AGT-NG-0092',
        tenantId: 'tenant-korie-core',
        identityRecordId: 'KID-NG-889102',
        legalName: 'Musa Garba Enterprise',
        tradingName: 'Garba Express Services & POS',
        country: 'NG',
        currency: 'NGN',
        phone: '+2348031122334',
        email: 'garba.express@koriepay.ng',
        region: 'North Central',
        stateOrProvince: 'FCT Abuja',
        lgaOrDistrict: 'Abuja Municipal (AMAC)',
        status: 'ACTIVE',
        tier: 'TIER_2',
        qualityScore: 98.4,
        riskTier: 'LOW',
        dailyTransactionLimit: 2500000,
        singleTransactionLimit: 200000,
        maxCashHolding: 5000000,
        floatBalance: 1850000,
        commissionEarned24h: 34500,
        successRate24h: 99.2,
        activeTerminalId: 'TID-NG-009182',
        assignedDeviceId: 'DEV-POS-NG-01',
        activatedAt: '2026-08-01T09:00:00Z',
        lastActiveAt: '2026-09-03T14:30:00Z',
        createdAt: '2026-07-28T08:00:00Z',
        updatedAt: '2026-09-03T14:30:00Z',
      },
      {
        id: 'agt-ne-001',
        agentCode: 'AGT-NE-0044',
        tenantId: 'tenant-korie-core',
        identityRecordId: 'KID-NE-449102',
        legalName: 'Ibrahim Sahel Commerce SARL',
        tradingName: 'Sahel Kiosque Niamey',
        country: 'NE',
        currency: 'XOF',
        phone: '+22790112233',
        email: 'sahel.kiosque@koriepay.ne',
        region: 'Niamey',
        stateOrProvince: 'Niamey Capitale',
        lgaOrDistrict: 'Commune 1',
        status: 'ACTIVE',
        tier: 'TIER_2',
        qualityScore: 96.8,
        riskTier: 'LOW',
        dailyTransactionLimit: 5000000,
        singleTransactionLimit: 500000,
        maxCashHolding: 10000000,
        floatBalance: 4200000,
        commissionEarned24h: 78000,
        successRate24h: 98.9,
        activeTerminalId: 'TID-NE-002190',
        assignedDeviceId: 'DEV-POS-NE-01',
        activatedAt: '2026-08-05T10:00:00Z',
        lastActiveAt: '2026-09-03T13:45:00Z',
        createdAt: '2026-08-01T11:00:00Z',
        updatedAt: '2026-09-03T13:45:00Z',
      },
      {
        id: 'agt-ng-002',
        agentCode: 'AGT-NG-0104',
        tenantId: 'tenant-korie-core',
        identityRecordId: 'KID-NG-991203',
        legalName: 'Chinedu Okeke Logistics',
        tradingName: 'Alaba Central Float Desk',
        country: 'NG',
        currency: 'NGN',
        phone: '+2348029988776',
        email: 'chinedu.pos@koriepay.ng',
        region: 'South West',
        stateOrProvince: 'Lagos State',
        lgaOrDistrict: 'Ojo / Alaba',
        status: 'UNDER_REVIEW',
        tier: 'TIER_1',
        qualityScore: 74.2,
        riskTier: 'HIGH',
        dailyTransactionLimit: 1000000,
        singleTransactionLimit: 100000,
        maxCashHolding: 2000000,
        floatBalance: 450000,
        commissionEarned24h: 12000,
        successRate24h: 88.5,
        activeTerminalId: 'TID-NG-009341',
        assignedDeviceId: 'DEV-POS-NG-02',
        activatedAt: '2026-08-10T12:00:00Z',
        lastActiveAt: '2026-09-02T18:20:00Z',
        createdAt: '2026-08-08T10:00:00Z',
        updatedAt: '2026-09-03T09:15:00Z',
      },
    ];

    defaultAgents.forEach((a) => this.agents.set(a.id, a));
  }

  public getAgents(filters?: { country?: string; status?: string }): AgentRecord[] {
    let list = Array.from(this.agents.values());
    if (filters?.country && filters.country !== 'GLOBAL') {
      list = list.filter((a) => a.country === filters.country);
    }
    if (filters?.status) {
      list = list.filter((a) => a.status === filters.status);
    }
    return list;
  }

  public getAgent(id: string): AgentRecord | undefined {
    return this.agents.get(id);
  }

  public registerAgent(data: Omit<AgentRecord, 'id' | 'agentCode' | 'status' | 'qualityScore' | 'floatBalance' | 'commissionEarned24h' | 'successRate24h' | 'createdAt' | 'updatedAt'>): AgentRecord {
    const id = `agt-${data.country.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const agentCode = `AGT-${data.country}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const agent: AgentRecord = {
      ...data,
      id,
      agentCode,
      status: 'APPLICATION',
      qualityScore: 100,
      floatBalance: 0,
      commissionEarned24h: 0,
      successRate24h: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(id, agent);
    return agent;
  }

  public transitionAgentStatus(params: {
    agentId: string;
    newStatus: AgentStatus;
    reasonCode: string;
    notes?: string;
    actorEmail: string;
  }): { success: boolean; agent?: AgentRecord; error?: string } {
    const agent = this.agents.get(params.agentId);
    if (!agent) {
      return { success: false, error: 'AGENT_NOT_FOUND' };
    }

    // Lifecycle transition rules
    if (agent.status === 'TERMINATED') {
      return { success: false, error: 'CANNOT_TRANSITION_TERMINATED_AGENT' };
    }

    agent.status = params.newStatus;
    if (params.newStatus === 'ACTIVE' && !agent.activatedAt) {
      agent.activatedAt = new Date().toISOString();
    }
    agent.updatedAt = new Date().toISOString();

    this.agents.set(agent.id, agent);
    return { success: true, agent };
  }

  public updateLimits(params: {
    agentId: string;
    dailyLimit: number;
    singleLimit: number;
    maxCash: number;
    actorEmail: string;
  }): { success: boolean; agent?: AgentRecord; error?: string } {
    const agent = this.agents.get(params.agentId);
    if (!agent) {
      return { success: false, error: 'AGENT_NOT_FOUND' };
    }

    agent.dailyTransactionLimit = params.dailyLimit;
    agent.singleTransactionLimit = params.singleLimit;
    agent.maxCashHolding = params.maxCash;
    agent.updatedAt = new Date().toISOString();

    this.agents.set(agent.id, agent);
    return { success: true, agent };
  }
}
