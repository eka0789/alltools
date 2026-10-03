"use client";

import { useState } from "react";
import { Flag, Send, X } from "lucide-react";

// "Report broken link / suggest edit" affordance on tool pages. Posts to
// /api/feedback which lands in the admin moderation queue.
export function FeedbackButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"broken_link" | "edit_suggestion">("broken_link");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolSlug: slug, type, message, website: "" }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (res.ok && data.ok) {
        setState("done");
        setTimeout(() => {
          setOpen(false);
          setState("idle");
          setMessage("");
        }, 1800);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        <Flag className="h-3 w-3" />
        Report an issue
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="absolute bottom-full right-0 z-30 mb-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Report an issue</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close report form"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {state === "done" ? (
            <p className="mt-3 text-sm text-success">
              Thanks! The moderators will take a look. 🙏
            </p>
          ) : (
            <>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fb-type"
                    checked={type === "broken_link"}
                    onChange={() => setType("broken_link")}
                  />
                  Link is broken
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fb-type"
                    checked={type === "edit_suggestion"}
                    onChange={() => setType("edit_suggestion")}
                  />
                  Details need an update
                </label>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Anything we should know? (optional)"
                className="input mt-2 text-sm"
              />
              {state === "error" && (
                <p className="mt-2 text-xs text-warning">
                  Couldn&apos;t send right now — please try again later.
                </p>
              )}
              <button
                type="submit"
                disabled={state === "sending"}
                className="btn-primary mt-3 w-full !py-1.5 text-xs disabled:opacity-60"
              >
                <Send className="h-3 w-3" />
                {state === "sending" ? "Sending…" : "Send report"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
