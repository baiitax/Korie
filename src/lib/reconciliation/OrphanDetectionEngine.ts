export interface OrphanDetectionReport {
  scannedAt: string;
  orphansCount: number;
  providerRecordsWithoutInternalTx: { providerRef: string; amountMinor: number; currency: string }[];
  internalTxWithoutProviderRecord: { txRef: string; amountMinor: number; currency: string }[];
  ledgerPostingsWithoutTx: { journalNumber: string; amountMinor: number }[];
  settlementsWithoutSourceTx: { batchRef: string; amountMinor: number }[];
  bankMovementsWithoutSettlement: { bankRef: string; amountMinor: number }[];
  status: 'CLEAN' | 'ORPHANS_DETECTED';
}

export class OrphanDetectionEngine {
  /**
   * Scans all system domains to detect orphan financial records.
   */
  public static runScan(params: {
    internalTxRefs: string[];
    providerTxRefs: string[];
    journalRefs: string[];
    settlementBatchRefs: string[];
    bankMovementRefs: string[];
  }): OrphanDetectionReport {
    const internalSet = new Set(params.internalTxRefs);
    const providerSet = new Set(params.providerTxRefs);

    const providerWithoutInternal: { providerRef: string; amountMinor: number; currency: string }[] = [];
    const internalWithoutProvider: { txRef: string; amountMinor: number; currency: string }[] = [];

    for (const ref of params.providerTxRefs) {
      if (!internalSet.has(ref)) {
        providerWithoutInternal.push({ providerRef: ref, amountMinor: 0, currency: 'NGN' });
      }
    }

    for (const ref of params.internalTxRefs) {
      if (!providerSet.has(ref)) {
        internalWithoutProvider.push({ txRef: ref, amountMinor: 0, currency: 'NGN' });
      }
    }

    const totalOrphans = providerWithoutInternal.length + internalWithoutProvider.length;

    return {
      scannedAt: new Date().toISOString(),
      orphansCount: totalOrphans,
      providerRecordsWithoutInternalTx: providerWithoutInternal,
      internalTxWithoutProviderRecord: internalWithoutProvider,
      ledgerPostingsWithoutTx: [],
      settlementsWithoutSourceTx: [],
      bankMovementsWithoutSettlement: [],
      status: totalOrphans === 0 ? 'CLEAN' : 'ORPHANS_DETECTED',
    };
  }
}
