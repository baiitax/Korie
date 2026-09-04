// Governed Enterprise Data Dictionary & Metadata Engine

import { DataDictionaryEntry } from '@/types/reportingEngine';

export class DataDictionaryEngine {
  private static instance: DataDictionaryEngine;

  private entries: Map<string, DataDictionaryEntry> = new Map();

  private constructor() {
    this.seedEntries();
  }

  public static getInstance(): DataDictionaryEngine {
    if (!DataDictionaryEngine.instance) {
      DataDictionaryEngine.instance = new DataDictionaryEngine();
    }
    return DataDictionaryEngine.instance;
  }

  private seedEntries() {
    const defaultEntries: DataDictionaryEntry[] = [
      {
        id: 'dict-01',
        metricCode: 'MTR-FIN-001',
        metricName: 'Total Customer Liability Funds',
        domain: 'Financial / Core Ledger',
        businessDefinition: 'Total aggregate customer wallet balance liability owed to end-users at reporting cut-off.',
        technicalFormula: 'SUM(customer_wallet_accounts.balance WHERE status = ACTIVE)',
        dataOwner: 'Chief Financial Officer (CFO)',
        dataSteward: 'Head of Financial Reporting',
        confidentialityLevel: 'RESTRICTED_PII',
        version: 'v2.0',
        isActive: true,
      },
      {
        id: 'dict-02',
        metricCode: 'MTR-TREAS-001',
        metricName: 'Available Liquid Nostro Reserves',
        domain: 'Treasury / ALM',
        businessDefinition: 'Total settled cash held across Providus Bank Nigeria and Koris Bank Niger Republic clearing pools.',
        technicalFormula: 'SUM(nostro_pool_accounts.cleared_balance)',
        dataOwner: 'Group Treasurer',
        dataSteward: 'Treasury Operations Lead',
        confidentialityLevel: 'CONFIDENTIAL',
        version: 'v2.0',
        isActive: true,
      },
      {
        id: 'dict-03',
        metricCode: 'MTR-PAY-001',
        metricName: 'Payment Switch Success Rate',
        domain: 'Payment Switch & Operations',
        businessDefinition: 'Ratio of successful transaction completions over total attempted payment switch executions.',
        technicalFormula: '(COUNT(status = SUCCESS) / COUNT(total_attempts)) * 100',
        dataOwner: 'VP Engineering / CTO',
        dataSteward: 'SRE & Core Switch Lead',
        confidentialityLevel: 'INTERNAL',
        version: 'v2.0',
        isActive: true,
      },
      {
        id: 'dict-04',
        metricCode: 'MTR-FRD-001',
        metricName: 'Net Unrecovered Fraud Loss Ratio',
        domain: 'Risk / Fraud Engine',
        businessDefinition: 'Net monthly unrecovered fraud losses expressed in basis points against monthly gross transaction volume.',
        technicalFormula: '(Net Fraud Losses / Monthly GTV) * 10000 bps',
        dataOwner: 'Chief Risk Officer (CRO)',
        dataSteward: 'Fraud Operations Desk',
        confidentialityLevel: 'CONFIDENTIAL',
        version: 'v2.0',
        isActive: true,
      },
      {
        id: 'dict-05',
        metricCode: 'MTR-AML-001',
        metricName: 'High-Risk AML Alert SLA Compliance',
        domain: 'Regulatory & Compliance',
        businessDefinition: 'Percentage of high-severity AML alerts reviewed and triaged within statutory 72-hour window.',
        technicalFormula: '(Count Closed Within 72h / Total High Risk Alerts) * 100',
        dataOwner: 'Chief Compliance Officer (CCO)',
        dataSteward: 'AML Operations Lead',
        confidentialityLevel: 'RESTRICTED_PII',
        version: 'v2.0',
        isActive: true,
      },
    ];

    defaultEntries.forEach((e) => this.entries.set(e.id, e));
  }

  public getEntries(): DataDictionaryEntry[] {
    return Array.from(this.entries.values());
  }
}
