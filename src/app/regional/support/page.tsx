"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, statusPillKind } from "@/components/regional/ui";
import { LifeBuoy, Loader2, Send } from "lucide-react";

interface InboxTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  customerType: string;
  transactionReference: string | null;
  createdAt: string;
  slaAtRisk: boolean;
}
interface MyEscalation {
  id: string;
  escalationNumber: string;
  destination: string;
  priority: string;
  status: string;
  reason: string;
  slaDueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  ticket: { number: string; subject: string; status: string; category: string } | null;
}

const DESTINATIONS = ["BANKING_OPS", "COMPLIANCE", "FRAUD_RISK", "ENGINEERING", "FINANCE", "SETTLEMENT", "MANAGEMENT"] as const;
const PRIORITIES = ["P0_CRITICAL", "P1", "P2", "P3"] as const;

export default function RegionalSupportPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [inbox, setInbox] = useState<InboxTicket[] | null>(null);
  const [mine, setMine] = useState<MyEscalation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [category, setCategory] = useState("COMPLAINT");
  const [destination, setDestination] = useState<string>("BANKING_OPS");
  const [priority, setPriority] = useState<string>("P2");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [aggregatorId, setAggregatorId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [txRef, setTxRef] = useState("");
  const [expected, setExpected] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await regionalApiFetch("/api/regional/escalations");
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "SUPPORT_FAILED");
      else {
        setInbox(json.data.inbox);
        setMine(json.data.myEscalations);
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    }
  }, []);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  const submit = async () => {
    if (subject.trim().length < 4 || description.trim().length < 10) {
      setError(t("support.form.description") + " (min)");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      /* Idempotency-Key: this browser+form instance — a double-click or a
         network retry files exactly one ticket. */
      const key = `rm-${manager?.id.slice(0, 8)}-${Date.now().toString(36)}`;
      const res = await regionalApiFetch("/api/regional/escalations/create", {
        method: "POST",
        headers: { "X-Idempotency-Key": key },
        body: JSON.stringify({
          category,
          destination,
          priority,
          subject: subject.trim(),
          description: description.trim(),
          aggregatorId: aggregatorId.trim() || null,
          agentId: agentId.trim() || null,
          transactionReference: txRef.trim() || null,
          expectedResolution: expected.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "ESCALATION_FAILED");
      } else {
        setNotice(
          json.data.alreadyFiled
            ? t("support.alreadyFiled", { ticket: json.data.ticketNumber })
            : t("support.filed", { ticket: json.data.ticketNumber, destination: t(`support.destinations.${json.data.destination ?? destination}`) }),
        );
        setFormOpen(false);
        setSubject("");
        setDescription("");
        setTxRef("");
        setExpected("");
        setAggregatorId("");
        setAgentId("");
        await load();
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    } finally {
      setSubmitting(false);
    }
  };

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("support.title")} subtitle={t("support.subtitle")} onRefresh={load}>
        <button onClick={() => setFormOpen((v) => !v)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-[var(--brand-on-primary,#052e2b)]">
          <Send className="w-3.5 h-3.5" />{t("support.newEscalation")}
        </button>
      </PageHeader>

      {error && <ErrorNote message={error} />}
      {notice && <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-primary)]/10 text-sm text-[var(--brand-primary)]">{notice}</div>}

      {formOpen && (
        <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--brand-border)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs font-semibold space-y-1.5">
              <span>{t("support.form.category")}</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm">
                {["COMPLAINT", "FAILED_TRANSACTION", "FRAUD_SECURITY", "KYC_TIER", "PENDING_TRANSACTION", "REFUND"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold space-y-1.5">
              <span>{t("support.form.destination")}</span>
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm">
                {DESTINATIONS.map((d) => <option key={d} value={d}>{t(`support.destinations.${d}`)}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold space-y-1.5">
              <span>{t("support.form.priority")}</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold space-y-1.5 block">
            <span>{t("support.form.subject")}</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" maxLength={160} />
          </label>
          <label className="text-xs font-semibold space-y-1.5 block">
            <span>{t("support.form.description")}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" maxLength={4000} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={aggregatorId} onChange={(e) => setAggregatorId(e.target.value)} placeholder={t("support.form.aggregator")} className="px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" />
            <input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder={t("support.form.agent")} className="px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" />
            <input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder={t("support.form.txRef")} className="px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" />
            <input value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={t("support.form.expected")} className="px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" />
          </div>
          <button onClick={() => void submit()} disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--brand-primary)] text-[var(--brand-on-primary,#052e2b)] disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? t("support.form.submitting") : t("support.form.submit")}
          </button>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("support.inbox")} · {inbox?.length ?? 0}</h2>
        {inbox === null && !error ? (
          <LoadingRows rows={3} />
        ) : inbox && inbox.length === 0 ? (
          <EmptyState icon={LifeBuoy} title={t("support.emptyInbox")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-semibold">{t("support.col.ticket")}</th>
                  <th className="px-4 py-3 font-semibold">{t("support.col.subject")}</th>
                  <th className="px-4 py-3 font-semibold">{t("support.form.category")}</th>
                  <th className="px-4 py-3 font-semibold">{t("support.col.priority")}</th>
                  <th className="px-4 py-3 font-semibold">{t("support.col.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("support.col.created")}</th>
                </tr>
              </thead>
              <tbody>
                {inbox!.map((tk) => (
                  <tr key={tk.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-mono text-xs">
                      {tk.ticketNumber}
                      {tk.slaAtRisk && <div className="mt-1"><Pill kind="bad">{t("support.slaAtRisk")}</Pill></div>}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[280px] truncate">{tk.subject}</td>
                    <td className="px-4 py-3 text-xs">{tk.category} · {tk.customerType}</td>
                    <td className="px-4 py-3"><Pill kind={tk.priority === "CRITICAL" || tk.priority === "URGENT" ? "bad" : "muted"}>{tk.priority}</Pill></td>
                    <td className="px-4 py-3"><Pill kind={statusPillKind(tk.status)}>{tk.status}</Pill></td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(tk.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("support.mine")} · {mine?.length ?? 0}</h2>
        {mine === null && !error ? (
          <LoadingRows rows={3} />
        ) : mine && mine.length === 0 ? (
          <EmptyState title={t("support.emptyMine")} />
        ) : (
          <div className="space-y-2">
            {mine!.map((e) => (
              <div key={e.id} className={`p-4 rounded-2xl bg-[var(--surface)] border ${e.resolvedAt ? "border-[var(--border)] opacity-75" : "border-[var(--brand-border)]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold">{e.escalationNumber}</span>
                      <Pill kind={e.status === "RESOLVED" ? "ok" : "info"}>{e.status}</Pill>
                      <Pill kind="muted">→ {t(`support.destinations.${e.destination}`)}</Pill>
                    </div>
                    <div className="text-xs mt-1">{e.reason}</div>
                    <div className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      {e.ticket ? `${e.ticket.number} · ${e.ticket.subject}` : ""} · {formatDate(e.createdAt)}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--foreground-muted)]">{e.priority}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
