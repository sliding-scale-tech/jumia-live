import Link from "next/link";
import { CATEGORY_PANEL, searchHref } from "@/lib/categories";

const TRUST = [
  ["🚚", "Delivery estimate included"],
  ["📊", "90-day price history"],
  ["✅", "Live verified prices"],
  ["🤖", "Personalised AI advice"],
  ["📍", "Lagos, Nigeria"],
];

export function TrustStrip() {
  return (
    <div className="hidden justify-around bg-white px-8 py-2 text-ink-2 md:flex">
      {TRUST.map(([icon, text]) => (
        <span key={text} className="flex items-center gap-1.5">
          <span aria-hidden className="text-sm">{icon}</span>
          {text}
        </span>
      ))}
    </div>
  );
}

export function CategoryPanel() {
  return (
    <aside className="hidden h-fit w-52 shrink-0 overflow-hidden rounded-md border border-line bg-white lg:block" aria-label="Categories">
      <div className="bg-brand-500 px-4 py-3 text-xs font-bold uppercase text-white" style={{ letterSpacing: "0.3px" }}>
        All categories
      </div>
      <ul>
        {CATEGORY_PANEL.map((c) => (
          <li key={c.label} className="border-b border-line-soft last:border-b-0">
            <Link
              href={searchHref(c.q)}
              className="group flex h-[37px] items-center gap-2.5 px-4 text-ink-2 transition-colors hover:bg-brand-50 hover:text-brand-600"
            >
              <span aria-hidden className="text-sm">{c.icon}</span>
              <span className="flex-1">{c.label}</span>
              <span aria-hidden className="text-ink-4">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function PromoCards() {
  const cards = [
    { icon: "⚡", title: "Flash Deals", sub: "Limited-time prices", href: "/#flash-deals", cls: "border-brand-200 bg-brand-50", t: "text-brand-600" },
    { icon: "🚚", title: "Fast delivery", sub: "Get it in 1–2 days", href: searchHref("express"), cls: "border-good-200 bg-good-50", t: "text-good-700" },
    { icon: "🤖", title: "AI buying advice", sub: "Buy now or wait?", href: "/saved", cls: "border-info-200 bg-info-50", t: "text-info-800" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.title} href={c.href} className={`flex flex-col gap-0.5 rounded-md border p-4 transition-shadow hover:shadow-md ${c.cls}`}>
          <span aria-hidden className="text-2xl leading-7">{c.icon}</span>
          <span className={`mt-1 font-bold ${c.t}`}>{c.title}</span>
          <span className="text-ink-3">{c.sub}</span>
        </Link>
      ))}
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  pill,
  href,
  id,
}: {
  icon?: string;
  title: string;
  pill?: string;
  href?: string;
  id?: string;
}) {
  return (
    <div id={id} className="mb-3 flex items-center justify-between scroll-mt-4">
      <div className="flex items-center gap-2">
        {icon && <span aria-hidden className="text-xl leading-5">{icon}</span>}
        <h2 className="text-sm font-bold">{title}</h2>
        {pill && <span className="rounded bg-brand-600 px-2 py-0.5 font-bold text-white">{pill}</span>}
      </div>
      {href && (
        <Link href={href} className="font-medium text-brand-500 hover:underline">
          View all →
        </Link>
      )}
    </div>
  );
}

export function AlertBanner() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-md bg-linear-135 from-brand-500 to-brand-600 px-6 py-5 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-base font-bold leading-6 text-white">Turn on price alerts</h2>
        <p className="mt-1 text-sm text-brand-100">Get notified as soon as a saved product drops in price.</p>
      </div>
      <Link
        href="/saved"
        className="w-full rounded-md bg-white px-5 py-2.5 text-center text-sm font-bold text-brand-500 transition-colors hover:bg-brand-50 sm:w-auto"
      >
        View my watchlist
      </Link>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-8 border-t border-line bg-white px-4 py-3 text-center text-ink-3">
      📍 Prices from Jumia Nigeria, shown for <strong className="font-semibold text-ink">Lagos, Nigeria</strong> · Delivery and taxes are
      estimated and may differ at checkout · Not affiliated with Jumia
    </footer>
  );
}
