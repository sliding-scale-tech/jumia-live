import type { HistoryPoint } from "@/lib/api";
import { naira } from "@/lib/format";

const fmt = (t: number) => new Date(t * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

/** Step chart of the prices the scraper has recorded. Plain SVG, no chart library. */
export function PriceHistory({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-ink-3">
        {points.length === 1 ? `Tracking started at ${naira(points[0].price)} on ${fmt(points[0].at)}. ` : ""}
        We chart every price change the scraper sees — check back after a few days.
      </p>
    );
  }

  const W = 600;
  const H = 150;
  const pad = { l: 8, r: 8, t: 12, b: 20 };
  const t0 = points[0].at;
  const t1 = Math.max(points[points.length - 1].at, t0 + 1);
  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = hi - lo || 1;
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);

  // step line: price stays flat until the next change
  let d = `M ${x(points[0].at)} ${y(points[0].price)}`;
  points.slice(1).forEach((p, i) => {
    d += ` L ${x(p.at)} ${y(points[i].price)} L ${x(p.at)} ${y(p.price)}`;
  });
  const last = points[points.length - 1];
  const change = last.price - points[0].price;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-ink-3">
        <span>Lowest <strong className="text-good-700">{naira(lo)}</strong></span>
        <span>Highest <strong className="text-brand-600">{naira(hi)}</strong></span>
        <span>
          Change{" "}
          <strong className={change <= 0 ? "text-good-700" : "text-brand-600"}>
            {change <= 0 ? "▼" : "▲"} {naira(Math.abs(change))}
          </strong>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Price went from ${naira(points[0].price)} to ${naira(last.price)}`}>
        <path d={`${d} L ${x(t1)} ${y(last.price)} L ${x(t1)} ${H - pad.b} L ${x(t0)} ${H - pad.b} Z`} fill="var(--color-brand-50)" />
        <path d={`${d} L ${x(t1)} ${y(last.price)}`} fill="none" stroke="var(--color-brand-500)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.at} cx={x(p.at)} cy={y(p.price)} r="3" fill="#fff" stroke="var(--color-brand-600)" strokeWidth="2" />
        ))}
        <text x={pad.l} y={H - 4} fontSize="10" fill="var(--color-ink-4)">{fmt(t0)}</text>
        <text x={W - pad.r} y={H - 4} fontSize="10" textAnchor="end" fill="var(--color-ink-4)">{fmt(t1)}</text>
      </svg>
    </div>
  );
}
