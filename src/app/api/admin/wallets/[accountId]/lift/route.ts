// Dual-control execution: lift an account restriction for real.
// POST /api/admin/wallets/[accountId]/lift { restriction, actor }
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';
import type { AccountRestrictionType } from '@/types/customerProductFactory';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { accountId: string } }) {
  const guard = await adminApiGuard(req, 'write');
  if (!guard.ok) return guard.response;
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const body = (await req.json()) as { restriction?: string; actor?: string };
    if (!body.restriction) {
      return NextResponse.json(gateway.createError('INVALID_RESTRICTION', 'restriction is required.'), { status: 400 });
    }
    if (!body.actor || !body.actor.includes('@')) {
      return NextResponse.json(
        gateway.createError('ACTOR_REQUIRED', 'The authorising checker identity (email) is required.'),
        { status: 400 },
      );
    }
    const engine = AccountLifecycleEngine.getInstance();
    const found =
      engine.getAccount(params.accountId) ||
      engine.getAccounts().find((a) => a.accountNumber === params.accountId);
    if (!found) {
      return NextResponse.json(gateway.createError('ACCOUNT_NOT_FOUND', 'No account with that id or number.'), { status: 404 });
    }
    if (!(found.restrictions || []).includes(body.restriction as AccountRestrictionType)) {
      return NextResponse.json(
        gateway.createError('RESTRICTION_ABSENT', 'That restriction is not recorded on this account.'),
        { status: 409 },
      );
    }
    const result = engine.liftRestriction(found.id, body.restriction as AccountRestrictionType, body.actor);
    if (!result.success || !result.account) {
      return NextResponse.json(gateway.createError(result.error || 'LIFT_FAILED', 'The lift was refused.'), { status: 422 });
    }
    return NextResponse.json(
      gateway.createResponse({
        accountId: result.account.id,
        accountNumber: result.account.accountNumber,
        status: result.account.status,
        restrictions: result.account.restrictions || [],
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lift restriction failed';
    return NextResponse.json(gateway.createError('LIFT_FAILED', message), { status: 500 });
  }
}
