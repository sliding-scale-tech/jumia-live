import Link from "next/link";
import type { Card } from "@/lib/types";
import { cardHref, compact, naira, slugFromUrl } from "@/lib/format";
import { SaveButton } from "./SaveButton";

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={`relative inline-block whitespace-nowrap text-[#d1d5db] ${className}`} aria-label={`${value} out of 5`}>
      ★★★★★
      <span className="absolute inset-y-0 left-0 overflow-hidden text-[#f59e0b]" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

/**
 * "deal"  = Flash Deals card (discount badge, old price, rating bar)
 * "trend" = trending / search card (brand, reviews, discount, tags)
 */
export function ProductCard({
  card,
  variant = "trend",
  footer,
}: {
  card: Card;
  variant?: "deal" | "trend";
  footer?: React.ReactNode;
}) {
  const discount = card.discount_percent ? Math.round(card.discount_percent) : 0;
  const slug = slugFromUrl(card.url);
  const tags = [card.official_store && "Official Store", card.jumia_express && "Express"].filter(Boolean) as string[];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-white transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="relative flex h-32 items-center justify-center bg-surface-2">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-28 max-w-[85%] object-contain mix-blend-multiply"
          />
        ) : (
          <span aria-hidden className="text-5xl">📦</span>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-brand-600 px-1.5 py-0.5 font-bold text-white">-{discount}%</span>
        )}
        <div className="absolute right-2 top-2">
          <SaveButton item={{ slug, name: card.name, brand: card.brand, image: card.image, price: card.price }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[30px] font-semibold leading-[15px]">
          <Link href={cardHref(card)} className="transition-colors after:absolute after:inset-0 group-hover:text-brand-600">
            {card.name}
          </Link>
        </h3>

        {variant === "deal" ? (
          <>
            <p className="mt-2 h-4 text-ink-4 line-through">{card.old_price ? naira(card.old_price) : ""}</p>
            <p className="mt-0.5 text-sm font-bold leading-5 text-brand-500">{naira(card.price)}</p>
            {card.rating ? (
              <div className="mt-2">
                <div className="flex justify-between">
                  <span className="text-ink-4">Rating</span>
                  <span className="text-brand-600">
                    {card.rating.toFixed(1)} ★ ({compact(card.rating_count)})
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(card.rating / 5) * 100}%` }} />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-0.5 h-4 truncate text-ink-4">{card.brand ?? ""}</p>
            <p className="mt-2 text-sm font-bold leading-5 text-brand-500">{naira(card.price)}</p>
            <div className="mt-0.5 flex justify-between text-ink-3">
              <span>{card.rating_count ? `${compact(card.rating_count)} reviews` : "No reviews yet"}</span>
              {discount > 0 && <span className="font-medium text-good-700">-{discount}%</span>}
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t} className="rounded bg-line-soft px-1.5 py-0.5 text-ink-3">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        {footer}
      </div>
    </article>
  );
}

export function ProductGrid({
  cards,
  variant = "trend",
  cols = 4,
  footerFor,
  animate = false,
}: {
  cards: Card[];
  variant?: "deal" | "trend";
  cols?: 3 | 4;
  footerFor?: (c: Card) => React.ReactNode;
  animate?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 ${cols === 4 ? "lg:grid-cols-4" : ""}`}>
      {cards.map((c) => (
        <div key={c.product_id} className={`flex flex-col *:flex-1 ${animate ? "card-in" : ""}`}>
          <ProductCard card={c} variant={variant} footer={footerFor?.(c)} />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-md border border-line bg-white">
          <div className="skeleton h-32 rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-3 w-11/12" />
            <div className="skeleton h-3 w-2/3" />
            <div className="skeleton h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
