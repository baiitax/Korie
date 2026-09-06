// /support/dashboard — alias for the Command Center (§107).
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard | KoriePay Support" };

export default function DashboardAliasPage() {
  redirect("/support");
}
