import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { ToolForm } from "../tool-form";

export const dynamic = "force-dynamic";

export default async function EditToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await params;
  const tool = getCatalog().byId.get(Number(id));
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Edit: {tool.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {tool.url}
        </a>
      </p>
      <div className="mt-6">
        <ToolForm tool={tool} />
      </div>
    </div>
  );
}
