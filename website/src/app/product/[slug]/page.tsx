import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryBox } from "@/components/DeliveryBox";
import { Gallery } from "@/components/Gallery";
import { Stars } from "@/components/ProductCard";
import { SaveButton } from "@/components/SaveButton";
import { ErrorCard } from "@/components/States";
import { PriceHistory } from "@/components/PriceHistory";
import { ApiError, getHistory, getProduct } from "@/lib/api";
import { compact, naira } from "@/lib/format";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<{ p?: Product; error?: string }> {
  try {
    return { p: await getProduct(slug) };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { p } = await load(slug);
  return { title: p ? p.title || p.name : "Product" };
}

const dot = (v: string) =>
  /excellent|good/i.test(v) ? "bg-good-700" : /average|fair/i.test(v) ? "bg-[#f59e0b]" : "bg-brand-600";

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-line bg-white ${className}`}>
      <h2 className="border-b border-line-soft px-5 py-3 text-sm font-bold">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { p, error } = await load(slug);
  if (error || !p) return <ErrorCard message={error ?? "No data"} />;
  const history = await getHistory(slug).catch(() => []);

  const price = p.pricing.price;
  const discount = p.pricing.discount_percent ? Math.round(p.pricing.discount_percent) : 0;
  const inStock = p.availability.status === "InStock" || /in stock/i.test(p.availability.stock_text ?? "");
  const crumbs = p.category.breadcrumbs;
  const specs = Object.entries(p.specifications);
  const total = Object.values(p.ratings.breakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-x-1 text-ink-3">
        <Link href="/" className="hover:underline">Home</Link>
        {crumbs.map((c) => (
          <span key={c.name}>
            › <Link href={`/search?q=${encodeURIComponent(c.name)}`} className="hover:underline">{c.name}</Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 rounded-md border border-line bg-white p-5 md:grid-cols-[minmax(0,420px)_1fr]">
        <Gallery images={p.images} alt={p.name} />

        <div className="min-w-0">
          {p.brand && <p className="font-bold uppercase text-brand-600" style={{ letterSpacing: "0.3px" }}>{p.brand}</p>}
          <h1 className="mt-1 text-xl font-bold leading-7">{p.title || p.name}</h1>

          {p.ratings.average ? (
            <p className="mt-2 flex items-center gap-2 text-ink-3">
              <Stars value={p.ratings.average} className="text-sm" />
              <span>
                {p.ratings.average.toFixed(1)} ({compact(p.ratings.count)} verified ratings)
              </span>
            </p>
          ) : (
            <p className="mt-2 text-ink-3">No ratings yet</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[28px] font-bold leading-9 text-brand-500">{naira(price)}</span>
            {p.pricing.old_price ? <span className="text-sm text-ink-4 line-through">{naira(p.pricing.old_price)}</span> : null}
            {discount > 0 && <span className="rounded bg-brand-600 px-2 py-0.5 font-bold text-white">-{discount}%</span>}
          </div>

          <p className="mt-2 text-ink-3">
            {p.pricing.shipping_from != null ? `+ ${naira(p.pricing.shipping_from)} delivery from` : "Delivery fee calculated at checkout"}
            {" · "}
            <span className={inStock ? "font-medium text-good-700" : "font-medium text-brand-600"}>
              {inStock ? "In stock" : p.availability.stock_text || "Check availability"}
            </span>
            {p.availability.units_left ? ` · only ${p.availability.units_left} left` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.badges.official_store && <span className="rounded bg-line-soft px-2 py-0.5 text-ink-3">Official Store</span>}
            {p.badges.jumia_express && <span className="rounded bg-line-soft px-2 py-0.5 text-ink-3">Jumia Express</span>}
            {p.badges.pay_on_delivery && <span className="rounded bg-line-soft px-2 py-0.5 text-ink-3">Pay on delivery</span>}
            {p.availability.condition && <span className="rounded bg-line-soft px-2 py-0.5 text-ink-3">{p.availability.condition.replace("Condition", "")}</span>}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center rounded-md bg-brand-500 px-6 text-sm font-bold text-white transition-colors hover:bg-[#ef6c00]"
            >
              View on Jumia ↗
            </a>
            <SaveButton variant="full" item={{ slug, name: p.name, brand: p.brand, image: p.images[0] ?? null, price }} />
          </div>

          {p.key_features.length > 0 && (
            <ul className="mt-6 list-disc space-y-1 pl-5 text-ink-2 marker:text-brand-500">
              {p.key_features.slice(0, 8).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card title="Price history · last 90 days">
            <PriceHistory points={history} />
          </Card>

          {(specs.length > 0 || p.description) && (
            <Card title="Specifications">
              {p.description && <p className="mb-4 whitespace-pre-line leading-5 text-ink-2">{p.description}</p>}
              {specs.length > 0 && (
                <table className="w-full text-left">
                  <tbody>
                    {specs.map(([k, v]) => (
                      <tr key={k} className="odd:bg-line-soft">
                        <th className="w-2/5 px-3 py-2 font-medium text-ink-3">{k}</th>
                        <td className="px-3 py-2 text-ink-2">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {p.reviews.length > 0 && (
            <Card title="Verified customer feedback">
              <ul className="divide-y divide-line-soft">
                {p.reviews.map((r, i) => (
                  <li key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      {r.rating ? <Stars value={r.rating} className="text-sm" /> : null}
                      {r.title && <span className="font-semibold">{r.title}</span>}
                    </div>
                    {r.body && <p className="mt-1 text-ink-2">{r.body.trim()}</p>}
                    <p className="mt-1 text-ink-4">
                      {r.author ? `by ${r.author}` : "Verified buyer"}
                      {r.date ? ` · ${r.date}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {p.delivery_returns && (
            <Card title="Delivery & returns">
              <p className="whitespace-pre-line leading-5 text-ink-2">
                {p.delivery_returns.replace(/^Delivery & Returns\s*/i, "").replace(/\s*Details\s*Choose.*$/is, "").trim()}
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <DeliveryBox slug={slug} initial={p.delivery ?? null} price={price} />

          {p.seller.name && (
            <Card title="Seller">
              <p className="text-sm font-bold">{p.seller.name}</p>
              <p className="mt-1 text-ink-3">
                {p.seller.score_percent != null && `${p.seller.score_percent}% seller score`}
                {p.seller.followers != null && ` · ${compact(p.seller.followers)} followers`}
              </p>
              {p.seller.performance && Object.keys(p.seller.performance).length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {Object.entries(p.seller.performance).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between text-ink-2">
                      {k}
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className={`h-2 w-2 rounded-full ${dot(v)}`} aria-hidden />
                        {v}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {total > 0 && (
            <Card title="Rating breakdown">
              <ul className="space-y-1.5">
                {["5", "4", "3", "2", "1"].map((s) => {
                  const n = p.ratings.breakdown[s] ?? 0;
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className="w-6 text-ink-3">{s} ★</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(n / total) * 100}%` }} />
                      </span>
                      <span className="w-10 text-right text-ink-3">{compact(n)}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
