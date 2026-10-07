# cheapradar website (Next.js + Tailwind CSS) — deploy on Vercel

Front end for the scraper API. Design: [`../design.md`](../design.md). Next.js 16 (App Router), React 19, Tailwind CSS 4.

Pages: `/` home · `/search?q=` **live-streamed results** · `/product/[slug]` detail + price history · `/saved` watchlist (browser storage).

## How it talks to the scraper
The browser never sees the API key. Pages call the scraper from Vercel's **server side**:

* `lib/api.ts` – server fetches (`/home`, `/product/...`, `/product/.../history`)
* `app/api/stream/search/route.ts` – proxies the scraper's live **Server-Sent Events** to the browser
* `app/api/price/[slug]/route.ts` – watchlist price re-check
* `app/api/delivery/[slug]`, `app/api/locations/*` – delivery/pickup fee lookups for the location picker (`components/DeliveryBox.tsx`)
* `components/LiveSearch.tsx` – reads the stream: radar loader → products appear one by one → seller info fills in

## Run locally
```
cp .env.example .env.local        # SCRAPER_API_URL=http://localhost:8000  SCRAPER_API_KEY=<same as the scraper's API_KEY>
npm install
npm run dev                       # http://localhost:3000
```

## Deploy to Vercel
1. Push the repo to GitHub, import it in Vercel, set **Root Directory = `website`**.
2. Environment variables (Production + Preview):
   * `SCRAPER_API_URL` = `https://api.yourdomain.com` (the Hostinger API, HTTPS)
   * `SCRAPER_API_KEY` = the same secret as `API_KEY` in the scraper's `.env`
   * `NEXT_PUBLIC_SITE_NAME` = optional brand name (default `cheapradar`)
3. Deploy. Pages that stream/scrape set `maxDuration = 60` (the maximum on Vercel's Hobby plan).

Branding/colours live in `src/app/globals.css` (`@theme` tokens) — they mirror `design.md` section 2.
