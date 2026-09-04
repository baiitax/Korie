import { NextRequest } from 'next/server';
import { BankReconciliationEngine } from '@/lib/reconciliation/BankReconciliationEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const statements = BankReconciliationEngine.getStatements();
    return ApiResponse.success({
      count: statements.length,
      statements,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'BANK_STATEMENTS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, statementId, bankCode, bankName, accountNumber, currency, statementDate, openingBalanceMinor, closingBalanceMinor, lines, importedBy, chartAccountCode } = body;

    // 1. Reconcile statement against Double-Entry Ledger account
    if (action === 'RECONCILE_AGAINST_LEDGER') {
      if (!statementId) return ApiResponse.badRequest('statementId is required for reconciliation.');
      const reconResult = BankReconciliationEngine.reconcileStatementAgainstLedger(statementId, chartAccountCode || '1010');
      return ApiResponse.success(reconResult, `Bank statement reconciled against General Ledger account ${chartAccountCode || '1010'}.`);
    }

    // 2. Ingest bank statement file
    if (!bankCode || !accountNumber || openingBalanceMinor === undefined || closingBalanceMinor === undefined || !lines) {
      return ApiResponse.badRequest('bankCode, accountNumber, openingBalanceMinor, closingBalanceMinor, and lines are required.');
    }

    const statement = BankReconciliationEngine.importStatement({
      bankCode,
      bankName: bankName || 'Providus Bank Nigeria',
      accountNumber,
      currency: currency || 'NGN',
      statementDate: statementDate || new Date().toISOString().slice(0, 10),
      openingBalanceMinor,
      closingBalanceMinor,
      lines,
      fileContentRaw: JSON.stringify(lines),
      importedBy: importedBy || 'TREASURY_OFFICER',
    });

    return ApiResponse.created(statement, `Bank statement ${statement.statementReference} imported and balance integrity verified.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'BANK_STATEMENT_IMPORT_ERROR', 400);
  }
}
