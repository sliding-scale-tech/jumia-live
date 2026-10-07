"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { naira } from "@/lib/format";
import { removeSaved, useSaved } from "@/lib/saved";

export function Watchlist() {
  const saved = useSaved();
  const [current, setCurrent] = useState<Record<string, number | null>>({});

  const slugs = saved.map((s) => s.slug).join("|");
  useEffect(() => {
    let live = true;
    const todo = slugs ? slugs.split("|") : [];
    (async () => {
      for (const slug of todo) {
        try {
          const r = await fetch(`/api/price/${encodeURIComponent(slug)}`);
          const j = (await r.json()) as { price: number | null };
          if (live) setCurrent((c) => ({ ...c, [slug]: j.price }));
        } catch {
          if (live) setCurrent((c) => ({ ...c, [slug]: null }));
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [slugs]);

  if (!saved.length) {
    return (
      <div className="rounded-md border border-line bg-white p-10 text-center">
        <div aria-hidden className="text-5xl">♡</div>
        <h2 className="mt-3 text-sm font-bold">Nothing saved yet</h2>
        <p className="mt-1 text-ink-3">Tap the heart on any product to track its price here.</p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ef6c00]">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
      {saved.map((s) => {
        const now = current[s.slug];
        const delta = now != null && s.price != null ? now - s.price : null;
        return (
          <article key={s.slug} className="relative flex flex-col overflow-hidden rounded-md border border-line bg-white">
            <div className="flex h-32 items-center justify-center bg-surface-2">
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-28 max-w-[85%] object-contain mix-blend-multiply" />
              ) : (
                <span aria-hidden className="text-5xl">📦</span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-3">
              <h3 className="line-clamp-2 min-h-[30px] font-semibold leading-[15px]">
                <Link href={`/product/${encodeURIComponent(s.slug)}`} className="after:absolute after:inset-0 hover:text-brand-600">
                  {s.name}
                </Link>
              </h3>
              <p className="mt-0.5 h-4 truncate text-ink-4">{s.brand ?? ""}</p>
              <p className="mt-2 text-ink-3">Saved at {naira(s.price)}</p>
              <p className="text-sm font-bold leading-5 text-brand-500">{now === undefined ? "Checking…" : naira(now)}</p>
              {delta != null && delta !== 0 && (
                <p className={`mt-0.5 font-medium ${delta < 0 ? "text-good-700" : "text-brand-600"}`}>
                  {delta < 0 ? "▼" : "▲"} {naira(Math.abs(delta))} {delta < 0 ? "cheaper" : "more expensive"}
                </p>
              )}
              <button
                type="button"
                onClick={() => removeSaved(s.slug)}
                className="relative z-10 mt-auto self-start pt-2 text-ink-3 hover:text-brand-600 hover:underline"
              >
                ✕ Remove
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
