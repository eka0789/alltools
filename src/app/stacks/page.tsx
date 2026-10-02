import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { StackPicker } from "@/components/stack-picker";
import { STACKS } from "@/lib/stacks";

export const metadata: Metadata = {
  title: "Stack Explorer — Show me everything for my stack",
  description:
    "Select your technologies and get a personalized developer toolbox: frontend, backend, database, deployment, testing, monitoring and AI tools for your stack.",
  alternates: { canonical: "/stacks" },
};

export default function StacksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Layers className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stack Explorer</h1>
          <p className="text-sm text-muted-foreground">
            “Show me everything for my stack.” — pick your technologies and get a
            personalized toolbox.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <StackPicker />
      </div>

      <h2 className="mt-12 text-lg font-semibold tracking-tight">
        Popular stacks
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STACKS.map((stack) => (
          <Link
            key={stack.slug}
            href={`/stacks/${stack.slug}`}
            className="card p-4 transition-colors hover:border-accent/40"
          >
            <span className="block font-medium">{stack.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {stack.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
