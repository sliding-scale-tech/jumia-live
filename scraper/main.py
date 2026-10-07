"""Jumia Nigeria scraper.

Flow
  1. Get a Cloudflare session (cookies + UA) from the local cf-clearance-scraper
     server (tools/cf-clearance-scraper, auto-started if it isn't running).
  2. Fetch every page with tls_requests (requests-style API, Chrome TLS fingerprint)
     using that session. A plain `requests` call is rejected by Cloudflare's TLS check.
  3. Listing pages (landing page or category, with ?page=N pagination) -> product cards.
  4. Optionally open every product page for the full detail record.
  5. Save everything to products.json (incrementally, resumable).

Usage
  python main.py                                   # landing page only, with details
  python main.py --categories air-fryers blenders  # also crawl categories (all pages)
  python main.py --no-details --max-pages 3
  python main.py --search phone                    # /catalog/?q=phone, all result pages
  python main.py --search "samsung galaxy" --search laptop --max-pages 5
"""
import argparse
import json
import os
import random
import re
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus, unquote, urljoin, urlparse

import requests  # only used to talk to the local solver on localhost
import tls_requests
from bs4 import BeautifulSoup

import db

def _load_dotenv(path):
    """Tiny .env reader (KEY=value lines) so local runs pick up the same settings as Docker. Real env vars win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv(Path(__file__).parent / ".env")

BASE = "https://www.jumia.com.ng"
DEFAULT_START = "/mlp-appliances/"
ROOT = Path(__file__).parent
SOLVER_DIR = ROOT / "tools" / "cf-clearance-scraper"
# Config via environment so the same code runs locally and in Docker.
SOLVER_URL = os.environ.get("SOLVER_URL", "http://localhost:3000/cf-clearance-scraper")
SOLVER_HEALTH = SOLVER_URL.rsplit("/", 1)[0] + "/"
LOCAL_SOLVER = SOLVER_URL.startswith(("http://localhost", "http://127.0.0.1"))
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT / "data"))  # output json + cached session live here
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = DATA_DIR / "products.json"
SESSION_FILE = DATA_DIR / "session.json"  # cached Cloudflare cookies, valid for months
_solver_proc = None

# Optional outgoing proxy for ALL requests to Jumia (page fetches AND the Cloudflare solver), e.g.
#   PROXY_URL=http://user:password@host:port
# Cloudflare ties its cookie to the IP that solved the challenge, so both must use the same proxy.
PROXY_URL = os.environ.get("PROXY_URL", "").strip()
_proxy = urlparse(PROXY_URL) if PROXY_URL else None
PROXY_ID = f"{_proxy.hostname}:{_proxy.port}" if _proxy and _proxy.hostname else ""  # no credentials: safe to log/store
SOLVER_PROXY = (
    {"host": _proxy.hostname, "port": _proxy.port, "username": unquote(_proxy.username or ""),
     "password": unquote(_proxy.password or "")}
    if PROXY_ID and _proxy.port else None
)
if SOLVER_PROXY and not SOLVER_PROXY["username"]:
    SOLVER_PROXY.pop("username"), SOLVER_PROXY.pop("password")


# --------------------------------------------------------------------------- session
def solver_up():
    try:
        requests.get(SOLVER_HEALTH, timeout=3)
        return True
    except requests.RequestException:
        return False


def start_solver_if_needed():
    """Wait for the solver; start the bundled one ourselves only when running locally."""
    global _solver_proc
    if solver_up():
        return
    if not LOCAL_SOLVER:  # docker-compose: the solver is its own container, may still be booting
        for _ in range(60):
            time.sleep(1)
            if solver_up():
                time.sleep(5)  # let its browser finish launching
                return
        sys.exit(f"solver not reachable at {SOLVER_URL}")
    print("[solver] starting local cf-clearance-scraper ...")
    _solver_proc = subprocess.Popen(
        ["node", "src/index.js"], cwd=SOLVER_DIR,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=sys.platform == "win32",
    )
    for _ in range(60):
        time.sleep(1)
        if solver_up():
            time.sleep(5)  # let the browser finish launching
            return
    sys.exit("cf-clearance-scraper did not start")


def stop_solver():
    """Shut down the solver (and its browser) if we were the ones who started it."""
    global _solver_proc
    if _solver_proc is None:
        return
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/PID", str(_solver_proc.pid), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        _solver_proc.terminate()
    _solver_proc = None


class Session:
    """tls_requests client carrying a Cloudflare-cleared cookie jar."""

    def __init__(self, delay=(0.6, 1.4)):
        self.delay = delay
        self.lock = threading.RLock()  # the API serves requests from several threads
        self.client = tls_requests.Client(client_identifier="chrome_133", proxy=PROXY_URL or None)
        self.headers = {}
        print(f"[proxy] {'using ' + PROXY_ID if PROXY_ID else 'none (direct connection)'}")
        if SESSION_FILE.exists():
            try:
                saved = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
                # a cookie solved from another IP/proxy is useless: only reuse it if the proxy is unchanged
                if isinstance(saved, dict) and "headers" in saved and saved.get("proxy", "") == PROXY_ID:
                    self.headers = saved["headers"]
                    print("[session] using cached Cloudflare session")
                    return
                print("[session] cached session was made with a different proxy, solving again")
            except ValueError:
                pass
        self.refresh()

    def refresh(self):
        """Get a new Cloudflare session from the solver (only needed when the cache is missing/rejected)."""
        start_solver_if_needed()
        print("[solver] solving Cloudflare challenge ...")
        try:
            payload = {"mode": "waf-session", "url": BASE + DEFAULT_START}
            if SOLVER_PROXY:
                payload["proxy"] = SOLVER_PROXY
            r = requests.post(SOLVER_URL, json=payload, timeout=120)
            data = r.json()
        finally:
            stop_solver()
        if data.get("code") != 200:
            sys.exit(f"solver failed: {data}")
        h = {k: v for k, v in data["headers"].items() if k not in ("cookie", "referer", "origin")}
        h["cookie"] = "; ".join(f'{c["name"]}={c["value"]}' for c in data["cookies"])
        self.headers = h
        SESSION_FILE.write_text(json.dumps({"proxy": PROXY_ID, "headers": h}, indent=1), encoding="utf-8")

    def get(self, path, retries=3):
        with self.lock:
            return self._get(path, retries)

    def _get(self, path, retries):
        url = urljoin(BASE, path)
        for attempt in range(retries):
            time.sleep(random.uniform(*self.delay))
            try:
                r = self.client.get(url, headers=self.headers, timeout=30)
            except Exception as e:  # network hiccup
                print(f"  ! {e!r} (try {attempt + 1})")
                continue
            if r.status_code == 200 and "Just a moment" not in r.text[:2000]:
                return r.text
            if r.status_code in (403, 429, 503):
                print(f"  ! HTTP {r.status_code}, refreshing session")
                self.refresh()
                continue
            if r.status_code == 404:
                return None
        return None


# --------------------------------------------------------------------------- helpers
def money(text):
    """'₦ 31,999' / '₦ 1,000 - ₦ 2,000' -> 31999.0 (first number)."""
    if not text:
        return None
    m = re.search(r"[\d,]+(?:\.\d+)?", text)
    return float(m.group().replace(",", "")) if m else None


def txt(node):
    return node.get_text(" ", strip=True) if node else None


def num(text):
    m = re.search(r"[\d,]+(?:\.\d+)?", text or "")
    return float(m.group().replace(",", "")) if m else None


def product_id_from_url(url):
    m = re.search(r"-(\d+)\.html", url or "")
    return m.group(1) if m else None


# --------------------------------------------------------------------------- listing
def parse_card(card):
    core = card.select_one("a.core")
    if not core:
        return None
    ga = {k[9:]: v for k, v in core.attrs.items() if k.startswith("data-ga4-")}
    cats = [ga[f"item_category{i}" if i > 1 else "item_category"]
            for i in range(1, 6) if ga.get(f"item_category{i}" if i > 1 else "item_category")]
    url = urljoin(BASE, core.get("href", "")).split("#")[0]
    rating_el = card.select_one("div.stars")
    rev_count = re.search(r"\((\d[\d,]*)\)\s*$", txt(card.select_one("div.rev")) or "")
    img = card.select_one("img")
    return {
        "product_id": product_id_from_url(url),
        "sku": ga.get("item_id") or core.get("data-gtm-id"),
        "name": ga.get("item_name") or txt(card.select_one(".name")),
        "brand": ga.get("item_brand"),
        "url": url,
        "categories": cats,
        "price": money(txt(card.select_one(".prc"))),
        "old_price": money(txt(card.select_one(".old"))),
        "discount_percent": num(txt(card.select_one(".bdg._dsct"))),
        "currency": "NGN",
        "rating": num(txt(rating_el).split("out of")[0]) if rating_el else None,
        "rating_count": int(rev_count.group(1).replace(",", "")) if rev_count else None,
        "image": (img.get("data-src") or img.get("src")) if img else None,
        "official_store": bool(card.select_one(".bdg._mall")),
        "jumia_express": bool(card.select_one("svg[aria-label='Express Shipping']")),
        "promo_tags": [t for t in (ga.get("tags") or "").split("|") if t],
        "seller_id": core.get("data-gtm-dimension23"),
    }


def fetch_listing_page(sess, path, page=1):
    """One listing page -> {"cards": [...], "last_page": int, "total": int|None}."""
    if "?" not in path:
        path = path.rstrip("/") + "/"
    sep = "&" if "?" in path else "?"
    html = sess.get(path if page == 1 else f"{path}{sep}page={page}")
    if not html:
        return None
    soup = BeautifulSoup(html, "lxml")
    # the paginated grid only; the other article.prd on a landing page are
    # static carousels that repeat unchanged on every page
    nodes = soup.select("div._4cl-3cm-shs article.prd") or soup.select("article.prd")
    pages = [int(m.group(1)) for a in soup.select("a.pg")
             if (m := re.search(r"page=(\d+)", a.get("href", "")))]
    total = re.search(r"([\d,]+)\s+products? found", txt(soup.select_one("p.-gy5")) or "")
    return {
        "cards": [c for c in map(parse_card, nodes) if c],
        "last_page": max(pages, default=page),
        "total": int(total.group(1).replace(",", "")) if total else None,
    }


def crawl_listing(sess, path, max_pages):
    """Yield product cards from a listing page and all of its ?page=N pages."""
    page, last = 1, 1
    while page <= min(last, max_pages):
        res = fetch_listing_page(sess, path, page)
        if not res:
            break
        if page == 1:
            last = res["last_page"]
            print(f"[{path}] ({res['total']} products found) pages={last}")
        print(f"  page {page}/{min(last, max_pages)}: {len(res['cards'])} products")
        yield from res["cards"]
        page += 1


def category_links(sess, path):
    """Catalog category links found on a landing page (/slug/ only)."""
    html = sess.get(path)
    soup = BeautifulSoup(html or "", "lxml")
    links = {a["href"] for a in soup.select("a[href]") if re.fullmatch(r"/[a-z0-9-]+/", a["href"])}
    return sorted(links)


# --------------------------------------------------------------------------- detail
def parse_detail(html):
    soup = BeautifulSoup(html, "lxml")
    d = {}

    # --- JSON-LD (most reliable source)
    ld = {}
    for s in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(s.string or "")
        except json.JSONDecodeError:
            continue
        for node in data.get("@graph", [data]):
            ld.setdefault(node.get("@type"), node)
    prod = ld.get("Product", {})
    offer = prod.get("offers", {}) or {}
    seller_ld = offer.get("seller", {}) or {}
    rating_ld = prod.get("aggregateRating", {}) or {}
    imgs = (prod.get("image") or {}).get("contentUrl", [])
    d.update({
        "title": txt(soup.select_one("h1")),
        "description": prod.get("description"),
        "sku": prod.get("sku"),
        "brand": (prod.get("brand") or {}).get("name"),
        "category": prod.get("category"),
        "availability": (offer.get("availability") or "").rsplit("/", 1)[-1] or None,
        "condition": (offer.get("itemCondition") or "").rsplit("/", 1)[-1] or None,
        "price_ld": float(offer["price"]) if offer.get("price") else None,
        "currency": offer.get("priceCurrency"),
        "images": imgs,
        "rating": rating_ld.get("ratingValue"),
        "rating_count": rating_ld.get("ratingCount"),
        "last_modified": (ld.get("ItemPage") or {}).get("dateModified"),
    })
    d["breadcrumbs"] = [
        {"name": e["item"]["name"], "url": e["item"]["@id"]}
        for e in (ld.get("BreadcrumbList") or {}).get("itemListElement", [])
        if e["position"] > 1
    ]

    # --- visible price block
    price_el = soup.select_one("span.-b.-ubpt")
    d["price"] = money(txt(price_el))
    box = price_el.find_parent("div", class_="-hr") if price_el else None
    d["old_price"] = money(txt(box.select_one(".-lthr"))) if box else None
    d["discount_percent"] = num(txt(box.select_one(".bdg._dsct"))) if box else None
    page_text = soup.get_text(" ", strip=True)
    ship = re.search(r"shipping from\s*₦\s*([\d,]+)", page_text)
    d["shipping_from"] = money(ship.group(1)) if ship else None
    d["stock_text"] = next((t for t in ("In stock", "Out of stock") if t in page_text), None)
    left = re.search(r"(\d+)\s+units? left", page_text)
    d["units_left"] = int(left.group(1)) if left else None
    d["official_store"] = "Official Store" in page_text[:1500]
    d["jumia_express"] = bool(soup.select_one("img[alt*='Express'], .-jx, [class*='jumia-express']"))
    d["pay_on_delivery"] = "Pay on delivery" in page_text or "PAY on DELIVERY" in page_text

    # --- sections keyed by heading
    def section(title):
        for sec in soup.select("section.card"):
            h = sec.find(["h2", "h3"])
            if h and h.get_text(strip=True).startswith(title):
                return sec

    spec = section("Specifications")
    key_features, specs = [], {}
    if spec:
        for art in spec.select("article"):
            head = txt(art.select_one("h3"))
            if head == "Key Features":
                key_features = [txt(li) for li in art.select("li")]
            elif head == "Specifications":
                for li in art.select("li"):
                    k = txt(li.select_one(".-b"))
                    if k:
                        specs[k] = txt(li).replace(k, "", 1).lstrip(" :").strip()
    d["key_features"] = key_features
    d["specifications"] = specs
    in_box = soup.select_one("#in-the-box, .in-the-box")
    d["in_the_box"] = txt(in_box)

    sel = section("Seller Information")
    seller = {"name": seller_ld.get("name"), "id": seller_ld.get("@id"),
              "url": urljoin(BASE, seller_ld["url"]) if seller_ld.get("url") else None}
    if sel:
        t = txt(sel)
        m = re.search(r"(\d+)%\s*Seller Score", t)
        seller["score_percent"] = int(m.group(1)) if m else None
        m = re.search(r"([\d,]+)\s*Followers", t)
        seller["followers"] = int(m.group(1).replace(",", "")) if m else None
        seller["performance"] = {
            k.strip(): v.strip()
            for k, v in re.findall(r"(Shipping speed|Quality Score|Customer Rating|Cancellation Rate):\s*([A-Za-z ]+?)(?=\s+(?:Shipping|Quality|Customer|Cancellation)|$)", t)
        }
    d["seller"] = seller

    dr = section("Delivery & Returns")
    d["delivery_returns"] = txt(dr)
    d["delivery"] = parse_default_delivery(soup)

    fb = section("Verified Customer Feedback")
    breakdown = {}
    if fb:
        for star, cnt in re.findall(r"\b([1-5])\s*\((\d[\d,]*)\)", txt(fb)):
            breakdown[star] = int(cnt.replace(",", ""))
    d["rating_breakdown"] = breakdown
    d["reviews"] = [
        {
            "rating": (r.get("reviewRating") or {}).get("ratingValue"),
            "title": r.get("name"),
            "body": r.get("reviewBody"),
            "date": r.get("datePublished"),
            "author": ((r.get("author") or {}).get("name") or "").removeprefix("by ").strip() or None,
        }
        for r in prod.get("review", [])
    ]
    d["extra_properties"] = {p["name"]: p["value"] for p in prod.get("additionalProperty", [])}
    related = section("Related results")
    d["related_searches"] = [txt(a) for a in related.select("a")] if related else []
    return d


# --------------------------------------------------------------------------- delivery fees
def _fee(text):
    """'₦ 1,000' -> 1000 (int). None when there is no number."""
    m = re.search(r"[\d,]+", text or "")
    return int(m.group().replace(",", "")) if m and m.group().replace(",", "") else None


def delivery_option(title, kind, fee_text, eta_html, note=None):
    """One delivery option in a uniform shape, from either the page's HTML block or the fragment JSON."""
    ems = [e.get_text(" ", strip=True) for e in BeautifulSoup(eta_html or "", "lxml").select("em")]
    is_pickup = "pickup" in f"{kind} {title}".lower()
    return {
        "type": "pickup" if is_pickup else "door",
        "title": title,
        "fee": _fee(fee_text),
        "eta_from": ems[0] if len(ems) > 0 else None,
        "eta_to": ems[1] if len(ems) > 1 else None,
        "order_within": ems[2] if len(ems) > 2 else None,
        "note": note,
    }


def parse_delivery_fragment(data):
    """JSON from /fragment/delivery/sku/{sku}/city/{city}/ -> list of options (empty = nothing offered)."""
    out = []
    for o in (data.get("delivery") or {}).get("options", []):
        note = (((o.get("popup") or {}).get("delivery")) or {}).get("text")
        out.append(delivery_option(o.get("title", ""), o.get("type", ""), o.get("shippingText"), o.get("text"), note))
    return out


def parse_default_delivery(soup):
    """The delivery block that ships inside the product page (fees for the page's default location)."""
    box = soup.select_one("[data-delivery-info]")
    if not box:
        return None
    options = []
    for blk in box.select("[data-info-block] > div"):
        title = txt(blk.select_one("h4"))
        marks = blk.select("div.markup")
        if not title or len(marks) < 1:
            continue
        fee_el = next((m for m in marks if "Delivery Fees" in m.get_text()), None)
        eta_el = next((m for m in marks if "between" in m.get_text()), None)
        options.append(delivery_option(title, "", txt(fee_el.select_one("em")) if fee_el else None,
                                       str(eta_el) if eta_el else ""))
    sel = lambda i: soup.select_one(f"#{i} option[selected]")
    region, city = sel("fi-regionId"), sel("fi-cityId")
    return {
        "location": {
            "region_id": int(region["value"]) if region and region.get("value") else None,
            "region": txt(region),
            "city_id": int(city["value"]) if city and city.get("value") else None,
            "city": txt(city),
        },
        "options": options,
    }



# --------------------------------------------------------------------------- output
def merge(listing, detail):
    """Structured final record: listing card + detail page."""
    detail = detail or {}
    pick = lambda k: detail.get(k) if detail.get(k) is not None else listing.get(k)
    return {
        "product_id": listing["product_id"],
        "sku": pick("sku"),
        "url": listing["url"],
        "name": listing["name"],
        "title": detail.get("title"),
        "brand": pick("brand"),
        "description": detail.get("description"),
        "pricing": {
            "currency": "NGN",
            "price": pick("price"),
            "old_price": pick("old_price"),
            "discount_percent": pick("discount_percent"),
            "shipping_from": detail.get("shipping_from"),
            "promo_tags": listing.get("promo_tags", []),
        },
        "availability": {
            "status": detail.get("availability"),
            "stock_text": detail.get("stock_text"),
            "units_left": detail.get("units_left"),
            "condition": detail.get("condition"),
        },
        "category": {
            "leaf": detail.get("category"),
            "breadcrumbs": detail.get("breadcrumbs") or [{"name": c} for c in listing.get("categories", [])],
        },
        "ratings": {
            "average": pick("rating"),
            "count": pick("rating_count"),
            "breakdown": detail.get("rating_breakdown", {}),
        },
        "badges": {
            "official_store": detail.get("official_store", listing.get("official_store")),
            "jumia_express": detail.get("jumia_express", listing.get("jumia_express")),
            "pay_on_delivery": detail.get("pay_on_delivery"),
        },
        "seller": detail.get("seller") or {"id": listing.get("seller_id")},
        "images": detail.get("images") or ([listing["image"]] if listing.get("image") else []),
        "key_features": detail.get("key_features", []),
        "specifications": {**detail.get("extra_properties", {}), **detail.get("specifications", {})},
        "in_the_box": detail.get("in_the_box"),
        "delivery_returns": detail.get("delivery_returns"),
        "delivery": detail.get("delivery"),
        "reviews": detail.get("reviews", []),
        "related_searches": detail.get("related_searches", []),
        "last_modified": detail.get("last_modified"),
        "scraped_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "detail_scraped": bool(detail),
    }


def save(products, source, out_file=OUT_FILE):
    out_file.write_text(json.dumps(
        {"meta": {"source": source, "count": len(products),
                  "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds")},
         "products": list(products.values())},
        ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default=DEFAULT_START, help="landing/listing path to scrape")
    ap.add_argument("--search", action="append", default=[], metavar="TERM",
                    help="search term(s) -> /catalog/?q=TERM; repeat for several; output goes to products_<term>.json")
    ap.add_argument("--out", help="output json file (default products.json, or products_<term>.json for one --search)")
    ap.add_argument("--categories", nargs="*", default=[], help="category slugs to crawl, e.g. air-fryers")
    ap.add_argument("--all-categories", action="store_true", help="crawl every category linked from --start")
    ap.add_argument("--max-pages", type=int, default=50, help="max pages per listing")
    ap.add_argument("--limit", type=int, default=0, help="stop after N products (0 = all)")
    ap.add_argument("--no-details", action="store_true", help="skip product pages (cards only)")
    args = ap.parse_args()

    sess = Session()

    searches = [t.strip() for t in args.search if t.strip()]
    if args.out:
        out_file = Path(args.out)
    elif len(searches) == 1 and not args.categories and not args.all_categories:
        out_file = DATA_DIR / f"products_{re.sub(r'[^a-z0-9]+', '_', searches[0].lower()).strip('_')}.json"
    else:
        out_file = OUT_FILE

    # resume: keep what's already saved
    products = {}
    if out_file.exists():
        try:
            for p in json.loads(out_file.read_text(encoding="utf-8"))["products"]:
                products[p["product_id"]] = p
            print(f"[resume] {len(products)} products already saved in {out_file.name}")
        except (ValueError, KeyError):
            pass

    if searches:
        # searching replaces the default landing page unless --start was given explicitly
        listings = [f"/catalog/?q={quote_plus(t)}" for t in searches]
        if args.start != DEFAULT_START:
            listings.insert(0, args.start)
    else:
        listings = [args.start]
    listings += [f"/{c.strip('/')}/" for c in args.categories]
    if args.all_categories:
        listings += category_links(sess, args.start)

    new = 0
    for path in dict.fromkeys(listings):
        for card in crawl_listing(sess, path, args.max_pages):
            pid = card["product_id"]
            if not pid or (pid in products and (products[pid]["detail_scraped"] or args.no_details)):
                continue
            detail = None
            if not args.no_details:
                html = sess.get(card["url"])
                detail = parse_detail(html) if html else None
                print(f"    {pid} {card['name'][:55]!r} -> {'ok' if detail else 'NO DETAIL'}")
            products[pid] = merge(card, detail)
            db.upsert_item(products[pid])  # also keep everything in the SQLite database the API serves from
            new += 1
            if new % 20 == 0:
                save(products, BASE + (listings[0] if searches else args.start), out_file)
            if args.limit and new >= args.limit:
                break
        if args.limit and new >= args.limit:
            break

    save(products, BASE + (listings[0] if searches else args.start), out_file)
    print(f"done: {len(products)} products ({new} new) -> {out_file}")


if __name__ == "__main__":
    main()
