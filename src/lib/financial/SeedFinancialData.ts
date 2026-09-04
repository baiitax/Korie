import { DoubleEntryLedgerEngine } from './DoubleEntryLedgerEngine';

export function seedInitialFinancialLedger(): void {
  DoubleEntryLedgerEngine.ensureInitialized();
}
