#!/usr/bin/env node
// =============================================================================
// scripts/lint-migrations.mjs — CI guardrail so PS-1 can never recur.
//
// The portal security review found (PS-1) that SECURITY DEFINER functions in
// PostgREST-reachable schemas were executable by anyone holding the public
// anon key. Postgres grants EXECUTE on new functions to PUBLIC by default,
// and Supabase's roles (anon / authenticated) inherit that — so EVERY
// SECURITY DEFINER function needs an explicit
//
//     REVOKE EXECUTE ON FUNCTION <schema>.<name>(<args>) FROM anon, authenticated, PUBLIC;
//
// (plus a GRANT to whichever role actually calls it — usually service_role).
//
// This linter enforces that in two modes:
//
//   static (default, runs in CI): replays supabase/migrations/*.sql in
//     filename order and models each function's ACL the way Postgres does:
//       - a fresh CREATE starts EXECUTE-to-PUBLIC (i.e. anon-reachable);
//       - CREATE OR REPLACE preserves an existing ACL;
//       - named/blanket REVOKE and GRANT statements mutate the model,
//         including GRANT/REVOKE ON ALL FUNCTIONS IN SCHEMA and
//         ALTER DEFAULT PRIVILEGES ... ON FUNCTIONS;
//     then fails if any SECURITY DEFINER function ends up executable by
//     anon/authenticated unless it is on the explicit allowlist below.
//
//   live (optional, --live or LINT_MIGRATIONS_LIVE=1): connects with psql
//     using $SUPABASE_DB_URL / $POSTGRES_URL and fails if the DATABASE's
//     actual ACLs expose any SECURITY DEFINER function to anon/authenticated
//     beyond the allowlist. Not wired into CI (no credentials in a public
//     repo's CI) — run it as an operator command before/after deployments:
//
//       SUPABASE_DB_URL='postgresql://...' node scripts/lint-migrations.mjs --live
//
// Allowlist policy: every entry needs a reason and a roadmap/ticket ref.
// Entries are removed when the underlying exposure is fixed. The linter
// also fails if an allowlist entry no longer matches anything (stale
// entries hide regressions).
// =============================================================================

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Allowlists — the ONLY sanctioned exposures. Keep both lists tight.
// -----------------------------------------------------------------------------

/** SECURITY DEFINER functions deliberately reachable by anon/authenticated. */
const KNOWN_EXPOSURES = [
  {
    schema: "public",
    name: "hook_password_verification_attempt",
    reason:
      "Invoked by the Supabase auth service during login. anon/authenticated EXECUTE must not be revoked until a manual login test confirms GoTrue calls it as supabase_auth_admin (it already holds EXECUTE).",
    ref: "KoriePay portal security roadmap 1.2 — remove this entry when that item closes.",
  },
];

/**
 * Legacy statements (matched by file + kind + schema) that would otherwise
 * fail the blanket-grant rules. These document HISTORICAL decisions, not
 * permission to repeat them.
 */
const LEGACY_STATEMENTS = [
  {
    file: "20260908000040_adashi_liquidity_postgrest_exposure.sql",
    kinds: ["grant-all-functions-schema", "alter-default-privileges-functions"],
    schemas: ["adashi", "liquidity"],
    reason:
      "Historical blanket exposure of the adashi/liquidity customer surface (RLS-protected tables + functions). The SECURITY DEFINER functions it exposed were re-locked by 20260916000063; tables remain exposed by design. Do not extend this pattern to other schemas.",
    ref: "KoriePay portal security roadmap 1.4.",
  },
];

const IGNORED_SCHEMAS = /^(pg_|information_schema)/;

// -----------------------------------------------------------------------------
// SQL statement scanning
// -----------------------------------------------------------------------------

/** Strip dollar-quoted bodies, then comments — leaving only executable text
 *  (with original line offsets preserved by replacing with same-length
 *  whitespace where line numbers matter for reporting). */
function stripNonStatements(sql) {
  return sql
    .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, (m) => " ".repeat(m.length))
    .replace(/--[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
}

const RE = {
  createFn:
    /create\s+(or\s+replace\s+)?function\s+(?:(\w+)\.)?(\w+)\s*\(/gi,
  sdFlag: /security\s+definer/i,
  namedRevoke:
    /revoke\s+(?:execute|all(?:\s+privileges)?)\s+on\s+function\s+(?:(\w+)\.)?(\w+)\s*\([^)]*\)\s+from\s+([^;]+);/gi,
  blanketRevoke:
    /revoke\s+(?:execute|all(?:\s+privileges)?)\s+on\s+all\s+functions\s+in\s+schema\s+(\w+)\s+from\s+([^;]+);/gi,
  namedGrant:
    /grant\s+(?:execute|all(?:\s+privileges)?)\s+on\s+function\s+(?:(\w+)\.)?(\w+)\s*\([^)]*\)\s+to\s+([^;]+);/gi,
  blanketGrant:
    /grant\s+(?:execute|all(?:\s+privileges)?)\s+on\s+all\s+functions\s+in\s+schema\s+(\w+)\s+to\s+([^;]+);/gi,
  adpGrant:
    /alter\s+default\s+privileges(?:\s+for\s+(?:role|user)\s+\w+)?(?:\s+in\s+schema\s+(\w+))?\s+grant\s+[^;]*on\s+functions\s+to\s+([^;]+);/gi,
};

const granteesExposing = (list) => {
  const l = list.toLowerCase();
  return l.includes("anon") || l.includes("authenticated");
};
const granteesProtecting = (list) => {
  const l = list.toLowerCase();
  return l.includes("anon") || l.includes("authenticated") || l.includes("public");
};

function lineOf(sql, index) {
  return sql.slice(0, index).split("\n").length;
}

function matchAll(re, text) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m);
  return out;
}

// -----------------------------------------------------------------------------
// The static replay
// -----------------------------------------------------------------------------

/**
 * @param {string} migrationsDir directory of *.sql migration files
 * @param {{ strictAllowlist?: boolean }} [opts] strictAllowlist=false skips the
 *        stale-allowlist check (for fixture directories that intentionally
 *        contain only a subset of the real history).
 * @returns {{ violations: Array<{file,line,rule,message}> , tracked: number,
 *             allowlisted: string[] }}
 */
export function lintMigrations(migrationsDir, { strictAllowlist = true } = {}) {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  /** @type {Map<string, {schema,name,sd,directAnon,publicCleared,orReplace,file,line}>} */
  const fns = new Map();
  /** schema -> boolean: ALTER DEFAULT PRIVILEGES grants functions to anon/auth */
  const adpExposing = new Map();
  const violations = [];
  const allowlistedSeen = new Set();

  const legacyOk = (file, kind, schema) =>
    LEGACY_STATEMENTS.some(
      (e) => e.file === file && e.kinds.includes(kind) && e.schemas.includes(schema),
    );

  const key = (schema, name) => `${schema}.${name}`;

  for (const file of files) {
    const raw = readFileSync(join(migrationsDir, file), "utf8");
    const sql = stripNonStatements(raw);

    // ---- CREATE FUNCTION -------------------------------------------------
    for (const m of matchAll(RE.createFn, sql)) {
      const orReplace = !!m[1];
      const schema = (m[2] || "public").toLowerCase();
      const name = m[3].toLowerCase();
      if (IGNORED_SCHEMAS.test(schema)) continue;

      const k = key(schema, name);
      const prev = fns.get(k);
      const sd = (() => {
        // SECURITY DEFINER sits in the header: scan from this CREATE to the next.
        const rest = sql.slice(m.index);
        const next = RE.createFn.exec(rest.slice(m[0].length));
        const header = rest.slice(0, m[0].length + (next ? next.index : rest.length));
        return RE.sdFlag.test(header);
      })();

      const startsExposed = adpExposing.get(schema) === true;
      fns.set(k, {
        schema,
        name,
        sd,
        // OR REPLACE preserves the ACL of an existing function; a fresh
        // CREATE gets the default EXECUTE-to-PUBLIC ACL.
        directAnon: prev && orReplace ? prev.directAnon || startsExposed : startsExposed,
        publicCleared: prev && orReplace ? prev.publicCleared : false,
        file,
        line: lineOf(raw, m.index),
      });
    }

    // ---- REVOKE (named) ----------------------------------------------------
    for (const m of matchAll(RE.namedRevoke, sql)) {
      const schema = (m[1] || "public").toLowerCase();
      const name = m[2].toLowerCase();
      const grantees = m[3];
      const fn = fns.get(key(schema, name));
      if (!fn) continue;
      if (/anon|authenticated/i.test(grantees)) fn.directAnon = false;
      if (granteesProtecting(grantees)) fn.publicCleared = true;
    }

    // ---- REVOKE (blanket: all functions in schema) --------------------------
    for (const m of matchAll(RE.blanketRevoke, sql)) {
      const schema = m[1].toLowerCase();
      const grantees = m[2];
      for (const fn of fns.values()) {
        if (fn.schema !== schema) continue;
        if (/anon|authenticated/i.test(grantees)) fn.directAnon = false;
        if (granteesProtecting(grantees)) fn.publicCleared = true;
      }
    }

    // ---- GRANT (named) -----------------------------------------------------
    for (const m of matchAll(RE.namedGrant, sql)) {
      const schema = (m[1] || "public").toLowerCase();
      const name = m[2].toLowerCase();
      const grantees = m[3];
      const fn = fns.get(key(schema, name));
      if (!fn) continue;
      if (granteesExposing(grantees)) fn.directAnon = true;
    }

    // ---- GRANT (blanket: all functions in schema) ---------------------------
    for (const m of matchAll(RE.blanketGrant, sql)) {
      const schema = m[1].toLowerCase();
      const grantees = m[2];
      if (!granteesExposing(grantees)) continue;
      if (!legacyOk(file, "grant-all-functions-schema", schema)) {
        violations.push({
          file,
          line: lineOf(raw, m.index),
          rule: "BLANKET-GRANT-ANON",
          message: `GRANT ON ALL FUNCTIONS IN SCHEMA ${schema} includes anon/authenticated — SECURITY DEFINER functions would be PostgREST-reachable. Revoke and grant per-function to service_role instead.`,
        });
        continue;
      }
      for (const fn of fns.values()) if (fn.schema === schema) fn.directAnon = true;
    }

    // ---- ALTER DEFAULT PRIVILEGES -------------------------------------------
    for (const m of matchAll(RE.adpGrant, sql)) {
      const schema = (m[1] || "public").toLowerCase();
      const grantees = m[2];
      if (!granteesExposing(grantees)) continue;
      if (!legacyOk(file, "alter-default-privileges-functions", schema)) {
        violations.push({
          file,
          line: lineOf(raw, m.index),
          rule: "DEFAULT-PRIVS-GRANT-ANON",
          message: `ALTER DEFAULT PRIVILEGES grants EXECUTE on future functions in schema ${schema} to anon/authenticated — every SECURITY DEFINER function created there would be exposed. Use explicit per-function grants instead.`,
        });
        continue;
      }
      adpExposing.set(schema, true);
    }
  }

  // ---- final state: every SD function must be clean or allowlisted ----------
  for (const fn of fns.values()) {
    if (!fn.sd) continue;
    const exposed = fn.directAnon || !fn.publicCleared;
    const known = KNOWN_EXPOSURES.find((e) => e.schema === fn.schema && e.name === fn.name);
    if (exposed && known) {
      allowlistedSeen.add(`${fn.schema}.${fn.name}`);
      continue;
    }
    if (exposed) {
      violations.push({
        file: fn.file,
        line: fn.line,
        rule: "SD-FUNCTION-EXPOSED-TO-ANON",
        message: `SECURITY DEFINER function ${fn.schema}.${fn.name} is executable by anon/authenticated after replaying all migrations (no effective REVOKE). Add: REVOKE EXECUTE ON FUNCTION ${fn.schema}.${fn.name}(...) FROM anon, authenticated, PUBLIC; and grant only to the role that calls it.`,
      });
    }
  }

  // ---- stale allowlist entries hide regressions — treat them as failures ----
  const stale = strictAllowlist
    ? KNOWN_EXPOSURES.filter(
      (e) => !allowlistedSeen.has(`${e.schema}.${e.name}`),
    ).map((e) => ({
      file: "scripts/lint-migrations.mjs",
      line: 0,
      rule: "STALE-ALLOWLIST-ENTRY",
      message: `Allowlisted exposure ${e.schema}.${e.name} is not currently exposed (${e.ref}) — remove the entry so the guardrail sees future regressions on this function.`,
    }))
    : [];

  return {
    violations: violations.concat(stale),
    tracked: [...fns.values()].filter((f) => f.sd).length,
    allowlisted: [...allowlistedSeen],
  };
}

// -----------------------------------------------------------------------------
// The live check (authoritative) — requires psql on PATH
// -----------------------------------------------------------------------------

export function lintLiveSchema(dbUrl) {
  const query = `
    SELECT n.nspname AS schema, p.proname AS name,
           (p.proacl IS NULL OR EXISTS (
              SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
              JOIN pg_roles r ON r.oid = a.grantee
              WHERE r.rolname IN ('anon','authenticated')
                AND a.privilege_type = 'EXECUTE')) AS exposed
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname !~ '^(pg_|information_schema)'
    ORDER BY 1, 2;`;
  const out = execFileSync(
    "psql",
    [dbUrl, "-X", "-At", "-F", "|", "-c", query],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const violations = [];
  const allowlistedSeen = new Set();
  for (const row of out.split("\n").filter(Boolean)) {
    const [schema, name, exposed] = row.split("|");
    if (exposed !== "t") continue;
    const known = KNOWN_EXPOSURES.find((e) => e.schema === schema && e.name === name);
    if (known) {
      allowlistedSeen.add(`${schema}.${name}`);
      continue;
    }
    violations.push({
      schema,
      name,
      rule: "LIVE-SD-FUNCTION-EXPOSED",
      message: `SECURITY DEFINER function ${schema}.${name} is EXECUTE-granted to anon/authenticated in the live database.`,
    });
  }
  const stale = KNOWN_EXPOSURES.filter((e) => !allowlistedSeen.has(`${e.schema}.${e.name}`))
    .map((e) => ({
      schema: e.schema,
      name: e.name,
      rule: "STALE-ALLOWLIST-ENTRY",
      message: `Allowlisted exposure ${e.schema}.${e.name} is not exposed in the live database (${e.ref}) — remove the entry.`,
    }));
  return { violations: violations.concat(stale), allowlisted: [...allowlistedSeen] };
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function isMain() {
  const argv = process.argv.slice(2);
  return argv.includes("--live")
    ? "live"
    : argv.length === 0 || argv.includes("--dir") || argv.includes("--self-test")
      ? "static"
      : "static";
}

if (process.argv[1] && process.argv[1].endsWith("lint-migrations.mjs")) {
  const mode = isMain();
  if (mode === "live") {
    const url = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
    if (!url) {
      console.error("lint-migrations: --live needs SUPABASE_DB_URL (or POSTGRES_URL).");
      process.exit(2);
    }
    const { violations, allowlisted } = lintLiveSchema(url);
    console.log(
      `lint-migrations (live): ${violations.length} violation(s); allowlisted: ${allowlisted.join(", ") || "none"}`,
    );
    for (const v of violations) console.error(`  ✗ [${v.rule}] ${v.message}`);
    process.exit(violations.length ? 1 : 0);
  } else {
    const dirIdx = process.argv.indexOf("--dir");
    const dir = dirIdx >= 0 ? process.argv[dirIdx + 1] : join(__dirname, "..", "supabase", "migrations");
    const { violations, tracked, allowlisted } = lintMigrations(dir);
    console.log(
      `lint-migrations (static, ${dir}): ${tracked} SECURITY DEFINER function(s) tracked; ${violations.length} violation(s); allowlisted: ${allowlisted.join(", ") || "none"}`,
    );
    for (const v of violations) console.error(`  ✗ ${v.file}:${v.line} [${v.rule}] ${v.message}`);
    process.exit(violations.length ? 1 : 0);
  }
}
