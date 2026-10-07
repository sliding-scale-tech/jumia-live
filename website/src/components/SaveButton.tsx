"use client";

import { toggleSaved, useSaved } from "@/lib/saved";

type Item = { slug: string; name: string; brand: string | null; image: string | null; price: number | null };

/** variant "icon": small heart on a card. variant "full": button on the product page. */
export function SaveButton({ item, variant = "icon" }: { item: Item; variant?: "icon" | "full" }) {
  const saved = useSaved().some((s) => s.slug === item.slug);

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggleSaved(item)}
        aria-pressed={saved}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-brand-500 bg-white px-5 text-sm font-bold text-brand-500 transition-colors hover:bg-brand-50"
      >
        <span aria-hidden>{saved ? "♥" : "♡"}</span>
        {saved ? "Saved to watchlist" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggleSaved(item)}
      aria-pressed={saved}
      aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
      className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm text-brand-600 shadow-sm transition-transform hover:scale-110"
    >
      <span aria-hidden>{saved ? "♥" : "♡"}</span>
    </button>
  );
}
