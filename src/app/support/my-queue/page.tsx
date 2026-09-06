// /support/my-queue — alias for the inbox (your queue) (§107).
import { redirect } from "next/navigation";

export const metadata = { title: "My Queue | KoriePay Support" };

export default function MyQueueAliasPage() {
  redirect("/support/inbox");
}
