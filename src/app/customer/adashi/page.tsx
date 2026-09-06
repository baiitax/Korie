// =============================================================================
// File: src/app/customer/adashi/page.tsx
// Description: Customer Adashi / Ajo hub — REBUILT for privacy + real money.
//
// What changed vs the previous page (see docs/customer-adashi-rebuild/01-audit-and-plan.md):
//  - The page no longer hard-codes a customer identity (cust-ng-101) or pays a
//    literal obligation id. Identity and ownership come from the authenticated
//    customer BFF (/api/customer/adashi/*), which derives the session customer
//    server-side and ignores anything the browser sends.
//  - The roster is private by default: other members arrive as initials +
//    slot + status. Full identity is shown only for self and the current
//    cycle's payout beneficiary. Circle-level privacy is controlled by the
//    creator and enforced server-side when view models are built.
//  - "Pay" now requires a 6-digit transaction PIN (verified server-side) and an
//    idempotency key, and executes a REAL wallet debit + double-entry journal —
//    funds insufficiency returns an honest FAILED state instead of a fake
//    success.
//  - Auto-debit runs only for mandate-authorized members via the due sweep;
//    when a wallet cannot cover an auto-collection the engine queues an email
//    reminder (real SMTP when configured, otherwise an honest demo outbox).
// =============================================================================

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCustomer } from "@/components/customer/CustomerContext";
import { portalFetch } from "@/lib/customerPortalClient";
import { formatMoney } from "@/lib/money";
import { CustomerCurrency } from "@/types/customer";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  CalendarClock,
  Lock,
  ChevronDown,
  AlertTriangle,
  Mail,
  Eye,
  EyeOff,
  RefreshCw,
  Fingerprint,
} from "lucide-react";

/* ------------------------------------------------------------------ types */

interface CircleRosterItem {
  position: number;
  memberId: string;
  isSelf: boolean;
  isCurrentBeneficiary: boolean;
  displayName: string;
  initials: string;
  avatarHue: number;
  memberStatus: string;
  mandateAuthorized?: boolean;
  externalParticipant: boolean;
}

interface CircleCycle {
  number: number;
  status: string;
  dueDate: string;
  graceDeadline: string;
  expectedCollectionAmount: number;
  actualCollectedAmount: number;
  beneficiary: CircleRosterItem | null;
}

interface MyObligation {
  id: string;
  cycleNumber: number;
  amount: number;
  currency: CustomerCurrency;
  status: string;
  dueDate: string;
  graceDeadline: string;
  paidAt?: string;
  paymentReference?: string;
  ledgerJournalId?: string;
  paymentMethod?: string;
  retryCount: number;
  errorMessage?: string;
}

interface CircleView {
  id: string;
  name: string;
  currency: CustomerCurrency;
  country: "NG" | "NE";
  cadence: string;
  contributionAmount: number;
  status: string;
  privacyMode: "INITIALS_ONLY" | "MEMBERS_ONLY";
  isCreator: boolean;
  currentCycleNumber: number;
  totalCycles: number;
  membershipCount: number;
  myPosition: number;
  cycle: CircleCycle | null;
  myObligation: MyObligation | null;
  myMember: { mandateAuthorized: boolean; totalContributedAmount: number; totalPayoutReceived: number };
  roster: CircleRosterItem[];
  rotation: { position: number; cycleNumber: number; scheduledPayoutDate: string }[];
}

interface ReminderView {
  id: string;
  templateId: string;
  subject: string;
  bodyText: string;
  status: "QUEUED" | "SENDING" | "SENT" | "FAILED";
  transportMode: "SMTP" | "DEMO_OUTBOX";
  readAt: string | null;
  createdAt: string;
}

interface SweepEventView {
  type: "AUTO_DEBIT_SUCCESS" | "AUTO_DEBIT_INSUFFICIENT_FUNDS" | "OVERDUE_FLAGGED";
  adashiId: string;
  obligationId: string;
  amount: number;
  currency: CustomerCurrency;
  message: string;
  payment?: { ledgerJournalId: string; paymentReference: string; paidAt: string; method: string };
  reminderId?: string;
}

interface CirclesPayload {
  circles: CircleView[];
  sweepEvents: SweepEventView[];
  reminders: ReminderView[];
  outbox: { transportConfigured: boolean; mode: "SMTP" | "DEMO_OUTBOX"; note: string };
}

type LoadPhase = "idle" | "loading" | "ready" | "error";

const DEMO_DEFAULT_PIN = "123456";

function fmt(amount: number, currency: CustomerCurrency): string {
  return formatMoney(amount, currency);
}

function dateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function dueCopy(t: (k: string, p?: Record<string, string | number>) => string, iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return t("customer.adashi.overdueSinceShort", { date: dateLabel(iso) });
  if (d === 0) return t("customer.adashi.dueToday");
  return t("customer.adashi.dueInDays", { days: d });
}

/* ------------------------------------------------------------ status labels */

const STATUS_LABEL_PREFIX = "customer.adashi.statusLabels.";
const CYCLE_STATUS_LABEL_PREFIX = "customer.adashi.cycleStatusLabels.";
const MEMBER_STATUS_LABEL_PREFIX = "customer.adashi.memberStatusLabels.";

/** translate() returns the key when missing — fall back to the raw value. */
function tl(t: (k: string, p?: Record<string, string | number>) => string, key: string, fallback: string, params?: Record<string, string | number>): string {
  const v = t(key, params);
  return v && v !== key ? v : fallback;
}

function statusTone(status: string): "green" | "red" | "amber" | "neutral" {
  if (status === "PAID") return "green";
  if (status === "FAILED" || status === "DEFAULTED" || status === "OVERDUE") return "red";
  if (status === "PENDING_AUTO_DEBIT" || status === "GRACE_PERIOD") return "amber";
  return "neutral";
}

const STATUS_CHIP: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  neutral: "bg-stone-100 text-stone-600 ring-stone-200",
};

const AVATAR_TONES = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

function avatarTone(hue: number): string {
  return AVATAR_TONES[hue % AVATAR_TONES.length];
}

/* ------------------------------------------------------------ small bits */

function StatusChip({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_CHIP[tone]}`}
    >
      {label}
    </span>
  );
}

function Avatar({ initials, tone, name }: { initials: string; tone: string; name: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}
    >
      {initials}
    </span>
  );
}

/* ================================================================== page */

export default function CustomerAdashiHub() {
  const { t, wallets } = useCustomer();
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [payload, setPayload] = useState<CirclesPayload | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyMandate, setBusyMandate] = useState<string | null>(null);
  const [busyPrivacy, setBusyPrivacy] = useState<string | null>(null);
  const [payingObligation, setPayingObligation] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [pinCircle, setPinCircle] = useState<CircleView | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState<string>("");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [lastEvents, setLastEvents] = useState<SweepEventView[]>([]);

  const focusRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setPhase((p) => (p === "ready" ? p : "loading"));
      try {
        const res = await portalFetch("/api/customer/adashi/circles", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const code = body?.error?.code || "ADASHI_LOAD_FAILED";
          const message =
            body?.error?.message ||
            (code === "UNAUTHORIZED_MISSING_TOKEN" || code === "UNAUTHENTICATED"
              ? t("customer.adashi.circlesErrorTitle")
              : t("customer.adashi.circlesErrorTitle"));
          throw new Error(message);
        }
        const data = body?.data as CirclesPayload;
        setPayload(data);
        if (data.sweepEvents && data.sweepEvents.length > 0) {
          setLastEvents(data.sweepEvents);
        }
        setPhase("ready");
        setErrorMessage("");
      } catch (err: any) {
        setErrorMessage(err?.message || t("customer.adashi.circlesErrorTitle"));
        setPhase("error");
      }
    },
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const circleById = useMemo(() => {
    const map = new Map<string, CircleView>();
    (payload?.circles || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [payload]);

  const toggleCircle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const walletFor = (currency: CustomerCurrency) =>
    wallets.find((w) => w.currency === currency);

  const contributedByCurrency = useMemo(() => {
    const map = new Map<CustomerCurrency, number>();
    (payload?.circles || []).forEach((c) => {
      const amount = c.myMember?.totalContributedAmount || 0;
      if (amount > 0) map.set(c.currency, (map.get(c.currency) || 0) + amount);
    });
    return map;
  }, [payload]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    window.setTimeout(() => setActionNotice(null), 6000);
  };

  /* --------------------------------------------------------- actions */

  const toggleMandate = async (circle: CircleView, next: boolean) => {
    if (busyMandate) return;
    setBusyMandate(circle.id);
    try {
      const res = await portalFetch(`/api/customer/adashi/circles/${circle.id}/mandate`, {
        method: "POST",
        body: JSON.stringify({ authorize: next }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || "Mandate update failed");
      }
      showNotice(next ? t("customer.adashi.mandateAuthorized") : t("customer.adashi.mandateRevoked"));
      await load(true);
    } catch (err: any) {
      showNotice(err.message);
    } finally {
      setBusyMandate(null);
    }
  };

  const setPrivacy = async (circle: CircleView, mode: "INITIALS_ONLY" | "MEMBERS_ONLY") => {
    if (busyPrivacy) return;
    setBusyPrivacy(circle.id);
    try {
      const res = await portalFetch(`/api/customer/adashi/circles/${circle.id}/privacy`, {
        method: "PUT",
        body: JSON.stringify({ privacyMode: mode }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || "Privacy update failed");
      }
      showNotice(t("customer.adashi.privacySaved"));
      await load(true);
    } catch (err: any) {
      showNotice(err.message);
    } finally {
      setBusyPrivacy(null);
    }
  };

  const openPinModal = (circle: CircleView) => {
    setPinCircle(circle);
    setPinValue("");
    setPinError("");
  };

  const closePinModal = () => {
    setPinCircle(null);
    setPinValue("");
    setPinError("");
    setPinSubmitting(false);
    focusRef.current?.focus();
  };

  const submitPinPayment = async () => {
    const circle = pinCircle;
    if (!circle || !circle.myObligation) return;
    if (!/^\d{6}$/.test(pinValue)) {
      setPinError(t("customer.adashi.pinLabel"));
      return;
    }
    setPinSubmitting(true);
    setPinError("");
    try {
      const res = await portalFetch("/api/customer/adashi/pay", {
        method: "POST",
        body: JSON.stringify({
          obligationId: circle.myObligation.id,
          pin: pinValue,
          idempotencyKey: `pay-${circle.id}-${circle.myObligation.id}-${Date.now()}`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const code = body?.error?.code || "";
        const serverMessage = body?.error?.message || "";
        if (code === "WRONG_PIN" || code === "PIN_LOCKED") {
          setPinError(serverMessage);
          setPinSubmitting(false);
          return;
        }
        throw new Error(serverMessage || code || t("customer.adashi.payFailed"));
      }
      setPinCircle(null);
      setPinSubmitting(false);
      setPinValue("");
      showNotice(t("customer.adashi.paySuccess"));
      await load(true);
    } catch (err: any) {
      setPinError(err?.message || t("customer.adashi.payFailed"));
      setPinSubmitting(false);
    }
  };

  const markReminderRead = async (id: string) => {
    try {
      await portalFetch(`/api/customer/adashi/reminders/${id}/read`, { method: "POST" });
      await load(true);
    } catch {
      /* cosmetic action — ignore */
    }
  };

  /* --------------------------------------------------------- render bits */

  const renderObligationAction = (circle: CircleView) => {
    const o = circle.myObligation;
    if (!o) return null;
    const payable =
      o.status === "SCHEDULED" ||
      o.status === "PENDING_AUTO_DEBIT" ||
      o.status === "FAILED" ||
      o.status === "GRACE_PERIOD" ||
      o.status === "OVERDUE";

    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("customer.adashi.myContribution")} · {t("customer.adashi.cycleNumberLabel", { cycle: o.cycleNumber })}
            </p>
            <p className="mt-1 text-lg font-bold text-stone-900">{fmt(o.amount, o.currency)}</p>
            <p className="text-xs text-stone-500">
              {o.status === "PAID"
                ? t("customer.adashi.paidOnShort", { date: dateLabel(o.paidAt || o.dueDate) })
                : dueCopy(t, o.dueDate)}
            </p>
          </div>
          <StatusChip
            label={tl(t, STATUS_LABEL_PREFIX + o.status, o.status)}
            tone={statusTone(o.status)}
          />
        </div>

        {o.errorMessage && o.status === "FAILED" ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">{t("customer.adashi.failureReasonLabel")}: </span>
              {o.errorMessage}
            </span>
          </p>
        ) : null}

        {(o.status === "PAID" || o.status === "WAIVED") && o.paymentReference ? (
          <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-stone-500 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-stone-400">{t("customer.adashi.referenceLabel")}</dt>
              <dd className="truncate font-mono" title={o.paymentReference}>
                {o.paymentReference}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-400">{t("customer.adashi.ledgerIdLabel")}</dt>
              <dd className="truncate font-mono" title={o.ledgerJournalId}>
                {o.ledgerJournalId || "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        {payable ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openPinModal(circle)}
              disabled={payingObligation === o.id}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Fingerprint aria-hidden="true" className="h-4 w-4" />
              {payingObligation === o.id
                ? t("customer.adashi.paying")
                : o.status === "FAILED"
                  ? t("customer.adashi.retryWithPin")
                  : t("customer.adashi.payWithPin")}
            </button>
            {circle.myMember.mandateAuthorized && (
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
                {t("customer.adashi.mandateOnDesc")}
              </span>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderCircle = (circle: CircleView) => {
    const isOpen = expanded.has(circle.id);
    const cycle = circle.cycle;
    const ob = circle.myObligation;
    const currencyWallet = walletFor(circle.currency);
    const showNames = circle.privacyMode === "MEMBERS_ONLY";

    return (
      <section
        key={circle.id}
        aria-label={t("customer.adashi.circleMetaAria", {
          name: circle.name,
          members: circle.membershipCount,
          amount: fmt(circle.contributionAmount, circle.currency),
        })}
        className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
      >
        <h3 className="sr-only">{circle.name}</h3>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleCircle(circle.id)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:px-5"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                {circle.currency}
              </span>
              <h4 className="truncate text-base font-bold text-stone-900">{circle.name}</h4>
              {circle.isCreator && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
                  {t("customer.adashi.creatorChip", {})}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {t("customer.adashi.cycleProgress", {
                current: circle.currentCycleNumber,
                total: circle.totalCycles,
              })}{" "}
              · {t("customer.adashi.memberCount", { count: circle.membershipCount })} ·{" "}
              {t("customer.adashi.contributionAmount", {
                amount: fmt(circle.contributionAmount, circle.currency),
                cadence: t(`customer.adashi.cadenceLabels.${circle.cadence}`),
              })}{" "}
              · {t("customer.adashi.yourPosition", { position: circle.myPosition })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ob && ob.status === "PAID" ? (
              <StatusChip label={t("customer.adashi.statusLabels.PAID")} tone="green" />
            ) : ob && ob.status === "FAILED" ? (
              <StatusChip label={t("customer.adashi.statusLabels.FAILED")} tone="red" />
            ) : ob && ob.status === "OVERDUE" ? (
              <StatusChip label={t("customer.adashi.statusLabels.OVERDUE")} tone="red" />
            ) : (
              <StatusChip label={tl(t, CYCLE_STATUS_LABEL_PREFIX + (cycle?.status || ""), cycle?.status || "")} tone="amber" />
            )}
            <ChevronDown
              aria-hidden="true"
              className={`h-5 w-5 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {isOpen ? (
          <div className="border-t border-stone-100 px-4 py-4 sm:px-5">
            {/* Beneficiary of the current cycle */}
            {cycle?.beneficiary ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                <Avatar
                  initials={cycle.beneficiary.initials}
                  tone={avatarTone(cycle.beneficiary.avatarHue)}
                  name={cycle.beneficiary.displayName}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    {t("customer.adashi.beneficiaryTitle")}
                  </p>
                  <p className="truncate text-sm font-bold text-emerald-900">
                    {cycle.beneficiary.displayName}
                    {cycle.beneficiary.isSelf ? ` (${t("customer.adashi.rosterYou")})` : ""}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {t("customer.adashi.beneficiaryNote")}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left: my obligation + mandate + privacy */}
              <div className="space-y-3">
                {renderObligationAction(circle)}

                {/* Mandate (self) */}
                <div className="rounded-xl border border-stone-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {t("customer.adashi.mandateLabel")}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {circle.myMember.mandateAuthorized
                          ? t("customer.adashi.mandateOnDesc")
                          : t("customer.adashi.mandateOffDesc")}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={circle.myMember.mandateAuthorized}
                      aria-label={t("customer.adashi.mandateAria", { circle: circle.name })}
                      disabled={busyMandate === circle.id}
                      onClick={() => toggleMandate(circle, !circle.myMember.mandateAuthorized)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
                        circle.myMember.mandateAuthorized ? "bg-emerald-600" : "bg-stone-300"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                          circle.myMember.mandateAuthorized ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Privacy (creator only) */}
                {circle.isCreator ? (
                  <fieldset className="rounded-xl border border-stone-200 p-4">
                    <legend className="px-1 text-sm font-semibold text-stone-900">
                      <span className="inline-flex items-center gap-1.5">
                        {showNames ? (
                          <Eye aria-hidden="true" className="h-4 w-4 text-stone-500" />
                        ) : (
                          <EyeOff aria-hidden="true" className="h-4 w-4 text-stone-500" />
                        )}
                        {t("customer.adashi.privacyTitle")}
                      </span>
                    </legend>
                    <p className="mt-1 text-xs text-stone-500">{t("customer.adashi.rosterHiddenNote")}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {(["INITIALS_ONLY", "MEMBERS_ONLY"] as const).map((mode) => {
                        const active = circle.privacyMode === mode;
                        const label =
                          mode === "INITIALS_ONLY"
                            ? t("customer.adashi.privacyInitialsLabel")
                            : t("customer.adashi.privacyMembersLabel");
                        const desc =
                          mode === "INITIALS_ONLY"
                            ? t("customer.adashi.privacyInitialsDesc")
                            : t("customer.adashi.privacyMembersDesc");
                        return (
                          <label
                            key={mode}
                            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 transition ${
                              active
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-stone-200 bg-white hover:border-stone-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`privacy-${circle.id}`}
                              className="sr-only"
                              checked={active}
                              disabled={busyPrivacy === circle.id}
                              onChange={() => setPrivacy(circle, mode)}
                            />
                            <span className="block text-xs font-semibold text-stone-800">{label}</span>
                            <span className="block text-[11px] text-stone-500">{desc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                {/* Wallet available for this currency */}
                {currencyWallet ? (
                  <p className="px-1 text-[11px] text-stone-400">
                    {t("customer.adashi.walletBalanceNote", {
                      currency: circle.currency,
                      balance: fmt(currencyWallet.availableBalance, circle.currency),
                    })}
                  </p>
                ) : null}
              </div>

              {/* Right: roster + rotation */}
              <div className="space-y-3">
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-stone-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Users aria-hidden="true" className="h-4 w-4 text-stone-500" />
                      {t("customer.adashi.rosterTitle")}
                    </span>
                  </p>
                  <ul className="mt-3 space-y-1.5" aria-label={t("customer.adashi.rosterCountAria", { count: circle.membershipCount, name: circle.name })}>
                    {circle.roster.map((m) => {
                      const showName = m.isSelf || m.isCurrentBeneficiary || showNames;
                      return (
                        <li
                          key={m.memberId}
                          aria-label={t("customer.adashi.rosterAria", {
                            position: m.position,
                            name: m.isSelf ? `${m.displayName} (${t("customer.adashi.rosterYou")})` : m.displayName,
                            status: tl(t, MEMBER_STATUS_LABEL_PREFIX + m.memberStatus, m.memberStatus),
                          })}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50"
                        >
                          <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-stone-400">
                            {m.position}
                          </span>
                          <Avatar initials={m.initials} tone={avatarTone(m.avatarHue)} name={m.displayName} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-stone-800">
                                {showName ? m.displayName : m.initials}
                              </span>
                              {m.isSelf ? (
                                <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                                  {t("customer.adashi.rosterYou")}
                                </span>
                              ) : null}
                              {m.isCurrentBeneficiary ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  {t("customer.adashi.rosterBeneficiaryChip")}
                                </span>
                              ) : null}
                              {m.externalParticipant && !m.isSelf ? (
                                <span className="hidden rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500 sm:inline">
                                  {t("customer.adashi.rosterExternalChip")}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              m.memberStatus === "ACTIVE"
                                ? "bg-emerald-500"
                                : m.memberStatus === "DEFAULTED" || m.memberStatus === "CONSENT_REJECTED"
                                  ? "bg-rose-400"
                                  : "bg-amber-400"
                            }`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Rotation */}
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-stone-900">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock aria-hidden="true" className="h-4 w-4 text-stone-500" />
                      {t("customer.adashi.rotationTitle", {})}
                    </span>
                  </p>
                  <ol className="mt-3 space-y-1">
                    {circle.rotation.map((slot) => {
                      const isMine = slot.position === circle.myPosition;
                      const isCurrent = slot.cycleNumber === circle.currentCycleNumber;
                      return (
                        <li key={`${slot.position}-${slot.cycleNumber}`} className="flex items-center gap-2 text-xs">
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCurrent ? "bg-emerald-500" : isMine ? "bg-stone-900" : "bg-stone-200"
                            }`}
                          />
                          <span className="text-stone-400">#{slot.position}</span>
                          <span className="font-medium text-stone-600">
                            {isMine
                              ? t("customer.adashi.rotationMineLabel", {})
                              : t("customer.adashi.rotationCycleLabel", { cycle: slot.cycleNumber })}
                          </span>
                          <span className="ml-auto tabular-nums text-stone-400">
                            {dateLabel(slot.scheduledPayoutDate)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  /* --------------------------------------------------------- page states */

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6" role="status" aria-live="polite">
        <div className="space-y-4">
          <SkeletonBlock className="h-8 w-2/3" />
          <SkeletonBlock className="h-4 w-1/2" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <SkeletonBlock className="h-5 w-1/2" />
              <SkeletonBlock className="mt-3 h-3 w-3/4" />
              <SkeletonBlock className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
        <p className="sr-only">{t("customer.adashi.loadingCircles")}</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6"
        >
          <XCircle aria-hidden="true" className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-semibold text-rose-800">{errorMessage}</p>
          <button
            type="button"
            onClick={() => load(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {t("customer.adashi.circlesRetry")}
          </button>
        </div>
      </div>
    );
  }

  const circles = payload?.circles || [];
  if (circles.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <ShieldCheck aria-hidden="true" className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-4 text-sm font-semibold text-stone-800">{t("customer.adashi.circlesEmptyTitle")}</p>
          <p className="mt-1 text-xs text-stone-500">{t("customer.adashi.circlesEmptyBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">{t("customer.adashi.title")}</h1>
          <p className="mt-1 max-w-xl text-xs text-stone-500 sm:text-sm">{t("customer.adashi.subtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />
          {t("customer.adashi.escrowVault")}
        </span>
      </div>

      {/* summary strip */}
      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            {t("customer.adashi.myActiveCircles", {})}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-stone-900">{circles.length}</dd>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            {t("customer.adashi.totalContributedLabel")}
          </dt>
          <dd className="mt-1 space-y-0.5">
            {contributedByCurrency.size === 0 ? (
              <span className="text-2xl font-bold text-stone-900">—</span>
            ) : (
              Array.from(contributedByCurrency.entries()).map(([cur, amount]) => (
                <p key={cur} className="text-lg font-bold text-stone-900">
                  {fmt(amount, cur)}
                </p>
              ))
            )}
          </dd>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            {t("customer.adashi.openContributionsLabel", {})}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-stone-900">
            {circles.filter((c) => c.myObligation && c.myObligation.status !== "PAID").length}
          </dd>
        </div>
      </dl>

      {/* action notice */}
      {actionNotice ? (
        <div role="status" aria-live="polite" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {actionNotice}
        </div>
      ) : null}

      {/* sweep events from the auto-collection sweep */}
      {lastEvents.length > 0 ? (
        <section aria-label={t("customer.adashi.activityTitle")} className="mt-5 space-y-2">
          {lastEvents.map((ev, idx) => (
            <div
              key={`${ev.obligationId}-${idx}`}
              className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs ring-1 ${
                ev.type === "AUTO_DEBIT_SUCCESS"
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : ev.type === "OVERDUE_FLAGGED"
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-rose-50 text-rose-800 ring-rose-200"
              }`}
            >
              {ev.type === "AUTO_DEBIT_SUCCESS" ? (
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              ) : ev.type === "OVERDUE_FLAGGED" ? (
                <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                {ev.type === "AUTO_DEBIT_SUCCESS"
                  ? t("customer.adashi.sweepSuccessBanner", {
                      amount: fmt(ev.amount, ev.currency),
                      currency: ev.currency,
                    })
                  : ev.type === "AUTO_DEBIT_INSUFFICIENT_FUNDS"
                    ? t("customer.adashi.sweepFailedBanner", {
                        amount: fmt(ev.amount, ev.currency),
                        currency: ev.currency,
                      })
                    : t("customer.adashi.sweepOverdueBanner")}
                {ev.payment ? (
                  <p className="mt-1 font-mono text-[10px] opacity-75">
                    {ev.payment.paymentReference}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setLastEvents((prev) => prev.filter((_, i) => i !== idx))}
                className="ml-auto shrink-0 rounded p-1 text-current hover:bg-black/5"
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {/* circles */}
      <div className="mt-5 space-y-4">
        <h2 className="sr-only">{t("customer.adashi.myCirclesTitle")}</h2>
        {circles.map(renderCircle)}
      </div>

      {/* email reminders outbox */}
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="reminders-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="reminders-heading" className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <Mail aria-hidden="true" className="h-4 w-4 text-stone-400" />
            {t("customer.adashi.remindersTitle")}
            {payload && payload.reminders.length > 0 ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                {payload.reminders.length}
              </span>
            ) : null}
          </h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${
              payload?.outbox.transportConfigured
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"
            }`}
          >
            {payload?.outbox.transportConfigured
              ? t("customer.adashi.reminderSmtpMode")
              : t("customer.adashi.reminderDemoMode")}
          </span>
        </div>

        {payload && payload.reminders.length === 0 ? (
          <p className="mt-3 text-xs text-stone-500">{t("customer.adashi.remindersEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(payload?.reminders || []).map((r) => (
              <li key={r.id} className="rounded-xl border border-stone-100 bg-stone-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-800">{r.subject}</p>
                    <p className="mt-0.5 text-[10px] text-stone-400">
                      {dateLabel(r.createdAt)} · {t("customer.adashi.reminderBodyLabel")}:
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip
                      label={
                        r.status === "SENT"
                          ? t("customer.adashi.reminderStatusSent")
                          : r.status === "FAILED"
                            ? t("customer.adashi.reminderStatusFailed")
                            : t("customer.adashi.reminderStatusQueued")
                      }
                      tone={r.status === "SENT" ? "green" : r.status === "FAILED" ? "red" : "amber"}
                    />
                    {r.readAt ? (
                      <span className="text-[10px] font-semibold text-stone-400">
                        {t("customer.adashi.reminderRead")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markReminderRead(r.id)}
                        className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {t("customer.adashi.markRead")}
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-stone-600">
                  {r.bodyText}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PIN modal */}
      {pinCircle ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePinModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-modal-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 id="pin-modal-title" className="text-base font-bold text-stone-900">
              {t("customer.adashi.payModalTitle")}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {t("customer.adashi.payModalBody", {
                amount: fmt(pinCircle.myObligation?.amount || 0, pinCircle.currency),
                circle: pinCircle.name,
                cycle: pinCircle.currentCycleNumber,
              })}
            </p>
            {walletFor(pinCircle.currency) ? (
              <p className="mt-2 text-[11px] text-stone-400">
                {t("customer.adashi.walletBalanceNote", {
                  currency: pinCircle.currency,
                  balance: fmt(walletFor(pinCircle.currency)!.availableBalance, pinCircle.currency),
                })}
              </p>
            ) : null}
            <label htmlFor="pin-input" className="mt-4 block text-xs font-semibold text-stone-700">
              {t("customer.adashi.pinLabel")}
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitPinPayment();
                if (e.key === "Escape") closePinModal();
              }}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-center text-2xl font-bold tracking-[0.5em] text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-describedby="pin-error pin-hint"
              placeholder="••••••"
            />
            {pinError ? (
              <p id="pin-error" role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {pinError}
              </p>
            ) : null}
            <p id="pin-hint" className="mt-2 text-[10px] leading-relaxed text-stone-400">
              {t("customer.adashi.pinDemoHint", { pin: DEMO_DEFAULT_PIN })}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closePinModal}
                disabled={pinSubmitting}
                className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-60"
              >
                {t("customer.adashi.payCancelButton")}
              </button>
              <button
                type="button"
                onClick={() => void submitPinPayment()}
                disabled={pinSubmitting || pinValue.length !== 6}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pinSubmitting
                  ? t("customer.adashi.paying")
                  : t("customer.adashi.payConfirmButton", {
                      amount: fmt(pinCircle.myObligation?.amount || 0, pinCircle.currency),
                    })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-stone-100 ${className}`} />;
}
