"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/client-store";

export function FavoriteButton({
  slug,
  name,
  variant = "icon",
}: {
  slug: string;
  name?: string;
  variant?: "icon" | "button";
}) {
  const [favorites, toggle] = useFavorites();
  const active = favorites.includes(slug);
  const label = active ? `Remove ${name ?? slug} from favorites` : `Save ${name ?? slug} to favorites`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={() => toggle(slug)}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={`btn-secondary ${active ? "!border-accent !text-accent" : ""}`}
      >
        <Heart className={`h-4 w-4 ${active ? "fill-accent" : ""}`} />
        {active ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-border text-muted-foreground hover:border-accent hover:text-accent"
      }`}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-accent" : ""}`} />
    </button>
  );
}
