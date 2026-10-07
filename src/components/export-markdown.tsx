"use client";

import { Download } from "lucide-react";
import { CopyButton } from "./copy-button";

export interface ExportItem {
  name: string;
  url: string;
  installCommand?: string | null;
  detailUrl?: string;
}

// Copy/download a stack or collection as a shareable Markdown list. The
// footer link makes pasted lists carry attribution back to AllTools.
export function ExportMarkdown({
  title,
  tagline,
  basePath,
  items,
}: {
  title: string;
  tagline?: string;
  basePath: string;
  items: ExportItem[];
}) {
  const build = () => {
    const lines: string[] = [`# ${title}`];
    if (tagline) lines.push("", `> ${tagline}`);
    lines.push("", ...items.map((t) => `- [${t.name}](${t.url})${t.installCommand ? ` — \`${t.installCommand}\`` : ""}`));
    lines.push("", `---`, `*Generated from [AllTools — The Developer Dictionary](${baseUrl()}${basePath})*`);
    return lines.join("\n");
  };

  const download = () => {
    const blob = new Blob([build()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex shrink-0 gap-2">
      <CopyButton text={build()} label="as Markdown" />
      <button
        type="button"
        onClick={download}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
        aria-label={`Download ${title} as Markdown`}
      >
        <Download className="h-3.5 w-3.5" />
        .md
      </button>
    </div>
  );
}

function baseUrl(): string {
  // Client-side: relative link keeps the attribution portable across hosts.
  return "";
}
