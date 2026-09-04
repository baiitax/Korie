import { BankStatementModel, BankStatementLine } from '@/types/reconciliationEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class BankReconciliationEngine {
  private static statements: Map<string, BankStatementModel> = new Map();
  private static statementLines: Map<string, BankStatementLine[]> = new Map();
  private static processedHashes: Set<string> = new Set();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialStatements();
    }
  }

  private static seedInitialStatements() {
    if (this.statements.size > 0) return;

    try {
      this.importStatement({
        bankCode: '058',
        bankName: 'Providus Bank Nigeria',
        accountNumber: '1029384756',
        currency: 'NGN',
        statementDate: '2026-09-02',
        openingBalanceMinor: 150_000_000_00,
        closingBalanceMinor: 211_350_000_00,
        lines: [
          {
            sequenceNumber: 1,
            valueDate: '2026-09-02',
            bookingDate: '2026-09-02T08:15:00Z',
            direction: 'CREDIT',
            amountMinor: 42_500_000_00,
            currency: 'NGN',
            bankReference: 'NIP-CR-0902001',
            narrative: 'NIP Inward Virtual Collections Batch',
            channel: 'NIP',
            counterpartyName: 'Central Bank Switch Clearing',
          },
          {
            sequenceNumber: 2,
            valueDate: '2026-09-02',
            bookingDate: '2026-09-02T11:30:00Z',
            direction: 'CREDIT',
            amountMinor: 18_400_000_00,
            currency: 'NGN',
            bankReference: 'AGG-CR-0902002',
            narrative: 'Card & Checkout Gateway Settlement Inflow',
            channel: 'AGGREGATOR',
            counterpartyName: 'Card Scheme Clearing',
          },
          {
            sequenceNumber: 3,
            valueDate: '2026-09-02',
            bookingDate: '2026-09-02T15:45:00Z',
            direction: 'CREDIT',
            amountMinor: 450_000_00,
            currency: 'NGN',
            bankReference: 'NIP-CR-0902003',
            narrative: 'Direct Credit Unallocated Virtual Account',
            channel: 'NIP',
            counterpartyName: 'Third Party Bank Transfer',
          },
        ],
        fileContentRaw: 'MT940_MOCK_PAYLOAD',
        importedBy: 'TREASURY_SFTP_DAEMON',
      });
    } catch (e) {
      // ignore if exists
    }
  }

  /**
   * Imports and validates an external bank statement file with strict mathematical integrity verification.
   */
  public static importStatement(params: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    currency: 'NGN' | 'XOF' | 'USD';
    statementDate: string;
    openingBalanceMinor: number;
    closingBalanceMinor: number;
    lines: Omit<BankStatementLine, 'id' | 'statementId' | 'isReconciled'>[];
    fileContentRaw: string;
    importedBy: string;
  }): BankStatementModel {
    // 1. Duplicate check via simple hash simulation
    const fileHash = `hash_${params.bankCode}_${params.statementDate}_${params.lines.length}_${params.closingBalanceMinor}`;
    if (this.processedHashes.has(fileHash)) {
      throw new Error(`Duplicate bank statement detected. This statement file has already been ingested (Hash: ${fileHash}).`);
    }

    // 2. Compute credits and debits
    let totalCredits = 0;
    let totalDebits = 0;

    for (const line of params.lines) {
      if (line.direction === 'CREDIT') {
        totalCredits += line.amountMinor;
      } else {
        totalDebits += line.amountMinor;
      }
    }

    // 3. Mathematical Invariant Verification: Opening + Credits - Debits == Closing
    const calculatedClosing = params.openingBalanceMinor + totalCredits - totalDebits;
    if (calculatedClosing !== params.closingBalanceMinor) {
      throw new Error(
        `STATEMENT_INTEGRITY_ERROR: Bank statement does not balance. ` +
        `Opening (${params.openingBalanceMinor}) + Credits (${totalCredits}) - Debits (${totalDebits}) = ${calculatedClosing}, ` +
        `but reported Closing is ${params.closingBalanceMinor}. Variance: ${Math.abs(calculatedClosing - params.closingBalanceMinor)}`
      );
    }

    const statementId = `stmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const statementRef = `STMT-${params.bankCode}-${params.statementDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const statement: BankStatementModel = {
      id: statementId,
      statementReference: statementRef,
      bankAccountId: `bank_acc_${params.bankCode}_${params.accountNumber}`,
      bankCode: params.bankCode,
      bankName: params.bankName,
      accountNumber: params.accountNumber,
      currency: params.currency,
      statementDate: params.statementDate,
      openingBalanceMinor: params.openingBalanceMinor,
      closingBalanceMinor: params.closingBalanceMinor,
      totalCreditsMinor: totalCredits,
      totalDebitsMinor: totalDebits,
      lineCount: params.lines.length,
      isIntegrityVerified: true,
      fileHash,
      importedBy: params.importedBy,
      importedAt: new Date().toISOString(),
    };

    const storedLines: BankStatementLine[] = params.lines.map((l, idx) => ({
      ...l,
      id: `stl_${statementId}_${idx + 1}`,
      statementId,
      isReconciled: false,
    }));

    this.statements.set(statementId, statement);
    this.statementLines.set(statementId, storedLines);
    this.processedHashes.add(fileHash);

    return statement;
  }

  /**
   * Compares the bank statement against the internal Double-Entry General Ledger account (e.g. 1010 / 1020).
   */
  public static reconcileStatementAgainstLedger(statementId: string, chartAccountCode: string = '1010'): {
    statement: BankStatementModel;
    ledgerBalanceMinor: number;
    statementBalanceMinor: number;
    varianceMinor: number;
    isBalanced: boolean;
    unmatchedLinesCount: number;
  } {
    const statement = this.statements.get(statementId);
    if (!statement) throw new Error(`Statement ${statementId} not found.`);

    const ledgerAcc = DoubleEntryLedgerEngine.getAccountBalance(chartAccountCode);
    const ledgerBalance = ledgerAcc?.calculatedBalance || 0;
    const variance = Math.abs(ledgerBalance - statement.closingBalanceMinor);

    return {
      statement,
      ledgerBalanceMinor: ledgerBalance,
      statementBalanceMinor: statement.closingBalanceMinor,
      varianceMinor: variance,
      isBalanced: variance === 0,
      unmatchedLinesCount: variance === 0 ? 0 : 1,
    };
  }

  public static getStatements(): BankStatementModel[] {
    this.ensureInitialized();
    return Array.from(this.statements.values()).sort(
      (a, b) => new Date(b.statementDate).getTime() - new Date(a.statementDate).getTime()
    );
  }

  public static getStatementLines(statementId: string): BankStatementLine[] {
    this.ensureInitialized();
    return this.statementLines.get(statementId) || [];
  }
}
