"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { compact, naira } from "@/lib/format";
import { RadarLoader } from "./RadarLoader";
import { SearchResults } from "./SearchResults";
import { EmptyResults, ErrorCard } from "./States";

export interface Detail {
  ok: boolean;
  cached?: boolean;
  seller?: string | null;
  seller_score?: number | null;
  units_left?: number | null;
  specs?: number;
  reviews?: number;
  /** fees for Jumia's default location (Lagos), from the product page */
  delivery?: { type: "pickup" | "door"; fee: number | null }[];
}

interface Meta {
  total: number | null;
  last_page: number;
  count: number;
  source: "live" | "database" | "stale";
}

type Phase = "connecting" | "streaming" | "details" | "done" | "error";

/** Parse a Server-Sent-Events body: calls onEvent(name, data) for every complete event. */
async function readSSE(res: Response, onEvent: (name: string, data: unknown) => void) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let name = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) onEvent(name, JSON.parse(data));
    }
  }
}

function pageList(cur: number, last: number): (number | "…")[] {
  const set = new Set([1, 2, cur - 1, cur, cur + 1, last - 1, last].filter((n) => n >= 1 && n <= last));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function LiveSearch({ q, page }: { q: string; page: number }) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [status, setStatus] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progress, setProgress] = useState({ i: 0, n: 0 });
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const ctrl = new AbortController();
    seen.current = new Set();
    setPhase("connecting");
    setStatus("");
    setCards([]);
    setDetails({});
    setMeta(null);
    setProgress({ i: 0, n: 0 });
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/stream/search?q=${encodeURIComponent(q)}&page=${page}`, { signal: ctrl.signal });
        if (!res.ok || !res.body) throw new Error("The data server is not reachable right now");
        await readSSE(res, (name, data) => {
          const d = data as Record<string, unknown>;
          if (name === "status") setStatus(String(d.msg ?? ""));
          else if (name === "meta") setMeta(d as unknown as Meta);
          else if (name === "card") {
            const c = d as unknown as Card;
            if (seen.current.has(c.product_id)) return;
            seen.current.add(c.product_id);
            setCards((cur) => [...cur, c]);
            setPhase("streaming");
          } else if (name === "detail") {
            setDetails((cur) => ({ ...cur, [String(d.product_id)]: d as unknown as Detail }));
            setProgress({ i: Number(d.i), n: Number(d.n) });
            setPhase("details");
          } else if (name === "error") {
            setError(String(d.msg ?? "Something went wrong"));
            setPhase("error");
          } else if (name === "done") setPhase("done");
        });
        setPhase((p) => (p === "error" ? p : "done"));
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
        setPhase("error");
      }
    })();

    return () => ctrl.abort("navigated away");
  }, [q, page, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const href = (p: number) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ""}`;

  if (phase === "error" && cards.length === 0) return <ErrorCard message={error ?? "Something went wrong"} retry={retry} />;
  if (phase === "done" && cards.length === 0) return <EmptyResults query={q} />;
  if (cards.length === 0) return <RadarLoader title={`Scanning Jumia for “${q}”`} status={status} />;

  const expected = meta?.count ?? 40;
  const live = phase === "streaming" || phase === "details";
  const pct = phase === "done" ? 100 : phase === "details" && progress.n ? 50 + (progress.i / progress.n) * 50 : (cards.length / expected) * 50;

  return (
    <div>
      {/* live status bar */}
      <div className="mb-4 rounded-md border border-line bg-white px-4 py-3" role="status" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            {live ? (
              <>
                <span className="h-2 w-2 rounded-full bg-brand-500" style={{ animation: "live-dot 1s ease-in-out infinite" }} />
                <span className="rounded bg-brand-600 px-1.5 py-0.5 font-bold text-white">LIVE</span>
              </>
            ) : (
              <span className="rounded bg-good-700 px-1.5 py-0.5 font-bold text-white">DONE</span>
            )}
            <span className="text-ink-2">
              {phase === "streaming" && `Receiving products… ${cards.length}/${expected}`}
              {phase === "details" && (progress.i < progress.n ? `Reading product pages ${progress.i}/${progress.n}…` : "Finishing up…")}
              {phase === "done" && `${cards.length} products${Object.values(details).filter((d) => d.ok).length ? " · seller info loaded" : ""}`}
            </span>
          </span>
          <span className="text-ink-3">
            {meta?.source === "database" && "Served from the database"}
            {meta?.source === "live" && "Fresh from Jumia"}
            {meta?.source === "stale" && "Older saved copy (Jumia unreachable)"}
            {meta?.total != null && ` · ${compact(meta.total)} results in total`}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-soft">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <SearchResults
        cards={cards}
        footerFor={(c) => {
          const d = details[c.product_id];
          if (d?.ok) {
            return (
              <div className="mt-2 border-t border-line-soft pt-2 text-ink-3">
                <span className="font-medium text-good-700">✓</span> {d.seller ?? "Seller loaded"}
                {d.seller_score != null && ` · ${d.seller_score}%`}
                {d.units_left ? <span className="ml-1 font-medium text-brand-600">· {d.units_left} left</span> : null}
                {d.delivery && d.delivery.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-ink-2">
                    {(["pickup", "door"] as const).map((t) => {
                      const o = d.delivery!.find((x) => x.type === t);
                      return (
                        <span key={t} title={t === "pickup" ? "Pickup Station fee" : "Door Delivery fee"}>
                          <span aria-hidden>{t === "pickup" ? "🏬" : "🚚"}</span>{" "}
                          <span className="sr-only">{t === "pickup" ? "Pickup" : "Door delivery"}</span>
                          <strong className="font-semibold">{o?.fee != null ? naira(o.fee) : "—"}</strong>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          if (d && !d.ok) return null;
          return phase === "details" ? <div className="shimmer mt-2 h-3 w-3/4" aria-hidden /> : null;
        }}
      />

      {meta && meta.last_page > 1 && (phase === "done" || phase === "details") && (
        <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          {page > 1 && (
            <Link href={href(page - 1)} className="flex h-8 items-center rounded-md border border-line bg-white px-3 hover:border-brand-500">
              ‹ Prev
            </Link>
          )}
          {pageList(page, meta.last_page).map((p, i) =>
            p === "…" ? (
              <span key={`g${i}`} className="px-1 text-ink-4">…</span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 ${
                  p === page ? "border-brand-500 bg-brand-500 font-bold text-white" : "border-line bg-white hover:border-brand-500"
                }`}
              >
                {p}
              </Link>
            ),
          )}
          {page < meta.last_page && (
            <Link href={href(page + 1)} className="flex h-8 items-center rounded-md border border-line bg-white px-3 hover:border-brand-500">
              Next ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
