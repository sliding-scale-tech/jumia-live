"use client";

import { useEffect, useState } from "react";

const BLIPS = [
  { icon: "📱", top: "14%", left: "58%", delay: "0.3s" },
  { icon: "🎧", top: "56%", left: "82%", delay: "1.1s" },
  { icon: "🎮", top: "78%", left: "40%", delay: "1.9s" },
  { icon: "💻", top: "40%", left: "10%", delay: "2.6s" },
];

const FALLBACK_STEPS = [
  "Connecting to the scraper…",
  "Asking Jumia for the latest prices…",
  "Waiting for the first product…",
];

/**
 * Brand-coloured radar: sweeping beam, expanding rings, product emoji "blips" that light up as the beam passes.
 * Shown from the moment a request starts until the first product arrives. See design.md section 5.5.
 */
export function RadarLoader({ title, status }: { title: string; status?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((n) => (n + 1) % FALLBACK_STEPS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div role="status" aria-live="polite" className="overflow-hidden rounded-md border border-line bg-white px-6 py-10 text-center">
      <div className="relative mx-auto h-[220px] w-[220px]">
        {/* static rings */}
        {[100, 68, 36].map((p) => (
          <span
            key={p}
            className="absolute rounded-full border border-brand-200"
            style={{ inset: `${(100 - p) / 2}%`, background: p === 36 ? "var(--color-brand-50)" : undefined }}
          />
        ))}
        <span className="absolute left-0 right-0 top-1/2 h-px bg-brand-200" />
        <span className="absolute bottom-0 left-1/2 top-0 w-px bg-brand-200" />

        {/* expanding pings */}
        {[0, 1.2].map((d) => (
          <span
            key={d}
            className="absolute inset-0 rounded-full border-2 border-brand-500"
            style={{ animation: "radar-ping 2.4s ease-out infinite", animationDelay: `${d}s` }}
          />
        ))}

        {/* sweeping beam */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, rgba(245,124,0,0) 0deg, rgba(245,124,0,0) 250deg, rgba(245,124,0,0.5) 358deg, #f57c00 360deg)",
            animation: "radar-sweep 2.8s linear infinite",
            maskImage: "radial-gradient(circle, #000 98%, transparent 100%)",
          }}
        />

        {/* product blips */}
        {BLIPS.map((b) => (
          <span
            key={b.icon}
            aria-hidden
            className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl"
            style={{ top: b.top, left: b.left, opacity: 0, animation: "radar-blip 2.8s ease-out infinite", animationDelay: b.delay }}
          >
            {b.icon}
          </span>
        ))}

        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 ring-4 ring-white" />
      </div>

      <h2 className="mt-6 text-sm font-bold">{title}</h2>
      <p className="mt-1 h-4 text-ink-3">{status || FALLBACK_STEPS[step]}</p>

      {/* indeterminate bar, same shape as the "stock left" bar on the cards */}
      <div className="mx-auto mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-line-soft" aria-hidden>
        <div className="h-full w-1/3 rounded-full bg-brand-500" style={{ animation: "bar-slide 1.4s ease-in-out infinite" }} />
      </div>

      <p className="mt-4 inline-flex items-center gap-1.5 rounded bg-brand-600 px-2 py-0.5 font-bold text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white" style={{ animation: "live-dot 1s ease-in-out infinite" }} />
        LIVE FROM THE SCRAPER
      </p>
    </div>
  );
}
