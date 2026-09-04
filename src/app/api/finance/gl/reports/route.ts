import { NextResponse } from 'next/server';
import { FinancialReportEngine } from '@/lib/financial/FinancialReportEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'trial_balance';
    const currency = searchParams.get('currency') || 'NGN';

    const reportEngine = FinancialReportEngine.getInstance();

    if (reportType === 'trial_balance') {
      const data = reportEngine.generateTrialBalance(currency);
      return NextResponse.json({ success: true, data });
    } else if (reportType === 'income_statement') {
      const data = reportEngine.generateIncomeStatement(currency);
      return NextResponse.json({ success: true, data });
    } else if (reportType === 'balance_sheet') {
      const data = reportEngine.generateBalanceSheet(currency);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'INVALID_REPORT_TYPE' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
