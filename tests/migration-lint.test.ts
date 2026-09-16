/**
 * Migration security lint (portal security roadmap 1.4).
 *
 * PS-1 class regression guard: SECURITY DEFINER functions must never be
 * executable by anon/authenticated through PostgREST. This test runs the
 * migration linter against (a) deliberately-bad fixtures — which MUST fail —
 * and (b) the real migration history — which MUST pass. Together with the
 * CI step that runs the linter directly, a bad migration cannot reach main
 * quietly.
 */
import { describe, it, expect } from "vitest";
import { join } from "path";
import { lintMigrations } from "../scripts/lint-migrations.mjs";

const fixtures = join(process.cwd(), "tests", "fixtures", "migration-lint");
const realMigrations = join(process.cwd(), "supabase", "migrations");

describe("migration security lint (PS-1 guardrail)", () => {
  it("fails on an unprotected SECURITY DEFINER function", () => {
    const { violations } = lintMigrations(join(fixtures, "bad"));
    expect(
      violations.some(
        (v) => v.rule === "SD-FUNCTION-EXPOSED-ANON" || v.rule === "SD-FUNCTION-EXPOSED-TO-ANON",
      ),
    ).toBe(true);
  });

  it("fails on a direct GRANT to anon even after a REVOKE", () => {
    const { violations } = lintMigrations(join(fixtures, "bad"));
    expect(violations.some((v) => v.rule === "SD-FUNCTION-EXPOSED-TO-ANON")).toBe(true);
    // The gadget function is exposed specifically by the direct grant:
    expect(
      violations.some((v) => v.message.includes("post_gadget_transfer")),
    ).toBe(true);
  });

  it("fails on blanket GRANT ON ALL FUNCTIONS to anon", () => {
    const { violations } = lintMigrations(join(fixtures, "bad"));
    expect(violations.some((v) => v.rule === "BLANKET-GRANT-ANON")).toBe(true);
  });

  it("fails on ALTER DEFAULT PRIVILEGES granting functions to anon", () => {
    const { violations } = lintMigrations(join(fixtures, "bad"));
    expect(violations.some((v) => v.rule === "DEFAULT-PRIVS-GRANT-ANON")).toBe(true);
  });

  it("passes clean fixtures (revoke + service_role grant, SECURITY INVOKER out of scope)", () => {
    const { violations } = lintMigrations(join(fixtures, "good"), { strictAllowlist: false });
    expect(violations).toEqual([]);
  });

  it("the real migration history passes the guardrail", () => {
    const { violations, allowlisted } = lintMigrations(realMigrations);
    expect(violations).toEqual([]);
    // The ONLY sanctioned exposure is the Supabase auth hook (roadmap 1.2).
    expect(allowlisted).toEqual(["public.hook_password_verification_attempt"]);
  });
});
