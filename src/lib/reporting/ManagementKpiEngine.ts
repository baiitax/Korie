// Governed Executive KPI & Variance Engine

import { ManagementKpi } from '@/types/reportingEngine';

export class ManagementKpiEngine {
  private static instance: ManagementKpiEngine;

  private kpis: Map<string, ManagementKpi> = new Map();

  private constructor() {
    this.seedKpis();
  }

  public static getInstance(): ManagementKpiEngine {
    if (!ManagementKpiEngine.instance) {
      ManagementKpiEngine.instance = new ManagementKpiEngine();
    }
    return ManagementKpiEngine.instance;
  }

  private seedKpis() {
    const defaultKpis: ManagementKpi[] = [
      {
        id: 'kpi-rev-01',
        kpiCode: 'KPI-REV-001',
        name: 'Gross Operating Fee Revenue',
        domain: 'FINANCIAL',
        formula: 'SUM(GL-4000 Operating Revenue Accounts)',
        unit: '₦',
        targetValue: 4200000000,
        actualValue: 4350000000,
        budgetValue: 4100000000,
        variancePct: 6.1,
        status: 'ON_TRACK',
        currency: 'NGN',
        ownerRole: 'Chief Financial Officer (CFO)',
      },
      {
        id: 'kpi-ebt-01',
        kpiCode: 'KPI-EBT-001',
        name: 'EBITDA Margin Rate',
        domain: 'FINANCIAL',
        formula: '(EBITDA / Gross Revenue) * 100',
        unit: '%',
        targetValue: 28.0,
        actualValue: 29.4,
        budgetValue: 26.5,
        variancePct: 10.9,
        status: 'ON_TRACK',
        currency: 'NGN',
        ownerRole: 'Chief Financial Officer (CFO)',
      },
      {
        id: 'kpi-gtv-01',
        kpiCode: 'KPI-GTV-001',
        name: 'Gross Transaction Processing Volume (GTV)',
        domain: 'PAYMENTS',
        formula: 'SUM(Payment Switch Successful Volume)',
        unit: '₦',
        targetValue: 185000000000,
        actualValue: 192400000000,
        budgetValue: 180000000000,
        variancePct: 6.9,
        status: 'ON_TRACK',
        currency: 'NGN',
        ownerRole: 'Chief Operating Officer (COO)',
      },
      {
        id: 'kpi-sws-01',
        kpiCode: 'KPI-SWS-001',
        name: 'Switch Uptime & Transaction Success Rate',
        domain: 'OPERATIONS',
        formula: '(Successful Switch Txs / Total Attempts) * 100',
        unit: '%',
        targetValue: 99.85,
        actualValue: 99.92,
        budgetValue: 99.80,
        variancePct: 0.12,
        status: 'ON_TRACK',
        currency: 'NGN',
        ownerRole: 'VP Engineering & Infrastructure',
      },
      {
        id: 'kpi-liq-01',
        kpiCode: 'KPI-LIQ-001',
        name: '30-Day Liquidity Buffer Coverage Ratio',
        domain: 'TREASURY',
        formula: '(Liquid Assets / 30D Stressed Outflows) * 100',
        unit: '%',
        targetValue: 150.0,
        actualValue: 142.5,
        budgetValue: 150.0,
        variancePct: -5.0,
        status: 'ON_TRACK',
        currency: 'NGN',
        ownerRole: 'Group Treasurer',
      },
      {
        id: 'kpi-frd-01',
        kpiCode: 'KPI-FRD-001',
        name: 'Net Unrecovered Fraud Loss Ratio',
        domain: 'RISK',
        formula: '(Net Fraud Losses / Monthly GTV) * 10000 bps',
        unit: 'bps',
        targetValue: 0.5,
        actualValue: 0.42,
        budgetValue: 0.5,
        variancePct: -16.0,
        status: 'ON_TRACK',
        currency: 'NGN',
        ownerRole: 'Chief Risk Officer (CRO)',
      },
    ];

    defaultKpis.forEach((k) => this.kpis.set(k.id, k));
  }

  public getKpis(): ManagementKpi[] {
    return Array.from(this.kpis.values());
  }
}
