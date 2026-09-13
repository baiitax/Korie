// Dual-control execution: apply an account restriction for real.
// POST /api/admin/wallets/[accountId]/restrict { restriction, reason, actor }
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';
import type { AccountRestrictionType } from '@/types/customerProductFactory';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

const ALLOWED: AccountRestrictionType[] = [
  'DEBIT_ONLY',
  'CREDIT_ONLY',
  'TRANSFER_DISABLED',
  'WITHDRAWAL_DISABLED',
  'BENEFICIARY_DISABLED',
  'DEVICE_RESTRICTED',
  'FULL_FREEZE',
];

export async function POST(req: NextRequest, { params }: { params: { accountId: string } }) {
  const guard = await adminApiGuard(req, 'write');
  if (!guard.ok) return guard.response;
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const body = (await req.json()) as { restriction?: string; reason?: string; actor?: string };
    if (!body.restriction || !ALLOWED.includes(body.restriction as AccountRestrictionType)) {
      return NextResponse.json(
        gateway.createError('INVALID_RESTRICTION', `restriction must be one of ${ALLOWED.join(', ')}`),
        { status: 400 },
      );
    }
    if (!body.reason || body.reason.trim().length < 10) {
      return NextResponse.json(
        gateway.createError('REASON_REQUIRED', 'A justification of at least 10 characters is required to restrict an account.'),
        { status: 400 },
      );
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
    const result = engine.applyRestriction(found.id, body.restriction as AccountRestrictionType, body.reason.trim(), body.actor);
    if (!result.success || !result.account) {
      return NextResponse.json(gateway.createError(result.error || 'RESTRICT_FAILED', 'The restriction was refused.'), { status: 422 });
    }
    return NextResponse.json(
      gateway.createResponse({
        accountId: result.account.id,
        accountNumber: result.account.accountNumber,
        status: result.account.status,
        restrictions: result.account.restrictions || [],
        enforcedBy: 'BankCoreEngine money paths (creditInbound / internalTransfer / nipOut)',
        note:
          body.restriction === 'BENEFICIARY_DISABLED' || body.restriction === 'DEVICE_RESTRICTED'
            ? 'Recorded on the account. The bank core has no beneficiary/device model, so this restriction is not enforced in money paths.'
            : 'Recorded and enforced: restricted directions now reject with an honest code instead of moving money.',
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Apply restriction failed';
    return NextResponse.json(gateway.createError('RESTRICT_FAILED', message), { status: 500 });
  }
}
