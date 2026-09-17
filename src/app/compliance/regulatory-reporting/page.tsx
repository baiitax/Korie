import { redirect } from "next/navigation";

/**
 * Regulatory reporting (NFIU / CENTIF) — retired mock screen (PS-5).
 *
 * The live register lives at /compliance/reports: real regulatory-reports
 * filings + regulatory-obligations due dates + restatements, every row from
 * the database, honest empty/error states. It is read-only because every
 * regulatory route in the deployment is GET-only — the old screen's
 * "Dispatch Filing" button wrote to nothing.
 *
 * This redirect keeps old bookmarks working instead of 404ing.
 */
export default function RegulatoryReportingRedirect() {
  redirect("/compliance/reports");
}
