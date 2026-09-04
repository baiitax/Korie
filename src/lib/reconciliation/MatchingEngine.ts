import { 
  CanonicalReconciliationRecord, 
  MatchResultType, 
  ReconciliationRun, 
  ReconciliationSourceType 
} from '@/types/reconciliationEngine';

export interface MatchingRuleConfig {
  version: string;
  allowFuzzyMatch: boolean;
  maxAmountToleranceMinor: number; // e.g. 100 minor units (₦1.00)
  maxDateToleranceHours: number;   // e.g. 24 hours
  highValueApprovalThresholdMinor: number; // e.g. ₦1,000,000.00
}

export class MatchingEngine {
  private static defaultConfig: MatchingRuleConfig = {
    version: 'v1.0.0',
    allowFuzzyMatch: true,
    maxAmountToleranceMinor: 100, // ₦1.00 tolerance for bank rounding
    maxDateToleranceHours: 48,
    highValueApprovalThresholdMinor: 1_000_000_00, // ₦1,000,000
  };

  /**
   * Normalizes internal or external transaction data into a canonical reconciliation record.
   */
  public static normalizeRecord(params: {
    runId: string;
    sourceId: string;
    sourceType: ReconciliationSourceType;
    sourceRecordReference: string;
    transactionReference?: string;
    providerReference?: string;
    externalReference?: string;
    accountReference: string;
    recordType: 'DEBIT' | 'CREDIT';
    direction: 'INBOUND' | 'OUTBOUND';
    currency: 'NGN' | 'XOF' | 'USD';
    amountMinor: number;
    feeMinor?: number;
    valueDate: string;
    transactionDate: string;
    rawReference?: string;
    metadata?: Record<string, any>;
  }): CanonicalReconciliationRecord {
    if (!Number.isInteger(params.amountMinor) || params.amountMinor < 0) {
      throw new Error(`Amount must be a non-negative integer minor unit. Received: ${params.amountMinor}`);
    }

    const fee = params.feeMinor || 0;
    const net = params.direction === 'INBOUND' 
      ? params.amountMinor - fee 
      : params.amountMinor + fee;

    return {
      id: `rc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      runId: params.runId,
      sourceId: params.sourceId,
      sourceType: params.sourceType,
      sourceRecordReference: params.sourceRecordReference,
      transactionReference: params.transactionReference,
      providerReference: params.providerReference,
      externalReference: params.externalReference,
      accountReference: params.accountReference,
      recordType: params.recordType,
      direction: params.direction,
      currency: params.currency,
      amountMinor: params.amountMinor,
      feeMinor: fee,
      netAmountMinor: net,
      valueDate: params.valueDate,
      transactionDate: params.transactionDate,
      matchStatus: 'MANUAL_REVIEW',
      confidenceScore: 0,
      rawReference: params.rawReference,
      metadata: params.metadata || {},
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Executes deterministic 5-level hierarchical matching between internal records and provider/bank records.
   */
  public static executeMatching(
    internalRecords: CanonicalReconciliationRecord[],
    externalRecords: CanonicalReconciliationRecord[],
    config: MatchingRuleConfig = this.defaultConfig
  ): {
    matchedPairs: { internal: CanonicalReconciliationRecord; external: CanonicalReconciliationRecord; ruleLevel: number }[];
    unmatchedInternal: CanonicalReconciliationRecord[];
    unmatchedExternal: CanonicalReconciliationRecord[];
  } {
    const matchedPairs: { internal: CanonicalReconciliationRecord; external: CanonicalReconciliationRecord; ruleLevel: number }[] = [];
    const unmatchedInternal: CanonicalReconciliationRecord[] = [];
    const unmatchedExternal: CanonicalReconciliationRecord[] = [...externalRecords];

    const matchedExternalIds = new Set<string>();

    for (const internal of internalRecords) {
      let matchedExternalIndex = -1;
      let matchedRuleLevel = 0;
      let matchType: MatchResultType = 'MISSING_EXTERNAL';
      let confidence = 0;

      for (let i = 0; i < unmatchedExternal.length; i++) {
        const ext = unmatchedExternal[i];
        if (matchedExternalIds.has(ext.id)) continue;

        // Level 1: Exact Reference Match
        if (
          internal.transactionReference &&
          ext.providerReference &&
          internal.transactionReference === ext.providerReference &&
          internal.currency === ext.currency &&
          internal.amountMinor === ext.amountMinor
        ) {
          matchedExternalIndex = i;
          matchedRuleLevel = 1;
          matchType = 'EXACT_MATCH';
          confidence = 100;
          break;
        }

        // Level 2: External Gateway Reference Match
        if (
          internal.externalReference &&
          ext.externalReference &&
          internal.externalReference === ext.externalReference &&
          internal.currency === ext.currency &&
          internal.amountMinor === ext.amountMinor
        ) {
          matchedExternalIndex = i;
          matchedRuleLevel = 2;
          matchType = 'MATCHED_BY_REFERENCE';
          confidence = 100;
          break;
        }

        // Level 3: Composite Match (Amount + Currency + Date + Direction)
        const dateDiffHours = Math.abs(
          new Date(internal.transactionDate).getTime() - new Date(ext.transactionDate).getTime()
        ) / 3600000;

        if (
          internal.currency === ext.currency &&
          internal.amountMinor === ext.amountMinor &&
          internal.direction === ext.direction &&
          dateDiffHours <= config.maxDateToleranceHours
        ) {
          matchedExternalIndex = i;
          matchedRuleLevel = 3;
          matchType = 'MATCHED_BY_COMPOSITE';
          confidence = 85;
          break;
        }

        // Level 4: Batch Reference Match
        if (
          internal.metadata?.batchReference &&
          ext.metadata?.batchReference &&
          internal.metadata.batchReference === ext.metadata.batchReference &&
          internal.currency === ext.currency &&
          internal.amountMinor === ext.amountMinor
        ) {
          matchedExternalIndex = i;
          matchedRuleLevel = 4;
          matchType = 'SETTLEMENT_MISMATCH';
          confidence = 80;
          break;
        }

        // Level 5: Controlled Fuzzy Match (Amount within configured tolerance)
        if (
          config.allowFuzzyMatch &&
          internal.currency === ext.currency &&
          Math.abs(internal.amountMinor - ext.amountMinor) <= config.maxAmountToleranceMinor &&
          internal.direction === ext.direction &&
          dateDiffHours <= config.maxDateToleranceHours
        ) {
          // High-value fuzzy match requires manual review
          if (internal.amountMinor >= config.highValueApprovalThresholdMinor) {
            matchType = 'MANUAL_REVIEW';
            confidence = 60;
          } else {
            matchedExternalIndex = i;
            matchedRuleLevel = 5;
            matchType = 'PARTIAL_MATCH';
            confidence = 70;
            break;
          }
        }
      }

      if (matchedExternalIndex !== -1) {
        const ext = unmatchedExternal[matchedExternalIndex];
        matchedExternalIds.add(ext.id);

        internal.matchStatus = matchType;
        internal.confidenceScore = confidence;
        internal.matchedRecordId = ext.id;

        ext.matchStatus = matchType;
        ext.confidenceScore = confidence;
        ext.matchedRecordId = internal.id;

        matchedPairs.push({ internal, external: ext, ruleLevel: matchedRuleLevel });
      } else {
        internal.matchStatus = 'MISSING_EXTERNAL';
        internal.confidenceScore = 0;
        unmatchedInternal.push(internal);
      }
    }

    const remainingExternal = unmatchedExternal.filter(e => !matchedExternalIds.has(e.id));
    for (const ext of remainingExternal) {
      ext.matchStatus = 'MISSING_INTERNAL';
      ext.confidenceScore = 0;
    }

    return {
      matchedPairs,
      unmatchedInternal,
      unmatchedExternal: remainingExternal,
    };
  }
}
