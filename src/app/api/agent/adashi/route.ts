// =============================================================================
// Agent Adashi console BFF — authenticated + operator-scoped.
//
//   GET  /api/agent/adashi → products + summary stats + marketplace groups the
//        console operates (creatorRole AGENT) with members/cycles/rotations/
//        obligations/payouts (agent-appropriate operator view).
//   POST /api/agent/adashi → action dispatch: create | invite | consent |
//        lock | rotation | start | collect | payout. Actor identity is the
//        console operator alias (usr-agent-001) resolved SERVER-side — the
//        browser cannot choose who it acts as.
//
// The browser no longer calls the unauthenticated /api/v1/adashi/* routes.
// =============================================================================

import { NextRequest } from "next/server";
import { AdashiStore } from "@/lib/adashi/AdashiStore";
import { AdashiGroupLifecycleEngine } from "@/lib/adashi/AdashiGroupLifecycleEngine";
import { AdashiMembershipEngine } from "@/lib/adashi/AdashiMembershipEngine";
import { AdashiRotationAllocationEngine } from "@/lib/adashi/AdashiRotationAllocationEngine";
import { AdashiPayoutEngine } from "@/lib/adashi/AdashiPayoutEngine";
import { AdashiCycleObligationEngine } from "@/lib/adashi/AdashiCycleObligationEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

/** Console operator identity used by the adashi marketplace seeds. */
const OPERATOR_ALIAS = "usr-agent-001";
const OPERATOR_NAME = "Ibrahim Danladi";

function consoleGroups() {
  // Operator scope: only circles created by or assigned to this operator's
  // agency appear in the console — other marketplace agents' groups are not
  // readable or operable from this session.
  return AdashiStore.getGroups().filter(
    (g) =>
      g.creatorRole === "AGENT" &&
      (g.creatorId === OPERATOR_ALIAS || g.assignedAgentId === OPERATOR_ALIAS),
  );
}

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ agentId, requestId, environment }) => {
    void agentId;
    const products = AdashiStore.getProducts();
    const groups = consoleGroups().map((g) => ({
      group: g,
      members: AdashiStore.getMembers(g.id),
      cycles: AdashiStore.getCycles(g.id),
      rotations: AdashiStore.getRotations(g.id).filter((r) => r.status === "PUBLISHED"),
      obligations: AdashiStore.getObligations(g.id),
      payouts: AdashiStore.getPayouts(g.id),
    }));
    return agentOk(
      {
        products,
        groups,
        stats: {
          groupCount: groups.length,
          activeGroups: groups.filter(
            (x) =>
              x.group.status === "ACTIVE_IN_PROGRESS" ||
              x.group.status === "MEMBERSHIP_LOCKED" ||
              x.group.status === "ROTATION_PUBLISHED",
          ).length,
          membersAcrossGroups: groups.reduce((s, x) => s + x.members.length, 0),
          openCollections: groups.reduce(
            (s, x) =>
              s +
              x.obligations.filter((o) => o.status !== "PAID" && o.status !== "WAIVED" && o.status !== "DEFAULTED").length,
            0,
          ),
          paidThisCycle: groups.reduce(
            (s, x) =>
              s +
              x.obligations.filter((o) => o.status === "PAID" && o.paidAt && new Date(o.paidAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
            0,
          ),
        },
        operator: { alias: OPERATOR_ALIAS, name: OPERATOR_NAME },
        scopeNote: "Operator console view — agent-authorized marketplace groups only.",
      },
      requestId,
      environment,
    );
  });
}

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["payments:write"], async ({ requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const action = String(body.action || "");
    const idempotencyKey = String(req.headers.get("idempotency-key") || body.idempotencyKey || "");

    try {
      switch (action) {
        case "create": {
          if (!body.group) return agentErr("GROUP_REQUIRED", "group payload is required.", requestId, 400);
          const group = AdashiGroupLifecycleEngine.createGroup({
            ...body.group,
            creatorId: OPERATOR_ALIAS,
            creatorRole: "AGENT",
            creatorName: OPERATOR_NAME,
          });
          return agentOk({ group }, requestId, environment);
        }
        case "invite": {
          if (!body.adashiId || !body.customerName) {
            return agentErr("MEMBER_REQUIRED", "adashiId and customerName are required.", requestId, 400);
          }
          const member = AdashiMembershipEngine.inviteMember(
            {
              adashiId: body.adashiId,
              customerId:
                body.customerId || `cust-agent-ada-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              customerName: body.customerName,
              customerPhone: body.customerPhone || "—",
              customerEmail: body.customerEmail,
              kycTier: body.kycTier || 1,
            },
            OPERATOR_ALIAS,
          );
          return agentOk({ member }, requestId, environment);
        }
        case "consent": {
          if (!body.memberId) return agentErr("MEMBER_REQUIRED", "memberId is required.", requestId, 400);
          const member = AdashiMembershipEngine.captureConsent(
            body.memberId,
            body.consentGranted ?? true,
            body.mandateAuthorized ?? true,
            OPERATOR_ALIAS,
          );
          return agentOk({ member }, requestId, environment);
        }
        case "lock": {
          if (!body.adashiId) return agentErr("GROUP_REQUIRED", "adashiId is required.", requestId, 400);
          const group = AdashiGroupLifecycleEngine.lockMembership(body.adashiId, OPERATOR_ALIAS);
          return agentOk({ group }, requestId, environment);
        }
        case "rotation": {
          if (!body.adashiId) return agentErr("GROUP_REQUIRED", "adashiId is required.", requestId, 400);
          const rotation = AdashiRotationAllocationEngine.generateRotation(
            body.adashiId,
            OPERATOR_ALIAS,
            body.customSeed,
          );
          return agentOk({ rotation }, requestId, environment);
        }
        case "start": {
          if (!body.adashiId) return agentErr("GROUP_REQUIRED", "adashiId is required.", requestId, 400);
          const group = AdashiGroupLifecycleEngine.startGroup(body.adashiId, OPERATOR_ALIAS);
          return agentOk({ group }, requestId, environment);
        }
        case "collect": {
          if (!body.obligationId) return agentErr("OBLIGATION_REQUIRED", "obligationId is required.", requestId, 400);
          const outcome = await AdashiCycleObligationEngine.processContributionPayment({
            obligationId: body.obligationId,
            initiatedBy: "AGENT_COLLECTION",
            idempotencyKey:
              idempotencyKey ||
              `agent-collect-${body.obligationId}-${Date.now()}`,
          });
          if (outcome.success) return agentOk({ obligation: outcome.obligation, payment: outcome.payment }, requestId, environment);
          return agentErr(outcome.code || "COLLECTION_FAILED", outcome.message, requestId, 400);
        }
        case "payout": {
          if (!body.adashiId || !body.cycleId) {
            return agentErr("CYCLE_REQUIRED", "adashiId and cycleId are required.", requestId, 400);
          }
          const payout = AdashiPayoutEngine.initiatePayout({
            adashiId: body.adashiId,
            cycleId: body.cycleId,
            makerId: OPERATOR_ALIAS,
            makerName: OPERATOR_NAME,
            destinationType: body.destinationType,
            destinationAccountId: body.destinationAccountId,
          });
          return agentOk({ payout }, requestId, environment);
        }
        default:
          return agentErr(
            "UNKNOWN_ACTION",
            "action must be one of: create, invite, consent, lock, rotation, start, collect, payout.",
            requestId,
            400,
          );
      }
    } catch (error: any) {
      return agentErr("ADASHI_ACTION_FAILED", error?.message || "The action could not be completed.", requestId, 400);
    }
  });
}
