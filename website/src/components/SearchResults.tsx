"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { ProductGrid } from "./ProductCard";

const SORTS = [
  { v: "relevance", label: "Relevance" },
  { v: "price-asc", label: "Price: low to high" },
  { v: "price-desc", label: "Price: high to low" },
  { v: "discount", label: "Biggest discount" },
  { v: "rating", label: "Top rated" },
] as const;

type Sort = (typeof SORTS)[number]["v"];

const field = "h-8 w-full rounded-md border border-line px-2 text-ink placeholder:text-ink-4";

/** Sort + filter the products of the loaded page, entirely in the browser. */
export function SearchResults({ cards, footerFor }: { cards: Card[]; footerFor?: (c: Card) => React.ReactNode }) {
  const [sort, setSort] = useState<Sort>("relevance");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [discounted, setDiscounted] = useState(false);
  const [official, setOfficial] = useState(false);
  const [express, setExpress] = useState(false);

  const brandList = useMemo(() => {
    const n = new Map<string, number>();
    cards.forEach((c) => c.brand && n.set(c.brand, (n.get(c.brand) ?? 0) + 1));
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [cards]);

  const shown = useMemo(() => {
    const lo = min ? Number(min) : null;
    const hi = max ? Number(max) : null;
    const out = cards.filter(
      (c) =>
        (lo == null || (c.price ?? 0) >= lo) &&
        (hi == null || (c.price ?? Infinity) <= hi) &&
        (!brands.length || (c.brand && brands.includes(c.brand))) &&
        (!discounted || (c.discount_percent ?? 0) > 0) &&
        (!official || c.official_store) &&
        (!express || c.jumia_express),
    );
    const by: Record<Sort, ((a: Card, b: Card) => number) | null> = {
      relevance: null,
      "price-asc": (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
      "price-desc": (a, b) => (b.price ?? 0) - (a.price ?? 0),
      discount: (a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.rating_count ?? 0) - (a.rating_count ?? 0),
    };
    const fn = by[sort];
    return fn ? [...out].sort(fn) : out;
  }, [cards, sort, min, max, brands, discounted, official, express]);

  const active = min || max || brands.length || discounted || official || express;
  const reset = () => {
    setMin("");
    setMax("");
    setBrands([]);
    setDiscounted(false);
    setOfficial(false);
    setExpress(false);
  };

  const filters = (
    <div className="space-y-4 p-4">
      <fieldset>
        <legend className="mb-2 font-bold uppercase" style={{ letterSpacing: "0.3px" }}>Price (₦)</legend>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className={field} />
          <span className="text-ink-4">–</span>
          <input inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className={field} />
        </div>
      </fieldset>

      {brandList.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-bold uppercase" style={{ letterSpacing: "0.3px" }}>Brand</legend>
          <div className="space-y-1.5">
            {brandList.map(([b, n]) => (
              <label key={b} className="flex cursor-pointer items-center gap-2 text-ink-2">
                <input
                  type="checkbox"
                  checked={brands.includes(b)}
                  onChange={() => setBrands((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]))}
                  className="accent-brand-500"
                />
                <span className="flex-1 truncate">{b}</span>
                <span className="text-ink-4">{n}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-1.5">
        <legend className="mb-2 font-bold uppercase" style={{ letterSpacing: "0.3px" }}>Show only</legend>
        {[
          ["Discounted", discounted, setDiscounted],
          ["Official Store", official, setOfficial],
          ["Jumia Express", express, setExpress],
        ].map(([label, val, set]) => (
          <label key={label as string} className="flex cursor-pointer items-center gap-2 text-ink-2">
            <input type="checkbox" checked={val as boolean} onChange={(e) => (set as (v: boolean) => void)(e.target.checked)} className="accent-brand-500" />
            {label as string}
          </label>
        ))}
      </fieldset>

      {active ? (
        <button type="button" onClick={reset} className="font-medium text-brand-500 hover:underline">
          Clear filters
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[208px_1fr]">
      <aside className="h-fit overflow-hidden rounded-md border border-line bg-white" aria-label="Filters">
        <div className="bg-brand-500 px-4 py-3 font-bold uppercase text-white" style={{ letterSpacing: "0.3px" }}>Filters</div>
        <details className="lg:hidden">
          <summary className="cursor-pointer px-4 py-2.5 font-medium text-brand-500">Show filters</summary>
          {filters}
        </details>
        <div className="hidden lg:block">{filters}</div>
      </aside>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-ink-3">
            {shown.length === cards.length ? `${cards.length} products on this page` : `${shown.length} of ${cards.length} products match`}
          </span>
          <label className="flex items-center gap-2 text-ink-3">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-8 rounded-md border border-line bg-white px-2 text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {shown.length ? (
          <ProductGrid cards={shown} cols={3} footerFor={footerFor} animate />
        ) : (
          <div className="rounded-md border border-line bg-white p-10 text-center text-ink-3">No products match these filters.</div>
        )}
      </div>
    </div>
  );
}
