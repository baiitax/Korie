"use client";

// =============================================================================
// File: src/app/support/tasks/page.tsx
// Description: Tasks (spec §37) — My / Team / Overdue / Completed views,
// plus creation and status updates.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, Modal, OfflineBanner, PriorityBadge, Spinner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, supportErrorMessage, SupportTaskDto } from "@/services/supportOpsClient";

type View = "mine" | "team" | "overdue" | "completed";

export default function TasksPage() {
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const [view, setView] = useState<View>("mine");
  const [rows, setRows] = useState<SupportTaskDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.tasks({}, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (view === "mine") return rows.filter((x) => x.assignedToId === activeOfficer?.id && x.status !== "DONE");
    if (view === "team") return rows.filter((x) => x.status !== "DONE");
    if (view === "overdue") return rows.filter((x) => x.overdue);
    return rows.filter((x) => x.status === "DONE");
  }, [rows, view, activeOfficer?.id]);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    const res = await supportOps.updateTask(id, { status }, activeOfficer?.id);
    setBusyId(null);
    if (isSupportApiError(res)) {
      toast(supportErrorMessage(res), "error");
      return;
    }
    toast(status === "DONE" ? t("supportOps.toasts.taskDone") : t("supportOps.toasts.statusChanged", { status: t(`supportOps.tasks.statusLabels.${status}`) ?? status }));
    void load();
  };

  const views: { key: View; label: string }[] = [
    { key: "mine", label: t("supportOps.tasks.mine") },
    { key: "team", label: t("supportOps.tasks.team") },
    { key: "overdue", label: t("supportOps.tasks.overdue") },
    { key: "completed", label: t("supportOps.tasks.completed") },
  ];

  const tone = (st: string) =>
    st === "DONE" ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
    : st === "IN_PROGRESS" ? "bg-[var(--state-info-soft)] text-[var(--state-info)]"
    : "bg-[var(--state-neutral-soft)] text-[var(--state-neutral)]";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.tasks")}</h1>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={!isOnline}
          className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {t("supportOps.tasks.new")}
        </button>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] p-1" role="tablist">
        {views.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-extrabold sm:flex-none ${
              view === v.key ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)]"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && filtered.length === 0 && <EmptyState title={t("supportOps.tasks.noTasks")} hint={t("supportOps.tasks.noTasksHint")} />}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-[var(--support-radius-card)] border bg-[var(--card-bg)] px-4 py-3 backdrop-blur-[var(--glass-blur-01)] ${
                task.overdue ? "border-[var(--state-danger)]/40" : "border-[var(--card-border)]"
              }`}
            >
              <button
                onClick={() => task.status === "DONE" ? setStatus(task.id, "TODO") : setStatus(task.id, "DONE")}
                disabled={busyId === task.id || !isOnline}
                aria-label={task.status === "DONE" ? t("supportOps.tasks.reopenTask") : t("supportOps.tasks.markDone")}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:opacity-50 ${
                  task.status === "DONE"
                    ? "border-[var(--state-success)] bg-[var(--state-success)] text-white"
                    : "border-[var(--border-strong)] hover:border-[var(--state-success)]"
                }`}
              >
                {task.status === "DONE" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {busyId === task.id && <Spinner className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-[13px] font-extrabold ${task.status === "DONE" ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>{task.title}</p>
                  <PriorityBadge priority={task.priority} t={t} />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tone(task.status)}`}>
                    {t(`supportOps.tasks.statusLabels.${task.status}`) ?? task.status}
                  </span>
                  {task.overdue && (
                    <span className="rounded-full bg-[var(--state-danger-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--state-danger)]">
                      {t("supportOps.tasks.overdue")}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {t("supportOps.tasks.due")}: {new Date(task.dueAt).toLocaleString()} · {t("supportOps.tasks.assignee")}: {task.assignedToName ?? t("supportOps.common.none")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { t, activeOfficer, officers, toast } = useSupportOps();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dueAt, setDueAt] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const res = await supportOps.createTask(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        assignedToId: assignedToId || undefined,
      },
      activeOfficer?.id,
    );
    setBusy(false);
    if (isSupportApiError(res)) {
      toast(supportErrorMessage(res), "error");
      return;
    }
    toast(t("supportOps.toasts.taskCreated"));
    setTitle("");
    setDescription("");
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.tasks.new")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="task-title" className="mb-1 block text-xs font-bold">{t("supportOps.newTicket.subject")}</label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <div>
          <label htmlFor="task-desc" className="mb-1 block text-xs font-bold">{t("supportOps.newTicket.description")}</label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-pri" className="mb-1 block text-xs font-bold">{t("supportOps.common.priority")}</label>
            <select id="task-pri" value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]">
              {["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"].map((p) => (
                <option key={p} value={p}>{t(`supportOps.priorities.${p}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-due" className="mb-1 block text-xs font-bold">{t("supportOps.tasks.due")}</label>
            <input
              id="task-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="task-assignee" className="mb-1 block text-xs font-bold">{t("supportOps.tasks.assignee")}</label>
          <select id="task-assignee" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]">
            <option value="">{t("supportOps.common.none")}</option>
            {officers.filter((o) => o.status !== "OFFLINE").map((o) => (
              <option key={o.id} value={o.id}>{o.fullName}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={!title.trim() || busy || !activeOfficer?.capabilities?.includes("manage_tasks")}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] disabled:opacity-50"
          >
            {busy && <Spinner />} {t("supportOps.tasks.new")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
