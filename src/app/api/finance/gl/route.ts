import { NextResponse } from 'next/server';
import { GeneralLedgerEngine } from '@/lib/financial/GeneralLedgerEngine';
import { SubledgerEngine } from '@/lib/financial/SubledgerEngine';

export async function GET(request: Request) {
  try {
    const glEngine = GeneralLedgerEngine.getInstance();
    const subledgerEngine = SubledgerEngine.getInstance();

    const accounts = glEngine.getAccounts();
    const journals = glEngine.getJournals(100);
    const periods = glEngine.getPeriods();
    const subledgers = subledgerEngine.getAllSubledgers();

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        journals,
        periods,
        subledgers,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const glEngine = GeneralLedgerEngine.getInstance();

    if (body.action === 'REVERSE') {
      const result = glEngine.reverseJournal(body.journalId, body.reason, body.reversedBy || 'finance_controller');
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, reversalJournal: result.reversalJournal });
    }

    const result = glEngine.postJournal(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, journal: result.journal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
