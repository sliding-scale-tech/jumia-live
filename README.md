# jumia-live

Live price search for Jumia Nigeria: a scraper + API that runs on a VPS, and a Next.js storefront that runs on Vercel.

```
Visitor ─► website/ (Next.js on Vercel) ─► scraper/ API (VPS, HTTPS) ─► SQLite + Jumia
```

| Folder | What | Deploy to |
|---|---|---|
| [`scraper/`](scraper/README.md) | Python scraper, FastAPI service (search, live stream, product detail, price history, delivery & pickup fees), SQLite, proxy support, Cloudflare solver, Docker + Caddy | VPS (e.g. Hostinger KVM) |
| [`website/`](website/README.md) | Next.js 16 + Tailwind CSS 4 storefront | Vercel (root directory `website`) |
| [`design.md`](design.md) | Design spec taken from the Figma site, with [reference screenshots](design-reference/) | — |

## Quick start

1. **Server:** follow [`scraper/README.md`](scraper/README.md) (`cp .env.example .env`, set `API_KEY`, `API_DOMAIN`, optional `PROXY_URL`, then `docker compose up -d --build`).
2. **Vercel:** follow [`website/README.md`](website/README.md) (set `SCRAPER_API_URL` and `SCRAPER_API_KEY`).

Secrets live only in `.env` files, which are git-ignored. See each `.env.example`.
