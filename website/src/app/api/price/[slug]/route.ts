import { NextResponse } from "next/server";
import { getProduct } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Used by the watchlist page to re-check the current price. Proxies the scraper API so the key stays on the server. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const p = await getProduct(slug);
    return NextResponse.json({ price: p.pricing.price, old_price: p.pricing.old_price });
  } catch {
    return NextResponse.json({ price: null }, { status: 502 });
  }
}
