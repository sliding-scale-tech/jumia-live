"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { searchHref } from "@/lib/categories";

const SLIDES = [
  {
    bg: "from-good-700 to-good-900",
    badge: "SAVE",
    title: "Up to 15% off",
    sub: "On Samsung phones right now",
    chips: ["iPhone 17", "AirPods Pro", "PlayStation 5", "Galaxy S25"],
    emoji: "📲",
    cta: "Compare now",
    ctaQ: "samsung",
  },
  {
    bg: "from-info-800 to-info-900",
    badge: "NEW",
    title: "Best laptop deals",
    sub: "Compare prices across Jumia sellers",
    chips: ["HP laptop", "Dell", "MacBook", "Lenovo"],
    emoji: "💻",
    cta: "Browse laptops",
    ctaQ: "laptop",
  },
];

export function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [paused, reduced]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative grid overflow-hidden rounded-md md:h-[250px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {SLIDES.map((s, n) => (
        <div
          key={s.title}
          aria-hidden={n !== i}
          className={`col-start-1 row-start-1 flex items-center justify-between gap-6 bg-linear-135 px-5 pb-10 pt-6 transition-opacity duration-500 sm:px-8 sm:pt-7 ${s.bg} ${
            n === i ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="min-w-0 max-w-[648px] flex-1">
            <span className="inline-block rounded bg-white/25 px-2 py-0.5 font-bold text-white">{s.badge}</span>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl sm:leading-[38px]">{s.title}</h2>
            <p className="mt-1 text-sm leading-5 text-white/80">{s.sub}</p>

            <form action="/search" className="mt-5 flex h-11 max-w-[448px]" tabIndex={n === i ? 0 : -1}>
              <input
                name="q"
                required
                maxLength={80}
                tabIndex={n === i ? 0 : -1}
                placeholder="e.g. iPhone 17, Galaxy S25…"
                aria-label="Product to compare"
                className="min-w-0 flex-1 rounded-l-md bg-white px-4 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <button
                type="submit"
                tabIndex={n === i ? 0 : -1}
                className="shrink-0 rounded-r-md bg-brand-500 px-5 text-sm font-bold text-white transition-colors hover:bg-[#ef6c00]"
              >
                Compare
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {s.chips.map((c) => (
                <Link
                  key={c}
                  href={searchHref(c)}
                  tabIndex={n === i ? 0 : -1}
                  className="rounded-full bg-white/20 px-2.5 py-1 font-medium text-white transition-colors hover:bg-white/30"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden shrink-0 flex-col items-center gap-3 md:flex">
            <span aria-hidden className="text-[96px] leading-none">{s.emoji}</span>
            <Link
              href={searchHref(s.ctaQ)}
              tabIndex={n === i ? 0 : -1}
              className="w-36 rounded-full bg-white/90 px-5 py-3 text-center font-bold text-brand-500 transition-colors hover:bg-white"
            >
              {s.cta}
            </Link>
          </div>
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
        {SLIDES.map((s, n) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Show slide ${n + 1}`}
            aria-current={n === i}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full bg-white transition-all ${n === i ? "w-5" : "w-1.5 opacity-40"}`}
          />
        ))}
      </div>
    </section>
  );
}
