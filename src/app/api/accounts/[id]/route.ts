import { NextRequest, NextResponse } from 'next/server';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';
import { adminApiGuard } from '@/lib/security/apiGuards';
import type { AccountRestrictionType } from '@/types/customerProductFactory';

export const dynamic = 'force-dynamic';

// Account record + restriction mutations. Batch-2 remediation: PATCH used to
// be wide open (unauthenticated RESTRICT/UNRESTRICT on any account). Both
// handlers are now admin-guarded, and mutations require the acting identity
// so the engine can attribute makers and enforce maker ≠ checker on lifts.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await adminApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  try {
    const engine = AccountLifecycleEngine.getInstance();
    const account = engine.getAccount(params.id);

    if (!account) {
      return NextResponse.json({ success: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await adminApiGuard(req, 'write');
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json();
    const engine = AccountLifecycleEngine.getInstance();
    const actor = typeof body.actor === 'string' ? body.actor : '';

    if (body.action === 'RESTRICT') {
      if (!actor.includes('@')) {
        return NextResponse.json({ success: false, error: 'ACTOR_REQUIRED' }, { status: 400 });
      }
      const result = engine.applyRestriction(params.id, body.restriction, body.reason, actor);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, account: result.account });
    }

    if (body.action === 'UNRESTRICT') {
      if (!actor.includes('@')) {
        return NextResponse.json({ success: false, error: 'ACTOR_REQUIRED' }, { status: 400 });
      }
      const result = engine.liftRestriction(params.id, body.restriction as AccountRestrictionType, actor);
      if (!result.success) {
        const status = result.error === 'MAKER_EQUALS_CHECKER' ? 422 : 400;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      return NextResponse.json({ success: true, account: result.account });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
