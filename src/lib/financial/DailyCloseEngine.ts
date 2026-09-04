import { DailyCloseRecord } from '@/types/financialEngine';
import { DoubleEntryLedgerEngine } from './DoubleEntryLedgerEngine';

export class DailyCloseEngine {
  private static closeHistory: Map<string, DailyCloseRecord> = new Map();

  /**
   * Run automated end-of-day financial close and assertions.
   */
  public static executeDailyClose(dateStr?: string, operator: string = 'AUTOMATED_FINANCIAL_CLOSE_DAEMON'): DailyCloseRecord {
    const closeDate = dateStr || new Date().toISOString().slice(0, 10);
    const id = `close_${closeDate.replace(/-/g, '')}`;

    const tbNgn = DoubleEntryLedgerEngine.generateTrialBalance('NGN');
    const tbXof = DoubleEntryLedgerEngine.generateTrialBalance('XOF');
    const journals = DoubleEntryLedgerEngine.getJournals();

    let totalDebitVolume = 0;
    let totalCreditVolume = 0;

    for (const j of journals) {
      totalDebitVolume += j.totalDebit;
      totalCreditVolume += j.totalCredit;
    }

    const isEquationBalanced = (totalDebitVolume === totalCreditVolume) && tbNgn.isBalanced && tbXof.isBalanced;

    const providusPool = DoubleEntryLedgerEngine.getAccountBalance('1010')?.calculatedBalance || 0;
    const korisPool = DoubleEntryLedgerEngine.getAccountBalance('1020')?.calculatedBalance || 0;
    const customerNgn = DoubleEntryLedgerEngine.getAccountBalance('2010')?.calculatedBalance || 0;
    const customerXof = DoubleEntryLedgerEngine.getAccountBalance('2020')?.calculatedBalance || 0;
    const feeRevenue = DoubleEntryLedgerEngine.getAccountBalance('4010')?.calculatedBalance || 0;
    const commExpense = DoubleEntryLedgerEngine.getAccountBalance('5030')?.calculatedBalance || 0;
    const suspenseNgn = DoubleEntryLedgerEngine.getAccountBalance('7100')?.calculatedBalance || 0;
    const suspenseXof = DoubleEntryLedgerEngine.getAccountBalance('7300')?.calculatedBalance || 0;

    const record: DailyCloseRecord = {
      id,
      closeDate,
      status: isEquationBalanced ? 'COMPLETED' : 'EXCEPTION_PENDING',
      totalJournalsPosted: journals.length,
      totalDebitVolume,
      totalCreditVolume,
      isEquationBalanced,
      unresolvedExceptionsCount: isEquationBalanced ? 0 : 1,
      closedBy: operator,
      closedAt: new Date().toISOString(),
      metrics: {
        customerFundsNgn: customerNgn,
        customerFundsXof: customerXof,
        providusCashNgn: providusPool,
        korisCashXof: korisPool,
        feeRevenueNgn: feeRevenue,
        commissionExpenseNgn: commExpense,
        suspenseNgn,
        suspenseXof,
      },
    };

    this.closeHistory.set(id, record);
    return record;
  }

  public static getCloseHistory(): DailyCloseRecord[] {
    return Array.from(this.closeHistory.values()).sort(
      (a, b) => new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
    );
  }

  public static getCloseRecord(dateStr: string): DailyCloseRecord | undefined {
    const id = `close_${dateStr.replace(/-/g, '')}`;
    return this.closeHistory.get(id);
  }
}
