export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Live search stream. Proxies the scraper's Server-Sent Events so the browser can show each product the
 * moment it is scraped, while the API key stays on the server.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = Math.min(50, Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
  const details = Math.min(24, Math.max(0, parseInt(url.searchParams.get("details") ?? "12", 10) || 0));
  if (!q) return Response.json({ error: "missing q" }, { status: 400 });

  const base = process.env.SCRAPER_API_URL?.replace(/\/+$/, "");
  const key = process.env.SCRAPER_API_KEY;
  if (!base || !key) return Response.json({ error: "server is not configured" }, { status: 500 });

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/stream/search?q=${encodeURIComponent(q)}&page=${page}&details=${details}`, {
      headers: { "x-api-key": key, accept: "text/event-stream" },
      cache: "no-store",
      signal: req.signal, // browser left -> stop the scraper work too
    });
  } catch {
    return Response.json({ error: "The data server is not reachable right now" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "The data server returned an error" }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
