# Jumia NG scraper + API (runs on your Hostinger KVM server)

```
Browser ──► Next.js on Vercel ──(server-side, API key)──► Caddy (HTTPS) ──► api  ──► SQLite  data/jumia.db
                                                                              └──► solver (Chromium, Cloudflare cookie) ──► Jumia
```

* `main.py`  – the scraper (search pages, product pages) and a command-line crawler
* `api.py`   – HTTP API for the website, incl. a **live stream** (`/stream/search`, Server-Sent Events)
* `db.py`    – SQLite storage: products, price history, search results
* `tools/cf-clearance-scraper` – Cloudflare solver (only used to get the cookie; everything else is plain HTTP)

## Deploy on the server (Docker)

1. Install Docker: `curl -fsSL https://get.docker.com | sh`
2. Copy this folder to the server, **without** `.venv/`, `node_modules/`, `data/session.json` (the Cloudflare cookie is tied to the IP):

       rsync -av --exclude .venv --exclude node_modules --exclude 'data/session.json' ./ user@server:~/scraper/

   This also copies your local `.env`, which already contains the `PROXY_URL` line.

3. On the server (everything runs under its own compose project `jumia-live`, so it doesn't touch other containers):

       cd ~/scraper
       [ -f .env ] || cp .env.example .env
       nano .env            # add API_KEY (openssl rand -hex 32); keep PROXY_URL; optionally API_PORT (default 8000)
       docker compose up -d --build        # starts solver + api; the API listens on 127.0.0.1:API_PORT only

4. **HTTPS** – pick one:
   * **Server already runs Caddy/nginx** (ports 80/443 taken): add one site block to it. Caddy example (then `caddy validate` and `systemctl reload caddy`):

         api.example.com {          # or <name>.<ip-with-dashes>.sslip.io: free hostname, no DNS needed
             reverse_proxy 127.0.0.1:8000 {
                 flush_interval -1  # IMPORTANT: lets the live stream through unbuffered
             }
         }

   * **Nothing else on 80/443:** set `API_DOMAIN` in `.env`, create a DNS `A` record for it and run `docker compose --profile caddy up -d` (bundled Caddy gets the certificate automatically).
5. Check: `curl https://YOUR-HOST/health` → `{"ok":true}`. Put the same `API_KEY` and `https://YOUR-HOST` into the website's Vercel env vars (see `../website/README.md`).

Only the HTTPS proxy needs ports 80/443; the API (8000) and solver (3000) are never exposed publicly.
Update later: re-copy the files, then `docker compose up -d --build`. Logs: `docker compose logs -f api`.

### Proxy
Set `PROXY_URL=http://user:password@host:port` in `.env` (on the server only; it is git-ignored) and restart: `docker compose up -d`.
It is used for **all** requests to Jumia and for the Cloudflare solver. Cloudflare's cookie is tied to the IP that solved it, so the
solver and the page requests must share the same proxy; the scraper remembers which proxy a cached cookie belongs to and solves
again automatically when you change or remove it. Use a static / "sticky" IP (a rotating IP would invalidate the cookie).
Logs show only `host:port`, never the credentials. Without `PROXY_URL` everything connects directly.

### Database
SQLite file at `data/jumia.db` (the `./data` folder is mounted into the container) – **back that folder up**.

* every API request and every CLI crawl saves products + price changes there
* repeat searches/products are served from it while fresh (`SEARCH_TTL` 10 min, `PRODUCT_TTL` 6 h) and the **price history** chart on the site fills in over time
* if Jumia can't be reached, the last saved copy is served instead of an error
* load older JSON crawls: `docker compose run --rm --entrypoint python scraper db.py import /data/products.json`
* look inside: `sqlite3 data/jumia.db "select name, price from products order by updated_at desc limit 10"`

### Bulk crawls from the command line

    docker compose run --rm scraper --search phone --max-pages 5        # saves to data/ and into the database
    docker compose run --rm scraper --categories air-fryers blenders
    docker compose run --rm scraper --no-details --search phone

### API (all routes except /health need header `X-API-Key`)

| Route | |
|---|---|
| `GET /health` | liveness |
| `GET /stats` | row counts in the database |
| `GET /home` | flash deals + trending |
| `GET /search?q=phone&page=1` | one page of results |
| `GET /stream/search?q=phone&page=1&details=12` | **live**: one SSE event per product (`status`, `meta`, `card`, `detail`, `done`, `error`) |
| `GET /product/{slug}` | full product record |
| `GET /product/{slug}/history?days=90` | price history |
| `GET /locations/regions` | Jumia states `[{id, name}]` (cached 30 days) |
| `GET /locations/regions/{id}/cities` | cities / areas of a state |
| `GET /delivery/{slug}?city=ID` | **pickup-station and door-delivery fee** (+ arrival dates) of a product for a city; cached 6 h per product and city |

Delivery fees come from Jumia's own `/fragment/delivery/sku/{sku}/city/{id}/` endpoint (the one its product page calls when you pick a location). A product record also contains `delivery` = the fees for Jumia's default location (Lagos – Sangotedo), so CLI crawls and the JSON files include them.

## Run locally (Windows / Linux)

    python -m venv .venv && .venv/Scripts/pip install -r requirements.txt      # Linux: .venv/bin/pip
    cd tools/cf-clearance-scraper && npm ci --ignore-scripts && cd ../..
    set API_KEY=dev-key                                                         # Linux: export API_KEY=dev-key
    .venv/Scripts/python -m uvicorn api:app --port 8000
    .venv/Scripts/python main.py --search phone                                 # or the CLI crawler

Locally the solver is started automatically (and stopped again) only when the cached cookie is missing or rejected.

## CLI options
`--search TERM` (repeatable) · `--categories SLUG ...` · `--all-categories` · `--start PATH` · `--max-pages N` · `--limit N` · `--no-details` · `--out FILE`
Env: `SOLVER_URL`, `DATA_DIR`, `DB_PATH`, `API_KEY`, `SEARCH_TTL`, `PRODUCT_TTL`, `HOME_TTL`, `HOME_QUERIES`.
