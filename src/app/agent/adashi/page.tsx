"use client";

// =============================================================================
// Agent Adashi operator console (bounded pass).
// -----------------------------------------------------------------------------
// Everything on this page loads through /api/agent/adashi (GET) and mutates
// through the same route (POST action dispatch). The BFF resolves the operator
// identity server-side and calls the canonical Adashi engines:
//   AdashiGroupLifecycleEngine   → create / lock / start
//   AdashiMembershipEngine       → invite / consent
//   AdashiRotationAllocationEngine → generateRotation (fairness + seed hash)
//   AdashiCycleObligationEngine  → collect (double-entry ledger posting)
//   AdashiPayoutEngine           → initiatePayout (maker-checker aware)
// The console only lists circles assigned to this agency in the marketplace
// (creator/assigned agent = operator alias). Member phone numbers and emails
// are masked; account identifiers are shown as last-4 fragments. No mock data
// lives on this page — every figure traces to store seeds + engine journals.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { getPortalBearer } from "@/lib/customerPortalClient";
import type {
  AdashiProduct,
  AdashiGroup,
  AdashiGroupMember,
  AdashiCycle,
  AdashiRotation,
  AdashiContributionObligation,
  AdashiPayout,
} from "@/types/adashiEngine";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentEmptyState,
  AgentChip,
  AgentStatCard,
  AgentFreshnessBar,
  AgentModal,
  type Tone,
} from "@/components/agent/ui/AgentUi";
import {
  Users,
  PiggyBank,
  HandCoins,
  ClipboardCheck,
  ShieldCheck,
  Plus,
  Lock,
  Shuffle,
  Play,
  UserPlus,
  CheckCircle2,
  EyeOff,
  Landmark,
} from "lucide-react";

/* ------------------------------------------------------------- wire helpers */

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
}

async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      headers: { Authorization: getPortalBearer(), Accept: "application/json" },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, message: (payload as any)?.error?.message || `Request failed (${res.status})` };
    }
    return { ok: true, status: res.status, data: (payload as any)?.data as T };
  } catch (err: any) {
    return { ok: false, status: 0, message: err?.message || "Network error" };
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: getPortalBearer(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, message: (payload as any)?.error?.message || `Request failed (${res.status})` };
    }
    return { ok: true, status: res.status, data: (payload as any)?.data as T };
  } catch (err: any) {
    return { ok: false, status: 0, message: err?.message || "Network error" };
  }
}

/* ------------------------------------------------------------- console types */

interface ConsoleGroup {
  group: AdashiGroup;
  members: AdashiGroupMember[];
  cycles: AdashiCycle[];
  rotations: AdashiRotation[];
  obligations: AdashiContributionObligation[];
  payouts: AdashiPayout[];
}

interface ConsoleData {
  products: AdashiProduct[];
  groups: ConsoleGroup[];
  stats: {
    groupCount: number;
    activeGroups: number;
    membersAcrossGroups: number;
    openCollections: number;
    paidThisCycle: number;
  };
  operator: { alias: string; name: string };
  scopeNote: string;
}

interface Notice {
  tone: "ok" | "err";
  text: string;
}

/* ------------------------------------------------------------- display utils */

function money(n: number | undefined | null, ccy?: string): string {
  const value = Number(n ?? 0);
  const symbol = ccy === "XOF" ? "CFA " : "₦";
  return `${symbol}${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function naira(n: number | undefined | null): string {
  return money(n, "NGN");
}

function maskedName(full: string | undefined): string {
  if (!full) return "—";
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return `${full.slice(0, 2)}…`;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function maskPhone(phone: string | undefined): string {
  if (!phone || phone.length < 6) return "—";
  return `${phone.slice(0, 4)} ••• ${phone.slice(-3)}`;
}

function maskEmail(email: string | undefined | null): string {
  if (!email) return "—";
  const at = email.indexOf("@");
  if (at <= 1) return "•••" + email.slice(at);
  return `${email[0]}••••${email.slice(at)}`;
}

function maskAccount(account: string | undefined): string {
  if (!account) return "—";
  return `${account.slice(0, 3)}••••${account.slice(-4)}`;
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ------------------------------------------------------------ status chips */

const groupTone: Record<string, Tone> = {
  DRAFT: "neutral",
  INVITING_MEMBERS: "sky",
  MEMBERSHIP_LOCKED: "amber",
  ROTATION_PUBLISHED: "sky",
  ACTIVE_IN_PROGRESS: "green",
  COMPLETED: "neutral",
  FROZEN: "red",
  CANCELLED: "red",
};
const memberTone: Record<string, Tone> = {
  INVITED: "sky",
  CONSENT_ACCEPTED: "amber",
  CONSENT_REJECTED: "red",
  ACTIVE: "green",
  DEFAULTED: "red",
  REPLACED: "neutral",
  COMPLETED: "neutral",
};
const obligationTone: Record<string, Tone> = {
  SCHEDULED: "sky",
  PENDING_AUTO_DEBIT: "amber",
  PAID: "green",
  FAILED: "red",
  GRACE_PERIOD: "amber",
  OVERDUE: "amber",
  DEFAULTED: "red",
  WAIVED: "neutral",
  UNKNOWN: "neutral",
};
const cycleTone: Record<string, Tone> = {
  SCHEDULED: "neutral",
  CONTRIBUTION_OPEN: "sky",
  COLLECTION_IN_PROGRESS: "amber",
  COLLECTION_COMPLETED: "sky",
  PAYOUT_PENDING_APPROVAL: "amber",
  PAYOUT_PROCESSING: "sky",
  PAYOUT_COMPLETED: "green",
  CLOSED: "neutral",
  DEFAULT_ARREARS: "red",
};
const payoutTone: Record<string, Tone> = {
  PENDING_AUTHORIZATION: "amber",
  AUTHORIZED: "sky",
  DISPATCHED_TO_SWITCH: "sky",
  COMPLETED: "green",
  FAILED: "red",
  REVERSED: "red",
};
const rotationTone: Record<string, Tone> = {
  PROPOSED: "amber",
  PUBLISHED: "green",
  AMENDED: "sky",
  SUPERSEDED: "neutral",
};

const toneByKind: Record<"group" | "member" | "obligation" | "cycle" | "payout" | "rotation", Record<string, Tone>> = {
  group: groupTone,
  member: memberTone,
  obligation: obligationTone,
  cycle: cycleTone,
  payout: payoutTone,
  rotation: rotationTone,
};

function chipLabel(status: string): string {
  const map: Record<string, string> = {
    INVITING_MEMBERS: "Inviting members",
    MEMBERSHIP_LOCKED: "Membership locked",
    ROTATION_PUBLISHED: "Rotation published",
    ACTIVE_IN_PROGRESS: "Active cycle",
    CONSENT_ACCEPTED: "Consent recorded",
    CONSENT_REJECTED: "Consent declined",
    PENDING_AUTO_DEBIT: "Auto-debit pending",
    GRACE_PERIOD: "Grace period",
    PAYOUT_PENDING_APPROVAL: "Payout pending approval",
    PAYOUT_PROCESSING: "Payout processing",
    DISPATCHED_TO_SWITCH: "Dispatched to switch",
  };
  return map[status] || status.replace(/_/g, " ");
}

function StatusChip({ kind, status }: { kind: "group" | "member" | "obligation" | "cycle" | "payout" | "rotation"; status: string }) {
  return <AgentChip label={chipLabel(status)} tone={toneByKind[kind][status] || "neutral"} />;
}

/* -------------------------------------------------------------------- page */

export default function AgentAdashiConsolePage() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<ConsoleData | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [confirmRotationFor, setConfirmRotationFor] = useState<string | null>(null);
  const [confirmStartFor, setConfirmStartFor] = useState<string | null>(null);
  const [collectFor, setCollectFor] = useState<AdashiContributionObligation | null>(null);
  const [payoutFor, setPayoutFor] = useState<AdashiCycle | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await apiGet<ConsoleData>("/api/agent/adashi");
    if (!res.ok || !res.data) {
      setErrorMessage(res.message || "Could not load the savings circles console.");
      setPhase("error");
      return;
    }
    setData(res.data);
    setRefreshedAt(new Date().toISOString());
    setPhase("ready");
    setErrorMessage("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (name: string, body: Record<string, unknown>) => {
    setBusy(name);
    setNotice(null);
    try {
      const res = await apiPost<Record<string, unknown>>("/api/agent/adashi", { action: name, ...body });
      if (!res.ok) {
        setNotice({ tone: "err", text: res.message || "The action could not be completed." });
        return false;
      }
      await load(true);
      return true;
    } finally {
      setBusy(null);
    }
  };

  if (phase === "loading" && !data) return <AgentPageSkeleton rows={4} />;
  if (phase === "error" && !data) {
    return <AgentErrorState title="We could not load the savings circles console" message={errorMessage} onRetry={() => void load()} />;
  }
  if (!data) return null;

  const { groups, stats, products } = data;

  /* ------- derived collections (per group) ------- */
  const ngProducts = products.filter((p) => p.status === "ACTIVE" && p.countryCode === "NG" && p.currency === "NGN");

  const stageHint = (g: ConsoleGroup): string => {
    const s = g.group.status;
    const open = g.members.filter((m) => m.status === "INVITED").length;
    if (s === "INVITING_MEMBERS") {
      const invites = `${g.members.length}/${g.group.targetMembers} invited`;
      if (g.members.length < g.group.targetMembers) return `${invites} — keep inviting until quorum is met.`;
      if (open > 0) return `${invites} — ${open} member(s) still need consent before the circle can operate.`;
      return `${invites} — quorum met, you can lock membership.`;
    }
    if (s === "MEMBERSHIP_LOCKED") return "Membership locked — publish a fair rotation order to proceed.";
    if (s === "ROTATION_PUBLISHED") return "Rotation published — you can start cycle one when members are ready.";
    if (s === "ACTIVE_IN_PROGRESS") return "Cycle active — collect contributions as members pay, then trigger the cycle payout.";
    if (s === "COMPLETED") return "Circle completed — all cycles paid out.";
    if (s === "FROZEN") return "Circle frozen by compliance — no actions are available.";
    return "No actions available in the current state.";
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Savings circles (Adashi)"
        subtitle="Operator console — create circles, manage members and consents, run fair rotations, collect contributions and initiate payouts. All actions run through the engine layer with your operator identity."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New circle
          </button>
        }
      />

      <AgentFreshnessBar
        refreshedAt={refreshedAt}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load(true).finally(() => setRefreshing(false));
        }}
      />

      {/* notice bar */}
      {notice ? (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-xs font-semibold shadow-sm ${
            notice.tone === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {/* KPIs */}
      <section aria-label="Console overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AgentStatCard label="Active circles" value={stats.groupCount} sub={`${stats.activeGroups} running or ready`} icon={<Users className="h-4 w-4" aria-hidden="true" />} accent="emerald" />
        <AgentStatCard label="Members managed" value={stats.membersAcrossGroups} sub="across your circles" icon={<PiggyBank className="h-4 w-4" aria-hidden="true" />} />
        <AgentStatCard label="Open collections" value={stats.openCollections} sub="contributions still due" icon={<HandCoins className="h-4 w-4" aria-hidden="true" />} accent="amber" />
        <AgentStatCard label="Collected today" value={stats.paidThisCycle} sub="cash collections posted to ledger" icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />} />
      </section>

      {/* Scope + privacy note */}
      <div className="flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-800 ring-1 ring-sky-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {data.scopeNote} Member phone numbers and emails are masked on this console, and account identifiers appear as
          fragments only. Contribution collections are posted as double-entry ledger journals; payouts at or above the
          product maker-checker threshold route to Super Admin dual control.
        </p>
      </div>

      {/* Products available to sell */}
      <section aria-labelledby="products-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 id="products-title" className="text-sm font-bold text-stone-900">
          Circle products you can sell
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ngProducts.map((p) => (
            <div key={p.id} className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
              <p className="text-xs font-bold text-stone-800">{p.productName}</p>
              <p className="mt-1 text-[11px] text-stone-500">
                {naira(p.contributionAmount)} / {p.cadence.replace("_", " ").toLowerCase()} · {p.minMembers}–{p.maxMembers} members
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                Agent earns {p.agentCommissionPercent}% of each payout · platform fee {p.platformFeePercent}%
              </p>
              {p.requiresMakerCheckerPayout ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                  Payouts ≥ {naira(p.payoutMakerCheckerThreshold)} need dual control
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Circles list */}
      <section aria-label="Your savings circles">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Circles assigned to your agency</h2>
          <p className="text-[11px] text-stone-400">{data.operator.name}</p>
        </div>

        {groups.length === 0 ? (
          <div className="mt-3">
            <AgentEmptyState
              title="No circles yet"
              body="Create a new circle from an active product to invite members and begin a rotation."
              icon={<PiggyBank className="h-8 w-8" aria-hidden="true" />}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {groups.map((g) => (
              <GroupCard
                key={g.group.id}
                g={g}
                busy={busy}
                onAction={runAction}
                notify={(tone, text) => setNotice({ tone, text })}
                onLock={async () => {
                  const ok = await runAction("lock", { adashiId: g.group.id });
                  if (ok) setNotice({ tone: "ok", text: "Membership locked — publish the fair rotation next." });
                }}
                onInvite={() => setInviteFor(g.group.id)}
                onRotation={() => setConfirmRotationFor(g.group.id)}
                onStart={() => setConfirmStartFor(g.group.id)}
                onCollect={(ob) => setCollectFor(ob)}
                onPayout={(cy) => setPayoutFor(cy)}
                stageHint={stageHint(g)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ modals */}
      <AgentModal open={createOpen} onClose={() => setCreateOpen(false)} labelledBy="create-circle-title">
        <CreateCircleForm
          products={ngProducts}
          busy={busy === "create"}
          onSubmit={async (productId, groupName, targetMembers) => {
            const ok = await runAction("create", { group: { productId, groupName, targetMembers } });
            if (ok) {
              setNotice({ tone: "ok", text: `Circle “${groupName}” created — invite members to begin.` });
              setCreateOpen(false);
            }
          }}
        />
      </AgentModal>

      <AgentModal open={inviteFor !== null} onClose={() => setInviteFor(null)} labelledBy="invite-member-title">
        <InviteMemberForm
          group={groups.find((g) => g.group.id === inviteFor)?.group}
          membersCount={groups.find((g) => g.group.id === inviteFor)?.members.length ?? 0}
          busy={busy === "invite"}
          onSubmit={async (customerName, customerPhone, kycTier) => {
            const ok = await runAction("invite", {
              adashiId: inviteFor,
              customerName,
              customerPhone,
              kycTier: Number(kycTier),
            });
            if (ok) {
              setNotice({ tone: "ok", text: `${customerName} invited — consent must be recorded before the circle locks.` });
              setInviteFor(null);
            }
          }}
        />
      </AgentModal>

      <ConfirmModal
        open={confirmRotationFor !== null}
        title="Publish rotation order?"
        body="The engine generates a deterministic, fairness-scored order from the member list and a seeded hash. Once published it cannot be changed — members see their payout position for the whole circle."
        confirmLabel="Generate rotation"
        tone="amber"
        icon={<Shuffle className="h-5 w-5" aria-hidden="true" />}
        busy={busy === "rotation"}
        onClose={() => setConfirmRotationFor(null)}
        onConfirm={async () => {
          const ok = await runAction("rotation", { adashiId: confirmRotationFor });
          if (ok) {
            setNotice({ tone: "ok", text: "Fair rotation order published — the circle can start when ready." });
            setConfirmRotationFor(null);
          }
        }}
      />

      <ConfirmModal
        open={confirmStartFor !== null}
        title="Start the circle?"
        body="Starting activates cycle one: contributions become due on the product cadence and collections begin."
        confirmLabel="Start circle"
        tone="green"
        icon={<Play className="h-5 w-5" aria-hidden="true" />}
        busy={busy === "start"}
        onClose={() => setConfirmStartFor(null)}
        onConfirm={async () => {
          const ok = await runAction("start", { adashiId: confirmStartFor });
          if (ok) {
            setNotice({ tone: "ok", text: "Circle started — cycle one is open for contributions." });
            setConfirmStartFor(null);
          }
        }}
      />

      <ConfirmModal
        open={collectFor !== null}
        title="Record cash collection?"
        body={
          collectFor
            ? `${collectFor.customerName || maskedName("Member")} · ${naira(collectFor.amount)} for cycle ${collectFor.cycleNumber}. The engine posts a double-entry journal (cash in transit → escrow pool) and marks the obligation paid.`
            : ""
        }
        confirmLabel={`Collect ${collectFor ? naira(collectFor.amount) : ""}`}
        tone="green"
        icon={<HandCoins className="h-5 w-5" aria-hidden="true" />}
        busy={busy === "collect"}
        onClose={() => setCollectFor(null)}
        onConfirm={async () => {
          if (!collectFor) return;
          const ok = await runAction("collect", {
            obligationId: collectFor.id,
            idempotencyKey: `agent-collect-${collectFor.id}`,
          });
          if (ok) {
            setNotice({ tone: "ok", text: "Collection recorded — journal posted and obligation marked paid." });
            setCollectFor(null);
          }
        }}
      />

      <ConfirmModal
        open={payoutFor !== null}
        title="Initiate cycle payout?"
        body={
          payoutFor
            ? `Cycle ${payoutFor.cycleNumber} pays ${naira(payoutFor.grossPayoutAmount)} to the position-# beneficiary. This creates a payout record for maker-checker processing.`
            : ""
        }
        confirmLabel="Initiate payout"
        tone="amber"
        icon={<Landmark className="h-5 w-5" aria-hidden="true" />}
        busy={busy === "payout"}
        onClose={() => setPayoutFor(null)}
        onConfirm={async () => {
          if (!payoutFor) return;
          const ok = await runAction("payout", { adashiId: payoutFor.adashiId, cycleId: payoutFor.id });
          if (ok) {
            const product = products.find((p) => p.id === data.groups.find((x) => x.group.id === payoutFor.adashiId)?.group.productId);
            const dual =
              product?.requiresMakerCheckerPayout && payoutFor.grossPayoutAmount >= (product?.payoutMakerCheckerThreshold ?? 500000);
            setNotice({
              tone: "ok",
              text: dual
                ? `Payout initiated — at ${naira(product?.payoutMakerCheckerThreshold)}+ it now waits for Super Admin dual control.`
                : "Payout initiated and processing.",
            });
            setPayoutFor(null);
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ group */

function GroupCard({
  g,
  busy,
  onAction,
  notify,
  onLock,
  onInvite,
  onRotation,
  onStart,
  onCollect,
  onPayout,
  stageHint,
}: {
  g: ConsoleGroup;
  busy: string | null;
  onAction: (name: string, body: Record<string, unknown>) => Promise<boolean>;
  notify: (tone: "ok" | "err", text: string) => void;
  onLock: () => Promise<void>;
  onInvite: () => void;
  onRotation: () => void;
  onStart: () => void;
  onCollect: (ob: AdashiContributionObligation) => void;
  onPayout: (cycle: AdashiCycle) => void;
  stageHint: string;
}) {
  const { group } = g;
  const status = group.status;
  const targetMet = g.members.length >= group.targetMembers;
  const consented = g.members.filter((m) => m.status === "CONSENT_ACCEPTED" || m.status === "ACTIVE").length;
  const rotation = g.rotations.find((r) => r.status === "PUBLISHED");
  const canCollect = (ob: AdashiContributionObligation) =>
    ob.status !== "PAID" &&
    ob.status !== "WAIVED" &&
    ob.status !== "DEFAULTED" &&
    !g.cycles.find((c) => c.id === ob.cycleId)?.status.includes("CLOSED") &&
    !g.cycles.find((c) => c.id === ob.cycleId)?.status.includes("PAYOUT_COMPLETED") &&
    !g.cycles.find((c) => c.id === ob.cycleId)?.status.includes("DEFAULT_ARREARS");
  const openObligations = g.obligations.filter(canCollect);
  const cyclePayoutReady = (cy: AdashiCycle) =>
    !g.payouts.some((p) => p.cycleId === cy.id) &&
    !["SCHEDULED", "PAYOUT_COMPLETED", "CLOSED", "DEFAULT_ARREARS"].includes(cy.status);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <PiggyBank className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">{group.groupName}</h3>
              <StatusChip kind="group" status={status} />
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-stone-400">
              {group.groupCode} · {group.productName} · {naira(group.contributionAmount)}/{group.cadence.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-stone-500">
            Members {g.members.length}/{group.targetMembers}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">Pool {naira(group.totalPoolVolume)}</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-500 ring-1 ring-stone-100">
        {stageHint}
      </p>

      {/* action rail for lifecycle states */}
      <div className="mt-3 flex flex-wrap gap-2">
        {status === "INVITING_MEMBERS" ? (
          <>
            <ActionBtn tone="emerald" icon={<UserPlus className="h-3.5 w-3.5" aria-hidden="true" />} disabled={busy !== null} onClick={onInvite}>
              Invite member
            </ActionBtn>
            <ActionBtn
              tone="stone"
              icon={<Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              disabled={!targetMet || busy !== null}
              title={targetMet ? undefined : `Quorum needs ${group.targetMembers} members`}
              onClick={() => void onLock()}
              busy={busy === "lock"}
            >
              {targetMet ? "Lock membership" : `Lock at quorum (${g.members.length}/${group.targetMembers})`}
            </ActionBtn>
          </>
        ) : null}

        {status === "MEMBERSHIP_LOCKED" ? (
          <ActionBtn tone="amber" icon={<Shuffle className="h-3.5 w-3.5" aria-hidden="true" />} disabled={busy !== null} onClick={onRotation} busy={busy === "rotation"}>
            Publish fair rotation
          </ActionBtn>
        ) : null}

        {status === "ROTATION_PUBLISHED" ? (
          <ActionBtn tone="emerald" icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />} disabled={busy !== null} onClick={onStart} busy={busy === "start"}>
            Start circle
          </ActionBtn>
        ) : null}
      </div>

      {/* members */}
      <div className="mt-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
          Members · {consented}/{g.members.length} consent recorded
        </h4>
        {g.members.length === 0 ? (
          <p className="mt-2 text-xs text-stone-400">No members invited yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100 overflow-hidden rounded-xl ring-1 ring-stone-100">
            {g.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 bg-stone-50/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-stone-800">{m.customerName}</p>
                    <StatusChip kind="member" status={m.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    {maskPhone(m.customerPhone)} · {maskEmail(m.customerEmail)} · KYC tier {m.kycTier}
                    {m.mandateAuthorized ? " · mandate authorised" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-stone-500">Paid {naira(m.totalContributedAmount)}</p>
                  {m.status === "INVITED" ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void (async () => {
                          const ok = await onAction("consent", { memberId: m.id });
                          if (ok) notify("ok", `Consent recorded for ${maskedName(m.customerName)} with mandate authorisation.`);
                        })()
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Record consent
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* rotation order */}
      {rotation && rotation.slots?.length ? (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
            <Shuffle className="h-3 w-3" aria-hidden="true" /> Rotation order · fairness {rotation.fairnessScore}
          </h4>
          <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {rotation.slots.map((s) => (
              <li key={s.position} className="rounded-lg bg-stone-50 px-2.5 py-2 ring-1 ring-stone-100">
                <p className="text-[10px] font-bold uppercase text-stone-400">Slot {s.position}</p>
                <p className="text-[11px] font-semibold text-stone-700">{maskedName(s.customerName)}</p>
                <p className="text-[10px] text-stone-400">{fmtDate(s.scheduledPayoutDate)}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* cycles, obligations & payouts for a live circle */}
      {status === "ACTIVE_IN_PROGRESS" ? (
        <div className="mt-4 space-y-4">
          {g.cycles
            .slice()
            .sort((a, b) => b.cycleNumber - a.cycleNumber)
            .map((cy) => {
              const cyObligations = g.obligations.filter((o) => o.cycleId === cy.id);
              const cyPayout = g.payouts.find((p) => p.cycleId === cy.id);
              const payable = cyObligations.filter(canCollect);
              const collected = cyObligations.filter((o) => o.status === "PAID").length;
              return (
                <div key={cy.id} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        Cycle {cy.cycleNumber} · beneficiary {maskedName(cy.beneficiaryName)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        Due {fmtDate(cy.cycleDueDate)} · collected {naira(cy.actualCollectedAmount)} of {naira(cy.expectedCollectionAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip kind="cycle" status={cy.status} />
                      {cyclePayoutReady(cy) ? (
                        <ActionBtn
                          tone="amber"
                          icon={<Landmark className="h-3.5 w-3.5" aria-hidden="true" />}
                          disabled={busy !== null}
                          onClick={() => onPayout(cy)}
                        >
                          Initiate payout
                        </ActionBtn>
                      ) : null}
                    </div>
                  </div>

                  {cyObligations.length > 0 ? (
                    <ul className="mt-2 divide-y divide-stone-100 overflow-hidden rounded-lg ring-1 ring-stone-100">
                      {cyObligations.map((ob) => (
                        <li key={ob.id} className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-stone-700">{ob.customerName || "Member"}</p>
                            <StatusChip kind="obligation" status={ob.status} />
                            <p className="text-[11px] text-stone-400">{naira(ob.amount)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ob.paidAt ? <p className="text-[10px] text-stone-400">paid {fmtDate(ob.paidAt)}</p> : null}
                            {canCollect(ob) ? (
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => onCollect(ob)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                              >
                                <HandCoins className="h-3 w-3" aria-hidden="true" /> Record cash collection
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-stone-400">
                      {collected} of {cyObligations.length} obligations paid this cycle.
                    </p>
                  )}

                  {cyPayout ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 ring-1 ring-stone-100">
                      <p className="text-[11px] font-semibold text-stone-700">
                        Payout {naira(cyPayout.netDisbursedAmount)} → {cyPayout.destinationType.replace(/_/g, " ")} {maskAccount(cyPayout.destinationAccountId)}
                      </p>
                      <StatusChip kind="payout" status={cyPayout.status} />
                      {cyPayout.paymentReference ? <p className="font-mono text-[10px] text-stone-400">{cyPayout.paymentReference}</p> : null}
                      {cyPayout.requiresMakerChecker && !cyPayout.checkerId ? (
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Waiting on Super Admin dual control</p>
                      ) : null}
                    </div>
                  ) : null}
                  {payable.length > 0 ? <p className="mt-1 text-[10px] text-stone-400">{payable.length} open obligation(s) in this cycle.</p> : null}
                </div>
              );
            })}
        </div>
      ) : null}

      {/* escrow/creation facts */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-stone-100 pt-3 text-[10px] text-stone-400">
        <span>Escrow vault {maskAccount(group.escrowVaultAccountId)}</span>
        <span>Created {fmtDate(group.createdAt)}</span>
        {group.lockedAt ? <span>Locked {fmtDate(group.lockedAt)}</span> : null}
        {group.startedAt ? <span>Started {fmtDate(group.startedAt)}</span> : null}
        <span>
          {group.privacyMode === "INITIALS_ONLY" ? (
            <span className="inline-flex items-center gap-1">
              <EyeOff className="h-3 w-3" aria-hidden="true" /> Members see initials only
            </span>
          ) : null}
        </span>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------- actions */

function ActionBtn({
  children,
  onClick,
  disabled,
  busy,
  icon,
  tone,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  tone: "emerald" | "amber" | "stone" | "rose";
  title?: string;
}) {
  const styles: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    stone: "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]}`}
    >
      {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

function InputField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{label}</span>
      {hint ? <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-stone-400">{hint}</span> : null}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

/* -------------------------------------------------------------- create form */

function CreateCircleForm({
  products,
  busy,
  onSubmit,
}: {
  products: AdashiProduct[];
  busy: boolean;
  onSubmit: (productId: string, groupName: string, targetMembers: number) => Promise<void>;
}) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [groupName, setGroupName] = useState("");
  const [targetMembers, setTargetMembers] = useState(products[0]?.minMembers || 2);
  const [err, setErr] = useState("");
  const product = products.find((p) => p.id === productId);

  const minM = product?.minMembers ?? 2;
  const maxM = product?.maxMembers ?? 12;

  const submit = async () => {
    setErr("");
    if (!groupName.trim()) return setErr("Give the circle a name.");
    if (!product) return setErr("Pick a product.");
    if (targetMembers < minM || targetMembers > maxM) return setErr(`This product allows ${minM}–${maxM} members.`);
    await onSubmit(product.id, groupName.trim(), targetMembers);
  };

  return (
    <div>
      <h3 id="create-circle-title" className="text-base font-bold text-stone-900">
        New savings circle
      </h3>
      <p className="mt-1 text-xs text-stone-500">The circle starts in “inviting members” state under the chosen product.</p>
      <div className="mt-4 space-y-3">
        <InputField label="Product" hint="NGN products only">
          <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName} · {naira(p.contributionAmount)}/{p.cadence.toLowerCase()}
              </option>
            ))}
          </select>
        </InputField>
        <InputField label="Circle name">
          <input className={inputCls} value={groupName} maxLength={60} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Umuahia Market Guild Ajo" />
        </InputField>
        <InputField label="Target members" hint={`product allows ${minM}–${maxM}`}>
          <input
            type="number"
            className={inputCls}
            min={minM}
            max={maxM}
            value={targetMembers}
            onChange={(e) => setTargetMembers(Number(e.target.value))}
          />
        </InputField>
        {product ? (
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11px] text-stone-500 ring-1 ring-stone-100">
            Pool at quorum ≈ <span className="font-bold text-stone-700">{naira(targetMembers * product.contributionAmount)}</span> per cycle ·
            cadence {product.cadence.toLowerCase()} · agent earns {product.agentCommissionPercent}% of each payout
          </p>
        ) : null}
        {err ? <p className="text-[11px] font-semibold text-rose-600">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
            {busy ? "Creating…" : "Create circle"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- invite form */

function InviteMemberForm({
  group,
  membersCount,
  busy,
  onSubmit,
}: {
  group?: AdashiGroup;
  membersCount: number;
  busy: boolean;
  onSubmit: (customerName: string, customerPhone: string, kycTier: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [kycTier, setKycTier] = useState(1);
  const [err, setErr] = useState("");

  if (!group) return null;
  const submit = async () => {
    setErr("");
    if (!name.trim()) return setErr("Member name is required.");
    if (phone.trim().length < 7) return setErr("Enter a valid phone number so payment reminders can reach the member.");
    await onSubmit(name.trim(), phone.trim(), kycTier);
  };

  return (
    <div>
      <h3 id="invite-member-title" className="text-base font-bold text-stone-900">
        Invite a member
      </h3>
      <p className="mt-1 text-xs text-stone-500">
        {group.groupName} · {membersCount}/{group.targetMembers} invited
      </p>
      <div className="mt-4 space-y-3">
        <InputField label="Full name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Member full name" />
        </InputField>
        <InputField label="Phone" hint="used for reminders and collection">
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" inputMode="tel" />
        </InputField>
        <InputField label="KYC tier">
          <select className={inputCls} value={kycTier} onChange={(e) => setKycTier(Number(e.target.value))}>
            <option value={1}>Tier 1 — BVN verified</option>
            <option value={2}>Tier 2 — ID + address</option>
            <option value={3}>Tier 3 — full due diligence</option>
          </select>
        </InputField>
        {err ? <p className="text-[11px] font-semibold text-rose-600">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
            {busy ? "Inviting…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- confirm modal */

function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
  icon,
  tone,
}: {
  open: boolean;
  title: string;
  body: string | React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  busy: boolean;
  icon: React.ReactNode;
  tone: "green" | "amber";
}) {
  const toneCls = tone === "green" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600";
  return (
    <AgentModal open={open} onClose={onClose} labelledBy="confirm-title">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${tone === "green" ? "bg-emerald-600" : "bg-amber-500"}`}>
          {icon}
        </span>
        <div>
          <h3 id="confirm-title" className="text-base font-bold text-stone-900">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">{body}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={() => void onConfirm()} disabled={busy} className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 ${toneCls}`}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </AgentModal>
  );
}
