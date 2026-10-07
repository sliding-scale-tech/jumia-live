"""HTTP API in front of the scraper + its SQLite database. The Next.js site (on Vercel) calls this from its server side.

  GET /health
  GET /stats                      what is in the database
  GET /home                       flash deals + trending (best of what the database has seen recently)
  GET /search?q=phone&page=1      one page (40) of Jumia search results
  GET /product/{slug}             full product detail (slug = last part of the Jumia URL, without .html)
  GET /product/{slug}/history     price changes over the last N days (default 90)
  GET /locations/regions          Jumia regions (states)       -> [{id, name}]
  GET /locations/regions/{id}/cities
                                  cities / areas of a region   -> [{id, name}]
  GET /delivery/{slug}?city=ID    pickup + door-delivery fees of a product for a city
  GET /stream/search?q=&page=&details=12
                                  LIVE search: Server-Sent Events, one event per product as it is scraped

Every route except /health needs the header  X-API-Key: <API_KEY>.

Data flow: a request is answered from the database when the stored copy is fresh enough; otherwise the
page is scraped from Jumia, saved to the database (products + price history) and returned. If Jumia can't
be reached, the older stored copy is returned (marked "stale": true) instead of an error.

Run:  uvicorn api:app --host 0.0.0.0 --port 8000
"""
import hmac
import json
import os
import re
import threading
import time
from urllib.parse import quote_plus

from fastapi import Depends, FastAPI, Header, HTTPException, Path, Query
from fastapi.responses import StreamingResponse

import db
import main as scraper

API_KEY = os.environ.get("API_KEY", "")
SEARCH_TTL = int(os.environ.get("SEARCH_TTL", 600))        # seconds a stored search page counts as fresh
PRODUCT_TTL = int(os.environ.get("PRODUCT_TTL", 21600))    # 6 h
HOME_TTL = int(os.environ.get("HOME_TTL", 1800))
DELIVERY_TTL = int(os.environ.get("DELIVERY_TTL", 21600))   # delivery fee quotes: 6 h
LOCATION_TTL = 30 * 86400                                   # regions / cities rarely change
HOME_QUERIES = [q.strip() for q in os.environ.get(
    "HOME_QUERIES", "phone,laptop,headphones,television,playstation,air fryer").split(",") if q.strip()]
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,200}-\d{3,}$")

app = FastAPI(title="Jumia scraper API", docs_url=None, redoc_url=None)

_session = None
_session_lock = threading.Lock()
_home = {"at": 0.0, "value": None}
_home_lock = threading.Lock()


def session():
    global _session
    with _session_lock:
        if _session is None:
            _session = scraper.Session()
        return _session


def require_key(x_api_key: str = Header(default="")):
    if not API_KEY:
        raise HTTPException(503, "API_KEY is not configured on the server")
    if not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(401, "invalid API key")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/stats", dependencies=[Depends(require_key)])
def stats():
    return db.stats()


# --------------------------------------------------------------------------- search
def search_cached(q: str, page: int):
    stored = db.get_search(q, page)
    if stored and stored[1] < SEARCH_TTL:
        return stored[0]
    res = scraper.fetch_listing_page(session(), f"/catalog/?q={quote_plus(q)}", page)
    if res is None:
        if stored:
            return {**stored[0], "stale": True}
        raise HTTPException(502, "could not load results from Jumia")
    out = {"query": q, "page": page, **res}
    db.save_search(q, page, out)
    return out


@app.get("/search", dependencies=[Depends(require_key)])
def search(q: str = Query(min_length=1, max_length=80), page: int = Query(1, ge=1, le=50)):
    return search_cached(" ".join(q.split()), page)


# --------------------------------------------------------------------------- product
@app.get("/product/{slug}", dependencies=[Depends(require_key)])
def product(slug: str):
    if not SLUG_RE.match(slug):
        raise HTTPException(404, "unknown product")
    stored = db.get_product(slug)
    if stored and stored[1] < PRODUCT_TTL and "delivery" in stored[0]:  # older records predate delivery data
        return stored[0]

    html = session().get(f"/{slug}.html")
    if not html:
        if stored:
            return {**stored[0], "stale": True}
        raise HTTPException(404, "product not found")
    detail = scraper.parse_detail(html)
    listing = {"product_id": scraper.product_id_from_url(f"{slug}.html"), "url": f"{scraper.BASE}/{slug}.html",
               "name": detail.get("title") or slug, "promo_tags": [], "categories": []}
    item = {**scraper.merge(listing, detail), "slug": slug}
    db.upsert_item(item)
    return item


@app.get("/product/{slug}/history", dependencies=[Depends(require_key)])
def history(slug: str, days: int = Query(90, ge=1, le=365)):
    if not SLUG_RE.match(slug):
        raise HTTPException(404, "unknown product")
    return {"slug": slug, "days": days, "points": db.price_history(slug, days)}


# --------------------------------------------------------------------------- locations + delivery fees
def _jumia_json(path: str):
    """GET one of the JSON endpoints Jumia's own product page calls from JavaScript."""
    sess = session()
    with sess.lock:
        for attempt in range(2):
            hdr = {**sess.headers, "accept": "application/json", "x-requested-with": "XMLHttpRequest"}
            r = sess.client.get(scraper.BASE + path, headers=hdr, timeout=30)
            if r.status_code == 200 and "json" in (r.headers.get("content-type") or ""):
                return r.json()
            if r.status_code in (403, 429, 503) and attempt == 0:
                sess.refresh()  # Cloudflare cookie expired: get a new one and retry once
                continue
            break
    return None


@app.get("/locations/regions", dependencies=[Depends(require_key)])
def regions():
    stored = db.get_locations("region")
    if stored and stored[1] < LOCATION_TTL:
        return {"regions": stored[0]}
    # the region list is part of every product page: read it from one we already know
    slug = db.any_slug() or "silver-crest-8l-extra-large-digital-airfryer-418507707"
    html = session().get(f"/{slug}.html")
    if html:
        options = scraper.BeautifulSoup(html, "lxml").select("#fi-regionId option[value]")
        rows = [{"id": int(o["value"]), "name": o.get_text(strip=True)} for o in options if o["value"].isdigit()]
        if rows:
            db.save_locations("region", rows)
            return {"regions": rows}
    if stored:
        return {"regions": stored[0], "stale": True}
    raise HTTPException(502, "could not load regions from Jumia")


@app.get("/locations/regions/{region_id}/cities", dependencies=[Depends(require_key)])
def cities(region_id: int = Path(ge=1, le=999)):
    stored = db.get_locations("city", region_id)
    if stored and stored[1] < LOCATION_TTL:
        return {"cities": stored[0]}
    data = _jumia_json(f"/region/{region_id}/cities/")
    rows = [{"id": int(c["id"]), "name": c["name"]} for c in (data or {}).get("cities", [])]
    if rows:
        db.save_locations("city", rows, parent_id=region_id)
        return {"cities": sorted(rows, key=lambda r: r["name"])}
    if stored:
        return {"cities": stored[0], "stale": True}
    raise HTTPException(404, "no cities for this region")


def _delivery_for(sku: str, city_id: int):
    """-> (options, stale). options is None when Jumia didn't answer and nothing is stored."""
    stored = db.get_delivery(sku, city_id)
    if stored and stored[1] < DELIVERY_TTL:
        return stored[0], False
    data = _jumia_json(f"/fragment/delivery/sku/{sku}/city/{city_id}/")
    if data is None:
        return (stored[0], True) if stored else (None, False)
    options = scraper.parse_delivery_fragment(data)
    db.save_delivery(sku, city_id, options)
    return options, False


@app.get("/delivery/{slug}", dependencies=[Depends(require_key)])
def delivery(slug: str, city: int = Query(ge=1, le=99999999)):
    if not SLUG_RE.match(slug):
        raise HTTPException(404, "unknown product")
    sku = db.sku_for_slug(slug)
    if not sku:  # product never scraped yet: do it now (this also stores it)
        sku = product(slug).get("sku")
    if not sku:
        raise HTTPException(404, "product has no SKU")
    options, stale = _delivery_for(sku, city)
    if options is None:
        raise HTTPException(502, "could not load delivery fees from Jumia")
    name, region_id = db.city_name(city)
    return {"slug": slug, "sku": sku, "city_id": city, "city": name, "region_id": region_id,
            "options": options, "available": bool(options), **({"stale": True} if stale else {})}


# --------------------------------------------------------------------------- live stream
def _sse(event: str, data) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return "event: " + event + chr(10) + "data: " + payload + chr(10) + chr(10)


def _scrape_product(slug: str):
    """Fetch + parse + store one product page. Returns the full record, or None if Jumia didn't answer."""
    html = session().get(f"/{slug}.html")
    if not html:
        return None
    detail = scraper.parse_detail(html)
    listing = {"product_id": scraper.product_id_from_url(f"{slug}.html"), "url": f"{scraper.BASE}/{slug}.html",
               "name": detail.get("title") or slug, "promo_tags": [], "categories": []}
    item = {**scraper.merge(listing, detail), "slug": slug}
    db.upsert_item(item)
    return item


def _stream_search(q: str, page: int, details: int):
    t0 = time.time()
    yield _sse("status", {"step": "connect", "msg": "Connecting to the scraper…"})

    stored = db.get_search(q, page)
    if stored and stored[1] < SEARCH_TTL:
        res, source = stored[0], "database"
        yield _sse("status", {"step": "cache", "msg": "Found recent results in the database"})
    else:
        yield _sse("status", {"step": "fetch", "msg": f"Asking Jumia for “{q}”…"})
        fetched = scraper.fetch_listing_page(session(), f"/catalog/?q={quote_plus(q)}", page)
        if fetched is None and stored:
            res, source = stored[0], "stale"
        elif fetched is None:
            yield _sse("error", {"msg": "Could not load results from Jumia right now"})
            return
        else:
            res = {"query": q, "page": page, **fetched}
            db.save_search(q, page, res)
            source = "live"

    cards = res["cards"]
    yield _sse("meta", {"query": q, "page": page, "total": res.get("total"), "last_page": res.get("last_page"),
                        "count": len(cards), "source": source})

    # one event per product; the short pause just lets the browser animate each card in
    for card in cards:
        yield _sse("card", card)
        time.sleep(0.05)

    # then open the product pages one by one - this is the slow, real scraping work
    todo = cards[:details]
    for i, card in enumerate(todo, 1):
        slug = scraper.product_id_from_url(card["url"]) and card["url"].rsplit("/", 1)[-1].removesuffix(".html")
        stored_p = db.get_product(slug) if slug else None
        item, cached = (stored_p[0], True) if stored_p and stored_p[1] < PRODUCT_TTL else (None, False)
        if item is None and slug and SLUG_RE.match(slug):
            yield _sse("status", {"step": "detail", "msg": f"Reading product page {i}/{len(todo)}…"})
            try:
                item = _scrape_product(slug)
            except Exception:
                item = None
        if item is None:
            yield _sse("detail", {"product_id": card["product_id"], "i": i, "n": len(todo), "ok": False})
            continue
        yield _sse("detail", {
            "product_id": card["product_id"], "i": i, "n": len(todo), "ok": True, "cached": cached,
            "seller": (item.get("seller") or {}).get("name"),
            "seller_score": (item.get("seller") or {}).get("score_percent"),
            "units_left": (item.get("availability") or {}).get("units_left"),
            "delivery": [{"type": o["type"], "fee": o["fee"]} for o in ((item.get("delivery") or {}).get("options") or [])],
            "specs": len(item.get("specifications") or {}),
            "reviews": len(item.get("reviews") or []),
        })
    yield _sse("done", {"count": len(cards), "details": len(todo), "seconds": round(time.time() - t0, 1)})


@app.get("/stream/search", dependencies=[Depends(require_key)])
def stream_search(q: str = Query(min_length=1, max_length=80), page: int = Query(1, ge=1, le=50),
                  details: int = Query(12, ge=0, le=40)):
    return StreamingResponse(
        _stream_search(" ".join(q.split()), page, details),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# --------------------------------------------------------------------------- home
def _build_home():
    for q in HOME_QUERIES:  # make sure the popular searches are fresh in the database
        try:
            search_cached(q, 1)
        except HTTPException:
            pass
    return {"deals": db.deals(8), "trending": db.trending(8), "count": db.stats()["products"]}


@app.get("/home", dependencies=[Depends(require_key)])
def home():
    with _home_lock:
        if _home["value"] is None or time.time() - _home["at"] > HOME_TTL:
            value = _build_home()
            if value["deals"] or value["trending"] or _home["value"] is None:
                _home.update(at=time.time(), value=value)
        return _home["value"]


@app.on_event("startup")
def warm():
    """Fill the home page data in the background so the first visitor doesn't wait."""
    if API_KEY:
        threading.Thread(target=home, daemon=True).start()
