"use client";

import { useState } from "react";
import { FileCode2, Lock } from "lucide-react";

export interface PreviewFile {
  path: string;
  content: string | null; // null = locked premium file
}

export function TemplateFilePreview({ files }: { files: PreviewFile[] }) {
  const defaultIdx = Math.max(
    0,
    files.findIndex((f) => f.content !== null),
  );
  const [selected, setSelected] = useState(defaultIdx);
  const active = files[selected] ?? files[0];

  if (!active) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Struktur file ({files.length} file)</h2>
        <span className="text-xs text-muted-foreground">Klik file untuk pratinjau</span>
      </div>
      <div className="card mt-3 grid overflow-hidden md:grid-cols-[220px_1fr]">
        <div className="max-h-80 overflow-y-auto border-b border-border bg-muted/30 p-2 md:border-b-0 md:border-r">
          <ul className="space-y-0.5">
            {files.map((f, idx) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setSelected(idx)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left font-mono text-xs transition-colors ${
                    idx === selected
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f.content === null ? (
                    <Lock className="h-3 w-3 shrink-0 opacity-70" />
                  ) : (
                    <FileCode2 className="h-3 w-3 shrink-0 opacity-70" />
                  )}
                  <span className="truncate">{f.path}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2 font-mono text-xs text-muted-foreground">
            <span className="truncate">{active.path}</span>
            {active.content === null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-accent">
                <Lock className="h-3 w-3" /> Premium
              </span>
            )}
          </div>
          {active.content === null ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
              <Lock className="h-6 w-6 text-muted-foreground/60" />
              <p className="text-sm font-medium">File lengkap tersedia dalam paket ZIP</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Beli template ini atau aktifkan Pro Lifetime untuk membuka dan mengunduh
                seluruh kode sumber siap produksi.
              </p>
            </div>
          ) : (
            <pre className="max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground">
              <code>{active.content}</code>
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}
