import WS from "ws";
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = WS;
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ids = [
  ["f47a5fcc-312b-4468-9d17-32fd8ee33faf","amina.bello@test.ng"],
  ["cb0e03c2-dee6-4987-a79f-ead01c540c61","chukwudi.eze@test.ng"],
  ["195e955a-4de2-451c-8c77-fb029bfc634c","amadou.seydou@test.ne"],
  ["8c1f069b-ba97-4b60-97e0-4f919d4c80e4","fatima.oumarou@test.ne"],
];

const PASSWORD = "KorieCustomer@2026!";

for (const [id, email] of ids) {
  const { data, error } = await admin.auth.admin.updateUserById(id, { password: PASSWORD, email_confirm: true });
  console.log(email, error ? `ERROR: ${error.message}` : "OK");
}
