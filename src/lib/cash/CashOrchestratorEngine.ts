// Cash Operations & Double-Entry Ledger Orchestrator Engine

import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';
import { CashPositionEngine } from './CashPositionEngine';
import { CashLocationEngine } from './CashLocationEngine';

export interface CashInPayload {
  agentId: string;
  locationId: string;
  customerId: string;
  amount: number;
  currency: 'NGN' | 'XOF';
  terminalId: string;
  deviceId: string;
  operatorId: string;
  idempotencyKey: string;
}

export interface CashOutPayload {
  agentId: string;
  locationId: string;
  customerId: string;
  amount: number;
  currency: 'NGN' | 'XOF';
  terminalId: string;
  deviceId: string;
  operatorId: string;
  idempotencyKey: string;
}

export interface CashOrchestrationResult {
  success: boolean;
  transactionReference: string;
  glJournalId?: string;
  physicalCashUpdated: boolean;
  newExpectedPhysicalCash?: number;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'STATE_UNKNOWN';
  error?: string;
}

export class CashOrchestratorEngine {
  private static instance: CashOrchestratorEngine;
  private processedKeys: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): CashOrchestratorEngine {
    if (!CashOrchestratorEngine.instance) {
      CashOrchestratorEngine.instance = new CashOrchestratorEngine();
    }
    return CashOrchestratorEngine.instance;
  }

  public processCashIn(payload: CashInPayload): CashOrchestrationResult {
    if (this.processedKeys.has(payload.idempotencyKey)) {
      return {
        success: true,
        transactionReference: `TX-CASHIN-${payload.idempotencyKey.slice(0, 8)}`,
        physicalCashUpdated: true,
        status: 'COMPLETED',
      };
    }

    const posEngine = CashPositionEngine.getInstance();
    const pos = posEngine.getPosition(payload.locationId);
    if (!pos) {
      return { success: false, transactionReference: '', physicalCashUpdated: false, status: 'REJECTED', error: 'LOCATION_POSITION_NOT_FOUND' };
    }

    const txRef = `TX-CASHIN-${Date.now().toString().slice(-6)}`;
    const journalNumber = `JE-CASHIN-${Date.now().toString().slice(-6)}`;

    // Ledger posting:
    // Debit: 1080 (Agent Physical Cash Asset NGN) / 1090 (XOF)
    // Credit: 2010 (Customer Wallet Liability NGN) / 2020 (XOF)
    const assetAccount = payload.currency === 'NGN' ? '1080' : '1090';
    const liabilityAccount = payload.currency === 'NGN' ? '2010' : '2020';
    const minorAmount = Math.round(payload.amount * 100);

    DoubleEntryLedgerEngine.ensureInitialized();
    try {
      DoubleEntryLedgerEngine.postJournalEntry({
        journalNumber,
        ruleCode: 'RULE_AGENCY_CASH_IN',
        ruleVersion: 'v1',
        description: `Agency Cash-In Deposit via ${payload.terminalId}`,
        currency: payload.currency,
        totalDebit: minorAmount,
        totalCredit: minorAmount,
        effectiveAt: new Date().toISOString(),
        createdBy: payload.operatorId,
        sourceSystem: 'KORIEPAY_CASH_OPS',
        sourceReference: txRef,
        lines: [
          {
            id: `jl_cin_dr_${Date.now()}`,
            journalEntryId: journalNumber,
            accountCode: assetAccount,
            accountName: `Agent Physical Cash-in-Custody ${payload.currency}`,
            category: 'ASSET',
            direction: 'DEBIT',
            debitAmount: minorAmount,
            creditAmount: 0,
            currency: payload.currency,
            narration: `Cash physically collected by agent ${payload.operatorId}`,
            dimension: { country: payload.currency === 'NGN' ? 'NG' : 'NE', currency: payload.currency },
            createdAt: new Date().toISOString(),
          },
          {
            id: `jl_cin_cr_${Date.now()}`,
            journalEntryId: journalNumber,
            accountCode: liabilityAccount,
            accountName: `Customer Wallet Deposits ${payload.currency}`,
            category: 'LIABILITY',
            direction: 'CREDIT',
            debitAmount: 0,
            creditAmount: minorAmount,
            currency: payload.currency,
            narration: `Customer digital balance credit for cash-in`,
            dimension: { country: payload.currency === 'NGN' ? 'NG' : 'NE', currency: payload.currency },
            createdAt: new Date().toISOString(),
          },
        ],
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Ledger posting failed';
      return { success: false, transactionReference: txRef, physicalCashUpdated: false, status: 'REJECTED', error: errorMsg };
    }

    // Update physical cash position
    pos.cashInflows += payload.amount;
    pos.expectedPhysicalCash += payload.amount;
    pos.availablePhysicalCash += payload.amount;
    pos.updatedAt = new Date().toISOString();

    this.processedKeys.add(payload.idempotencyKey);

    return {
      success: true,
      transactionReference: txRef,
      glJournalId: journalNumber,
      physicalCashUpdated: true,
      newExpectedPhysicalCash: pos.expectedPhysicalCash,
      status: 'COMPLETED',
    };
  }

  public processCashOut(payload: CashOutPayload): CashOrchestrationResult {
    if (this.processedKeys.has(payload.idempotencyKey)) {
      return {
        success: true,
        transactionReference: `TX-CASHOUT-${payload.idempotencyKey.slice(0, 8)}`,
        physicalCashUpdated: true,
        status: 'COMPLETED',
      };
    }

    const posEngine = CashPositionEngine.getInstance();
    const pos = posEngine.getPosition(payload.locationId);
    if (!pos) {
      return { success: false, transactionReference: '', physicalCashUpdated: false, status: 'REJECTED', error: 'LOCATION_POSITION_NOT_FOUND' };
    }

    if (pos.availablePhysicalCash < payload.amount) {
      return { success: false, transactionReference: '', physicalCashUpdated: false, status: 'REJECTED', error: 'INSUFFICIENT_PHYSICAL_CASH_IN_DRAWER' };
    }

    const txRef = `TX-CASHOUT-${Date.now().toString().slice(-6)}`;
    const journalNumber = `JE-CASHOUT-${Date.now().toString().slice(-6)}`;

    // Ledger posting:
    // Debit: 2010 (Customer Wallet Liability NGN) / 2020 (XOF)
    // Credit: 1080 (Agent Physical Cash Asset NGN) / 1090 (XOF)
    const assetAccount = payload.currency === 'NGN' ? '1080' : '1090';
    const liabilityAccount = payload.currency === 'NGN' ? '2010' : '2020';
    const minorAmount = Math.round(payload.amount * 100);

    DoubleEntryLedgerEngine.ensureInitialized();
    try {
      DoubleEntryLedgerEngine.postJournalEntry({
        journalNumber,
        ruleCode: 'RULE_AGENCY_CASH_OUT',
        ruleVersion: 'v1',
        description: `Agency Cash-Out Withdrawal via ${payload.terminalId}`,
        currency: payload.currency,
        totalDebit: minorAmount,
        totalCredit: minorAmount,
        effectiveAt: new Date().toISOString(),
        createdBy: payload.operatorId,
        sourceSystem: 'KORIEPAY_CASH_OPS',
        sourceReference: txRef,
        lines: [
          {
            id: `jl_cout_dr_${Date.now()}`,
            journalEntryId: journalNumber,
            accountCode: liabilityAccount,
            accountName: `Customer Wallet Deposits ${payload.currency}`,
            category: 'LIABILITY',
            direction: 'DEBIT',
            debitAmount: minorAmount,
            creditAmount: 0,
            currency: payload.currency,
            narration: `Customer digital wallet debit for cash withdrawal`,
            dimension: { country: payload.currency === 'NGN' ? 'NG' : 'NE', currency: payload.currency },
            createdAt: new Date().toISOString(),
          },
          {
            id: `jl_cout_cr_${Date.now()}`,
            journalEntryId: journalNumber,
            accountCode: assetAccount,
            accountName: `Agent Physical Cash-in-Custody ${payload.currency}`,
            category: 'ASSET',
            direction: 'CREDIT',
            debitAmount: 0,
            creditAmount: minorAmount,
            currency: payload.currency,
            narration: `Banknotes handed over to customer by agent ${payload.operatorId}`,
            dimension: { country: payload.currency === 'NGN' ? 'NG' : 'NE', currency: payload.currency },
            createdAt: new Date().toISOString(),
          },
        ],
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Ledger posting failed';
      return { success: false, transactionReference: txRef, physicalCashUpdated: false, status: 'REJECTED', error: errorMsg };
    }

    // Update physical cash position
    pos.cashOutflows += payload.amount;
    pos.expectedPhysicalCash -= payload.amount;
    pos.availablePhysicalCash -= payload.amount;
    pos.updatedAt = new Date().toISOString();

    this.processedKeys.add(payload.idempotencyKey);

    return {
      success: true,
      transactionReference: txRef,
      glJournalId: journalNumber,
      physicalCashUpdated: true,
      newExpectedPhysicalCash: pos.expectedPhysicalCash,
      status: 'COMPLETED',
    };
  }
}
