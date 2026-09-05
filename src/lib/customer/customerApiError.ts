/**
 * KoriePay — API error normalisation for the customer portal.
 * ---------------------------------------------------------------------
 * One place turns every transport/backend failure into a small, typed,
 * customer-safe result. Two rules the whole portal depends on:
 *
 *   1. NEVER surface a raw backend message. Engine strings ("RLS policy
 *      violation on ledger_entries", "Coris connect ECONNREFUSED") are
 *      meaningless to a customer and leak topology. They stay in the console.
 *
 *   2. A FAILURE IS NOT AN EMPTY RESULT. `isDataAbsent === false` means "we do
 *      not know", and the screen must render "unable to load — try again", not
 *      "no transactions yet". This distinction is the difference between a
 *      calm customer and someone who thinks their money vanished.
 */

export type CustomerErrorKind =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "SERVER"
  | "UPSTREAM"
  | "TIMEOUT"
  | "NETWORK"
  | "OFFLINE"
  | "UNKNOWN";

export interface NormalizedCustomerError {
  kind: CustomerErrorKind;
  /** Customer-facing sentence. Safe to render verbatim. */
  message: string;
  /** Short action label, e.g. "Sign in again" / "Try again". */
  actionLabelKey: string;
  /** Whether the UI should offer a retry at all. */
  retryable: boolean;
  /** True when the customer's money/account is provably unaffected. */
  reassureFunds: boolean;
  /** True when the caller may treat the collection as legitimately empty. */
  isDataAbsent: boolean;
  /** Only for staff; never rendered. */
  debugCode?: string;
  status?: number;
  /** Field-level messages when the backend returned validation details. */
  fieldErrors?: { field?: string; code: string; message: string }[];
}

const TRANSLATED = {
  retry: "common.tryAgain",
  signIn: "common.sign_in_again",
  contact: "common.contact_support",
};

function build(
  kind: CustomerErrorKind,
  message: string,
  extra: Partial<NormalizedCustomerError> = {},
): NormalizedCustomerError {
  return {
    kind,
    message,
    actionLabelKey: TRANSLATED.retry,
    retryable: true,
    reassureFunds: true,
    isDataAbsent: false,
    ...extra,
  };
}

export function normalizeStatus(status: number, payload?: unknown): NormalizedCustomerError {
  const code =
    (payload as any)?.error?.code ?? (payload as any)?.code ?? undefined;
  const details = (payload as any)?.error?.details;
  const fieldErrors = Array.isArray(details)
    ? details.map((d: any) => ({
        field: d?.field,
        code: String(d?.code ?? "REJECTED"),
        message: String(d?.message ?? "Please check this field."),
      }))
    : undefined;

  switch (true) {
    case status === 401:
      return build("UNAUTHENTICATED", "Your session has expired. Sign in again to continue.", {
        actionLabelKey: TRANSLATED.signIn,
        retryable: false,
        reassureFunds: true,
        debugCode: code,
        status,
      });
    case status === 403:
      return build("FORBIDDEN", "You don't have access to that information on this account.", {
        actionLabelKey: TRANSLATED.contact,
        retryable: false,
        debugCode: code,
        status,
      });
    case status === 404:
      return build("NOT_FOUND", "We couldn't find what you were looking for.", {
        actionLabelKey: TRANSLATED.retry,
        isDataAbsent: true,
        debugCode: code,
        status,
      });
    case status === 409:
      return build("CONFLICT", "That action is already in progress. Please wait a moment.", {
        retryable: false,
        fieldErrors,
        debugCode: code,
        status,
      });
    case status === 422 || status === 400:
      return build("VALIDATION", "Some details need correcting.", {
        retryable: false,
        fieldErrors,
        debugCode: code,
        status,
      });
    case status === 429:
      return build("RATE_LIMITED", "Too many attempts. Please wait a few seconds and try again.", {
        retryable: true,
        debugCode: code,
        status,
      });
    case status === 502 || status === 503 || status === 504:
      return build("UPSTREAM", "Our banking service is briefly unavailable. Nothing has been lost.", {
        actionLabelKey: TRANSLATED.retry,
        debugCode: code,
        status,
      });
    default:
      return build("SERVER", "Something went wrong on our side. Your account and funds are not affected.", {
        debugCode: code,
        status,
      });
  }
}

/**
 * Map a thrown value (fetch rejection, AbortError, offline) to a normalized
 * error. Safe to call from any `catch`.
 */
export function normalizeThrown(error: unknown, isOffline = false): NormalizedCustomerError {
  if (isOffline) {
    return build("OFFLINE", "You appear to be offline. Reconnect and we'll load this again.", {
      reassureFunds: true,
    });
  }
  const name = (error as any)?.name;
  const message = String((error as any)?.message || "");
  if (name === "AbortError") {
    return build("TIMEOUT", "That took too long, so we stopped. Nothing was submitted.", {
      reassureFunds: true,
    });
  }
  if (/timeout|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(message)) {
    return build("TIMEOUT", "The connection timed out. We're checking whether it completed.", {
      reassureFunds: true,
    });
  }
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return build("NETWORK", "We couldn't reach KoriePay. Check your connection and try again.", {
      reassureFunds: true,
    });
  }
  return build("UNKNOWN", "We couldn't complete that right now. Your account and funds are not affected.", {
    reassureFunds: true,
  });
}

/**
 * Fetch + normalize in one step. Returns the parsed body on 2xx, otherwise a
 * `error` that is always safe to render.
 */
export async function safeFetch<T = any>(
  input: string,
  init: RequestInit & { token?: string } = {},
  opts: { timeoutMs?: number; isOffline?: boolean } = {},
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: NormalizedCustomerError }> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    const text = await res.text();
    let payload: unknown = undefined;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = undefined;
      }
    }
    if (res.ok) {
      const data = (payload as any)?.data ?? payload;
      return { ok: true, data: data as T, status: res.status };
    }
    // Log the raw status for staff debugging; never the body.
    if (typeof console !== "undefined") console.warn(`[koriepay] ${input} → ${res.status}`);
    return { ok: false, error: normalizeStatus(res.status, payload) };
  } catch (err) {
    return { ok: false, error: normalizeThrown(err, opts.isOffline) };
  } finally {
    clearTimeout(timer);
  }
}
