import type { Card } from "./types";

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "cheapradar";

export function naira(n: number | null | undefined): string {
  if (n == null) return "—";
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

export function compact(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-NG");
}

/** https://www.jumia.com.ng/some-name-123.html  ->  some-name-123 */
export function slugFromUrl(url: string): string {
  return url
    .split("?")[0]
    .replace(/\/+$/, "")
    .split("/")
    .pop()!
    .replace(/\.html$/, "");
}

export function cardHref(c: Card): string {
  return `/product/${encodeURIComponent(slugFromUrl(c.url))}`;
}
