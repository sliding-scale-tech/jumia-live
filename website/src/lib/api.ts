import type { HomeData, Product, SearchResult } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Server-side call to the scraper API on the Hostinger server. The key never reaches the browser. */
async function call<T>(path: string, revalidate: number): Promise<T> {
  const base = process.env.SCRAPER_API_URL?.replace(/\/+$/, "");
  const key = process.env.SCRAPER_API_KEY;
  if (!base || !key) throw new ApiError(500, "SCRAPER_API_URL / SCRAPER_API_KEY are not set");
  let res: Response;
  try {
    res = await fetch(base + path, {
      headers: { "x-api-key": key },
      next: { revalidate },
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new ApiError(502, "The data server is not reachable right now");
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.status === 404 ? "Not found" : "The data server returned an error");
  }
  return res.json() as Promise<T>;
}

export const getHome = () => call<HomeData>("/home", 600);

export const searchProducts = (q: string, page = 1) =>
  call<SearchResult>(`/search?q=${encodeURIComponent(q)}&page=${page}`, 600);

export const getProduct = (slug: string) => call<Product>(`/product/${encodeURIComponent(slug)}`, 1800);

/** Forward a GET to the scraper API and return its JSON as a Response (used by the /api/* proxy routes). */
export async function proxyJson(path: string, revalidate: number): Promise<Response> {
  try {
    const data = await call<unknown>(path, revalidate);
    return Response.json(data, { headers: { "cache-control": `private, max-age=${Math.min(revalidate, 300)}` } });
  } catch (e) {
    const status = e instanceof ApiError && e.status < 500 ? e.status : 502;
    return Response.json({ error: e instanceof Error ? e.message : "error" }, { status });
  }
}

export interface HistoryPoint {
  price: number;
  old_price: number | null;
  at: number; // unix seconds
}

export const getHistory = (slug: string) =>
  call<{ points: HistoryPoint[] }>(`/product/${encodeURIComponent(slug)}/history?days=90`, 600).then((r) => r.points);
