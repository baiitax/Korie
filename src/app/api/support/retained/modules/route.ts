import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import {
  listPlaybookRows,
  listIncidentRows,
  listAutomationRuleRows,
  listAutomationLogRows,
  listQaReviewRows,
  listTrainingModuleRows,
  listTrainingCompletionRows,
  listOfficers,
  listTicketRows,
} from "@/lib/support/supportDb";
import {
  playbookRowToPlaybook,
  incidentRowToIncident,
  automationRuleRowToRule,
  automationLogRowToLog,
  qaReviewRowToReview,
  trainingModuleRowToModule,
  deriveCapacity,
} from "@/lib/support/supportRetainedMappers";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/retained/modules
 * Read-mostly operational modules: playbooks, incidents, automation rules &
 * logs, QA reviews, training, and LIVE-derived capacity — every value read
 * from the real support_* reference tables (migration
 * 20260906000031_support_portal_live.sql), no static/seeded numbers.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const [playbookRows, incidentRows, ruleRows, logRows, qaRows, moduleRows, completionRows, officerRows, { rows: openTicketRows }] = await Promise.all([
    listPlaybookRows(),
    listIncidentRows(),
    listAutomationRuleRows(),
    listAutomationLogRows(),
    listQaReviewRows(),
    listTrainingModuleRows(),
    listTrainingCompletionRows(),
    listOfficers(),
    listTicketRows({ openOnly: true, limit: 2000 }),
  ]);

  const officerName = new Map(officerRows.map((o) => [o.id, o.full_name]));
  const ruleName = new Map(ruleRows.map((r: { id: string; rule_name: string }) => [r.id, r.rule_name]));
  const linkedTicketCount = new Map<string, number>();
  for (const t of openTicketRows) {
    if (t.incident_id) linkedTicketCount.set(t.incident_id, (linkedTicketCount.get(t.incident_id) ?? 0) + 1);
  }
  const myCompletion = new Map(
    (completionRows as Array<{ module_id: string; officer_id: string; score: number | null; completed_at: string }>)
      .filter((c) => c.officer_id === access.ctx.actor.officerId)
      .map((c) => [c.module_id, c]),
  );

  const playbooks = playbookRows.map((p: Record<string, unknown>) => playbookRowToPlaybook(p));
  const incidents = incidentRows.map((i: Record<string, unknown> & { id: string }) => incidentRowToIncident(i, linkedTicketCount.get(i.id) ?? 0));
  const automationRules = ruleRows.map((r: Record<string, unknown>) => automationRuleRowToRule(r));
  const automationLogs = logRows.map((l: Record<string, unknown> & { rule_id: string }) => automationLogRowToLog(l, ruleName.get(l.rule_id) ?? "—"));
  const qaReviews = qaRows.map((q: Record<string, unknown> & { officer_id: string }) =>
    qaReviewRowToReview(q, officerName.get(q.officer_id) ?? "—", access.ctx.actor.name),
  );
  const training = moduleRows.map((m: Record<string, unknown> & { id: string }) => trainingModuleRowToModule(m, myCompletion.get(m.id)));

  const openTicketsByLanguage: Record<string, number> = {};
  for (const t of openTicketRows) openTicketsByLanguage[t.language] = (openTicketsByLanguage[t.language] ?? 0) + 1;
  const capacity = deriveCapacity(
    officerRows.map((o) => ({ languages: o.languages, role: o.role })),
    openTicketsByLanguage,
  );

  return createSuccessResponse(
    { playbooks, incidents, automationRules, automationLogs, qaReviews, training, capacity },
    { requestId: access.ctx.requestId },
  );
}
