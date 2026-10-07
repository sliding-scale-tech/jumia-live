import { proxyJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Delivery + pickup fees of one product for one city. Proxies the scraper so the API key stays on the server. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = parseInt(new URL(req.url).searchParams.get("city") ?? "", 10);
  if (!Number.isInteger(city) || city < 1) return Response.json({ error: "city is required" }, { status: 400 });
  return proxyJson(`/delivery/${encodeURIComponent(slug)}?city=${city}`, 600);
}
