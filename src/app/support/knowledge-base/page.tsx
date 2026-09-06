// /support/knowledge-base — alias for the Knowledge Base (§107).
import { redirect } from "next/navigation";

export const metadata = { title: "Knowledge Base | KoriePay Support" };

export default function KnowledgeBaseAliasPage() {
  redirect("/support/knowledge");
}
