// =============================================================================
// File: src/lib/support/supportRetainedMappers.ts
// Description: Row -> API-shape mappers for the retained reference modules
// (playbooks, incidents, automation, QA, training, capacity). These are
// read-mostly reference tables (support_playbooks, support_incidents, etc.)
// introduced by migration 20260906000031_support_portal_live.sql.
// =============================================================================

import {
  SupportPlaybook,
  SupportIncident,
  AutomationRule,
  AutomationExecutionLog,
  QaReview,
  TrainingModule,
  StaffCapacityMetric,
} from "@/types/support";

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

export function playbookRowToPlaybook(p: Record<string, any>): SupportPlaybook {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    targetTier: p.target_tier,
    estimatedMinutes: p.estimated_minutes,
    steps: (p.steps as SupportPlaybook["steps"]) || [],
    requiredRole: p.required_role,
    applicableJurisdictions: p.applicable_jurisdictions || [],
  };
}

export function incidentRowToIncident(i: Record<string, any>, linkedTicketsCount = 0): SupportIncident {
  return {
    id: i.id,
    incidentNumber: i.incident_number,
    title: i.title,
    description: i.description,
    affectedServices: i.affected_services || [],
    affectedProviders: i.affected_providers || [],
    jurisdiction: i.jurisdiction,
    severity: i.severity,
    status: i.status,
    startTime: i.start_time,
    resolvedTime: i.resolved_time || undefined,
    linkedTicketsCount,
    customerNotice: i.customer_notice || "",
  };
}

export function automationRuleRowToRule(r: Record<string, any>): AutomationRule {
  return {
    id: r.id,
    ruleName: r.rule_name,
    description: r.description || "",
    triggerEvent: r.trigger_event,
    category: r.category,
    conditions: (r.conditions as AutomationRule["conditions"]) || [],
    actions: (r.actions as AutomationRule["actions"]) || [],
    enabled: r.enabled,
    executionCount: r.execution_count,
    successRate: r.execution_count > 0 ? Math.round((r.success_count / r.execution_count) * 100) : 0,
    lastTriggered: r.last_triggered || undefined,
    requiresHumanApproval: r.requires_human_approval,
    isDryRun: r.is_dry_run,
  };
}

export function automationLogRowToLog(l: Record<string, any>, ruleName: string): AutomationExecutionLog {
  return {
    id: l.id,
    ruleId: l.rule_id,
    ruleName,
    ticketId: l.ticket_id || "",
    triggerTimestamp: l.triggered_at,
    status: l.status,
    actionTaken: l.action_taken,
    timeSavedMinutes: l.time_saved_minutes,
    error: l.error || undefined,
  };
}

export function qaReviewRowToReview(q: Record<string, any>, officerName: string, reviewerName: string): QaReview {
  return {
    id: q.id,
    ticketId: q.ticket_id || "",
    officerId: q.officer_id,
    officerName,
    reviewerName,
    score: num(q.score),
    criteriaRatings: {
      identityVerification: q.identity_verification,
      accuracy: q.accuracy,
      professionalism: q.professionalism,
      playbookAdherence: q.playbook_adherence,
      resolutionSpeed: q.resolution_speed,
    },
    feedback: q.feedback || "",
    reviewedAt: q.reviewed_at,
  };
}

export function trainingModuleRowToModule(
  m: Record<string, any>,
  completion?: { score: number | null; completed_at: string },
): TrainingModule {
  return {
    id: m.id,
    title: m.title,
    description: m.description || "",
    tier: m.tier,
    estimatedMinutes: m.estimated_minutes,
    modulesCount: m.modules_count,
    completed: !!completion,
    score: completion?.score ?? undefined,
    certificationName: m.certification_name || "",
    keySkills: m.key_skills || [],
  };
}

/** Capacity is derived from the live officer roster + queue, not a static seed. */
export function deriveCapacity(
  officers: { languages: string[]; role: string }[],
  openTicketsByLanguage: Record<string, number>,
): StaffCapacityMetric {
  const currentWorkforce = officers.length;
  const langDemand = {
    english: openTicketsByLanguage.en || 0,
    hausa: openTicketsByLanguage.ha || 0,
    french: openTicketsByLanguage.fr || 0,
  };
  const totalOpen = langDemand.english + langDemand.hausa + langDemand.french;
  const peakQueueRequirement = Math.max(currentWorkforce, Math.ceil(totalOpen / 3));
  const recommendedJuniorOfficers = Math.max(0, peakQueueRequirement - currentWorkforce);
  const primaryNeedCategory =
    langDemand.hausa >= langDemand.english && langDemand.hausa >= langDemand.french
      ? "Hausa-speaking support"
      : langDemand.french >= langDemand.english
        ? "French-speaking support"
        : "English-speaking support";
  return {
    currentWorkforce,
    peakQueueRequirement,
    recommendedJuniorOfficers,
    primaryNeedCategory,
    languageDemand: langDemand,
  };
}
