// One-off script to provision a back-office AGENCY_OPS_ADMIN user for testing
// settlement/KYC-review/onboarding-decision endpoints against the real
// Supabase project. Safe to re-run (idempotent upserts).
import WS from "ws";
globalThis.WebSocket = WS;

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = "ops.admin@korieagent.com";
const password = "KorieOpsAdmin@2026!";

async function main() {
  let userId;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "KoriePay Ops Admin", role: "AGENCY_OPS_ADMIN" },
  });

  if (error && error.message.includes("already been registered")) {
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === email)?.id;
  } else if (error) {
    console.error("createUser error", error);
    process.exit(1);
  } else {
    userId = created.user.id;
  }
  console.log("auth user id", userId);

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .upsert({ auth_user_id: userId, email, full_name: "KoriePay Ops Admin", country: "NG", status: "ACTIVE" }, { onConflict: "auth_user_id" })
    .select()
    .single();
  if (profileErr) {
    console.error("profile error", profileErr);
    process.exit(1);
  }
  console.log("profile id", profile.id);

  const { data: role } = await admin.from("roles").select("id").eq("name", "AGENCY_OPS_ADMIN").single();
  const { error: memErr } = await admin
    .from("organization_members")
    .upsert({ org_id: "10000000-0000-0000-0000-000000000001", user_id: profile.id, role_id: role.id, status: "ACTIVE" }, { onConflict: "org_id,user_id" });
  if (memErr) {
    console.error("member error", memErr);
    process.exit(1);
  }
  console.log("✅ ops admin ready:", email, "/", password);
}

main();
