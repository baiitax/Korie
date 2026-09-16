# Migrations

Sequential Supabase/Postgres migrations. Filenames are
`YYYYMMDDNNNNNN_description.sql` and apply in lexicographic order — never
renumber or edit an applied file; add a new migration instead.

## SECURITY DEFINER — the non-negotiable convention

Postgres grants `EXECUTE` on **every new function to PUBLIC** by default, and
Supabase's `anon` / `authenticated` roles inherit that. A `SECURITY DEFINER`
function therefore starts out **callable by anyone holding the public anon
key** through `/rest/v1/rpc/<fn>` — this is exactly how PS-1 happened (see
`20260914000061_revoke_anon_on_security_definer_fns.sql`).

Every migration that creates or replaces a `SECURITY DEFINER` function MUST,
in the same file:

```sql
CREATE OR REPLACE FUNCTION public.my_sensitive_fn(p_x uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ ... $$;

-- 1. Close the PostgREST door:
REVOKE EXECUTE ON FUNCTION public.my_sensitive_fn(uuid) FROM anon, authenticated, PUBLIC;

-- 2. Grant only to the role that actually calls it (server code uses the
--    service-role admin client):
GRANT EXECUTE ON FUNCTION public.my_sensitive_fn(uuid) TO service_role;
```

Rules enforced by `scripts/lint-migrations.mjs` (runs in CI, see
`tests/migration-lint.test.ts`):

- A `SECURITY DEFINER` function that is executable by `anon`/`authenticated`
  after replaying the full migration history **fails CI**.
- `GRANT ... ON ALL FUNCTIONS IN SCHEMA ... TO anon, authenticated` **fails
  CI** (grant per function, never blanket).
- `ALTER DEFAULT PRIVILEGES ... GRANT ... ON FUNCTIONS TO anon/authenticated`
  **fails CI**.
- The only sanctioned exception today is
  `public.hook_password_verification_attempt` (invoked by the Supabase auth
  service; see the allowlist in `scripts/lint-migrations.mjs` and roadmap
  item 1.2 — it will be removed once that closes).
- Allowlist entries go stale on purpose: if an allowlisted function is no
  longer exposed, the linter fails until the entry is removed, so the list
  can never silently hide a regression.

`SECURITY INVOKER` functions (the default) are out of scope for this lint —
they run with the caller's privileges, so RLS applies. If you need an
authenticated-customer-facing RPC, prefer SECURITY INVOKER + RLS policies
over SECURITY DEFINER.

## Live (authoritative) check

The CI check is a static replay of the migration files. To verify the
**actual database ACLs** (catches out-of-band `GRANT`s no migration made),
run against prod with the connection string:

```bash
SUPABASE_DB_URL='postgresql://...' node scripts/lint-migrations.mjs --live
```

Requires `psql` on PATH. Exits non-zero on any `SECURITY DEFINER` function
executable by `anon`/`authenticated` beyond the allowlist. Run this after
applying migrations and after any manual privilege surgery.

## Applying

Apply with the Supabase connection string, in order, one transaction per
file, e.g.:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql
```

Record in the file header when it was applied to production (see 000061 for
the house style).
