import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { ToolForm } from "../tool-form";

export const dynamic = "force-dynamic";

export default async function NewToolPage() {
  if (!(await isAdmin())) redirect("/admin");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Add Tool</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only add real tools with official URLs. Entries are verified by the link
        checker after publishing.
      </p>
      <div className="mt-6">
        <ToolForm />
      </div>
    </div>
  );
}
