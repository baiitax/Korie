import { NextResponse } from 'next/server';
import { AmlAlertEngine } from '@/lib/aml/AmlAlertEngine';
import { AmlCaseManagementEngine } from '@/lib/aml/AmlCaseManagementEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = AmlAlertEngine.getInstance();
    const alert = engine.getAlert(params.id);

    if (!alert) {
      return NextResponse.json({ success: false, error: 'ALERT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const alertEngine = AmlAlertEngine.getInstance();
    const caseEngine = AmlCaseManagementEngine.getInstance();

    const alert = alertEngine.getAlert(params.id);
    if (!alert) {
      return NextResponse.json({ success: false, error: 'ALERT_NOT_FOUND' }, { status: 404 });
    }

    if (body.action === 'CONVERT_TO_CASE') {
      const newCase = caseEngine.createCaseFromAlert({
        alertId: alert.id,
        alertRef: alert.alertReference,
        customerId: alert.customerId,
        customerName: alert.customerName || 'Subject Entity',
        amount: alert.disputedOrTriggeredAmount,
        currency: alert.currency,
        jurisdiction: alert.currency === 'NGN' ? 'NG' : 'NE',
        priority: alert.severity,
        leadInvestigator: body.investigatorEmail || 'lead.investigator@koriepay.ng',
      });

      alertEngine.updateAlertStatus(alert.id, 'CONVERTED_TO_CASE');
      return NextResponse.json({ success: true, case: newCase });
    }

    if (body.action === 'UPDATE_STATUS') {
      const result = alertEngine.updateAlertStatus(params.id, body.status, body.assignedTo);
      return NextResponse.json({ success: true, alert: result.alert });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
