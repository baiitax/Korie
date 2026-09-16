import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { dispatchMerchantWebhookEvent } from '@/lib/merchant/webhookDispatch';

/**
 * Shared money-movement maker-checker helpers (B8 / RISK-13,
 * migration 20260914000059).
 *
 * Settlement runs and transaction reversals no longer execute directly on
 * any sanctioned route: the route submits a request into
 * maker_checker_requests (the MAKER step), and a DIFFERENT authorized
 * officer decides it (the CHECKER step). The execution itself happens
 * inside the checker's approval transaction — if the underlying run or
 * reversal fails, the whole approval rolls back and the request stays
 * PENDING (fail-closed, retryable).
 *
 * Both decision surfaces (ops approvals, admin approvals) call the same
 * decide RPC through this module, so the webhook side effects and the
 * error mapping are identical.
 */

export type MoneyMovementActionType =
  | 'AGENCY_SETTLEMENT_RUN'
  | 'MERCHANT_SETTLEMENT_RUN'
  | 'AGENCY_TRANSACTION_REVERSAL';

export interface SubmitMoneyMovementArgs {
  actionType: MoneyMovementActionType;
  payload: Record<string, unknown>;
  makerId: string | null;
  makerEmail: string;
  makerRole: string;
  makerNotes?: string | null;
}

export interface DecidedMoneyMovementRequest {
  status: string;
  request_id: string;
  action_type: string;
  payload: Record<string, unknown> | null;
  execution_result: Record<string, unknown> | null;
}

/** Map decide-RPC failures to (httpStatus, code) without leaking internals. */
export function mapMoneyMovementError(message: string): { httpStatus: number; code: string } {
  if (message.includes('MAKER_CHECKER_REQUEST_NOT_FOUND')) return { httpStatus: 404, code: 'APPROVAL_REQUEST_NOT_FOUND' };
  if (message.includes('MAKER_CHECKER_SELF_APPROVAL_FORBIDDEN')) return { httpStatus: 409, code: 'SELF_APPROVAL_FORBIDDEN' };
  if (message.includes('MAKER_CHECKER_REQUEST_ALREADY_DECIDED')) return { httpStatus: 409, code: 'ALREADY_DECIDED' };
  if (message.includes('MAKER_CHECKER_INVALID_DECISION')) return { httpStatus: 400, code: 'INVALID_DECISION' };
  if (message.includes('MAKER_CHECKER_INVALID_ORG') || message.includes('MAKER_CHECKER_INVALID_MERCHANT') || message.includes('MAKER_CHECKER_INVALID_TRANSACTION')) return { httpStatus: 404, code: 'REQUESTED_RESOURCE_NOT_FOUND' };
  if (message.includes('REVERSAL_REASON_REQUIRED') || message.includes('MAKER_CHECKER_INVALID_CURRENCY') || message.includes('MAKER_CHECKER_INVALID_SETTLEMENT_DATE')) return { httpStatus: 400, code: 'INVALID_REQUEST' };
  if (message.includes('AGENCY_TRANSACTION_ALREADY_REVERSED') || message.includes('AGENCY_TRANSACTION_NOT_REVERSIBLE') || message.includes('AGENT_FLOAT_INSUFFICIENT_FOR_CLAWBACK') || message.includes('JOURNAL_SHAPE_UNEXPECTED')) return { httpStatus: 409, code: 'EXECUTION_CONFLICT' };
  if (message.includes('NO_TRANSACTIONS_TO_SETTLE')) return { httpStatus: 409, code: 'NO_TRANSACTIONS_TO_SETTLE' };
  return { httpStatus: 500, code: 'MONEY_MOVEMENT_REQUEST_FAILED' };
}

/** Submit (maker step). Returns the created request row, or an error. */
export async function submitMoneyMovement(args: SubmitMoneyMovementArgs): Promise<
  { ok: true; request: Record<string, unknown> } | { ok: false; httpStatus: number; code: string; message: string }
> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc('submit_money_movement_request', {
    p_action_type: args.actionType,
    p_payload: args.payload,
    p_maker_id: args.makerId,
    p_maker_email: args.makerEmail,
    p_maker_role: args.makerRole,
    p_maker_notes: args.makerNotes ?? null,
  });
  if (error) {
    const mapped = mapMoneyMovementError(error.message || '');
    return { ok: false, ...mapped, message: error.message || 'The request could not be submitted.' };
  }
  return { ok: true, request: (data ?? {}) as Record<string, unknown> };
}

/**
 * Decide (checker step). APPROVE executes the underlying run/reversal inside
 * the approval transaction; REJECT closes the request without executing.
 *
 * After a successful APPROVE of a MERCHANT_SETTLEMENT_RUN, the
 * settlement.completed webhook is dispatched with the executed batch's real
 * figures — same contract the direct route had before the conversion.
 */
export async function decideMoneyMovement(args: {
  requestId: string;
  checkerId: string | null;
  checkerEmail: string;
  decision: 'APPROVE' | 'REJECT';
  notes?: string;
}): Promise<
  { ok: true; result: DecidedMoneyMovementRequest } | { ok: false; httpStatus: number; code: string; message: string }
> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc('decide_money_movement_request', {
    p_request_id: args.requestId,
    p_checker_id: args.checkerId,
    p_checker_email: args.checkerEmail,
    p_decision: args.decision,
    p_checker_notes: args.notes ?? null,
  });
  if (error) {
    const mapped = mapMoneyMovementError(error.message || '');
    return { ok: false, ...mapped, message: error.message || 'The decision did not complete.' };
  }
  const result = (data ?? {}) as DecidedMoneyMovementRequest;

  if (args.decision === 'APPROVE' && result?.status === 'EXECUTED' && result?.action_type === 'MERCHANT_SETTLEMENT_RUN') {
    const merchantId = (result.payload?.merchant_id as string) || null;
    const exec = (result.execution_result ?? {}) as Record<string, unknown>;
    if (merchantId) {
      // Best-effort: the batch is already executed and committed; a webhook
      // delivery failure must not turn the approval into an error response.
      try {
        await dispatchMerchantWebhookEvent(admin, merchantId, 'settlement.completed', {
          batchReference: exec.batch_reference,
          netAmount: Number(exec.net_amount ?? 0),
          currency: exec.currency,
          transactionCount: Number(exec.transaction_count ?? 0),
        });
      } catch {
        // logged upstream by the dispatcher; approval already succeeded
      }
    }
  }

  return { ok: true, result };
}
