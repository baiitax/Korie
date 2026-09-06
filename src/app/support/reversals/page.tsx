// /support/reversals — the reversals tab of Refunds & Reversals (§31).
import { redirect } from "next/navigation";

export const metadata = { title: "Reversals | KoriePay Support" };

export default function ReversalsPage() {
  redirect("/support/refunds?tab=reversals");
}
