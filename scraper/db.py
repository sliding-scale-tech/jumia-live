"""SQLite storage for everything the scraper collects (stdlib only, no server to run).

  products       one row per Jumia product: listing data + (when fetched) the full detail record
  price_history  a row each time a product's price changes  -> price chart on the site
  searches       which products a search page returned, so repeat searches are served from here
  locations      Jumia's regions and cities (for the delivery-fee location picker)
  delivery_fees  pickup / door-delivery fees of a product (sku) for a city, cached per (sku, city)

The file lives in DATA_DIR (default ./data/jumia.db). Safe for the API's threads: every call opens its
own short-lived connection and the DB runs in WAL mode.

CLI:  python db.py import data/products.json data/products_phone.json   # load earlier JSON crawls
      python db.py stats
"""
import json
import os
import re
import sqlite3
import sys
import time
from contextlib import contextmanager
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent / "data"))
DB_PATH = Path(os.environ.get("DB_PATH", DATA_DIR / "jumia.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    product_id       TEXT PRIMARY KEY,
    slug             TEXT UNIQUE NOT NULL,
    sku              TEXT,
    name             TEXT NOT NULL,
    title            TEXT,
    brand            TEXT,
    url              TEXT NOT NULL,
    categories       TEXT,            -- json list
    category_leaf    TEXT,
    price            REAL,
    old_price        REAL,
    discount_percent REAL,
    currency         TEXT DEFAULT 'NGN',
    rating           REAL,
    rating_count     INTEGER,
    image            TEXT,
    official_store   INTEGER DEFAULT 0,
    jumia_express    INTEGER DEFAULT 0,
    seller_id        TEXT,
    seller_name      TEXT,
    promo_tags       TEXT,            -- json list
    detail           TEXT,            -- json: the full record from main.merge()
    first_seen       REAL NOT NULL,
    listing_at       REAL,            -- last time a listing page showed it
    detail_at        REAL,            -- last time its product page was scraped
    updated_at       REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_products_discount ON products (discount_percent);
CREATE INDEX IF NOT EXISTS ix_products_reviews  ON products (rating_count);
CREATE INDEX IF NOT EXISTS ix_products_listing  ON products (listing_at);

CREATE TABLE IF NOT EXISTS price_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
    price      REAL NOT NULL,
    old_price  REAL,
    seen_at    REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_history_product ON price_history (product_id, seen_at);

CREATE TABLE IF NOT EXISTS locations (
    kind       TEXT NOT NULL,        -- 'region' | 'city'
    id         INTEGER NOT NULL,
    parent_id  INTEGER,              -- region id for a city
    name       TEXT NOT NULL,
    updated_at REAL NOT NULL,
    PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS ix_locations_parent ON locations (kind, parent_id);

CREATE TABLE IF NOT EXISTS delivery_fees (
    sku        TEXT NOT NULL,
    city_id    INTEGER NOT NULL,
    options    TEXT NOT NULL,        -- json list of options (empty list = nothing offered there)
    fetched_at REAL NOT NULL,
    PRIMARY KEY (sku, city_id)
);

CREATE TABLE IF NOT EXISTS searches (
    query       TEXT NOT NULL,
    page        INTEGER NOT NULL,
    total       INTEGER,
    last_page   INTEGER,
    product_ids TEXT NOT NULL,        -- json list, in result order
    fetched_at  REAL NOT NULL,
    PRIMARY KEY (query, page)
);
"""


@contextmanager
def connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH, timeout=30)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    with connect() as c:
        c.executescript(SCHEMA)


def slug_from_url(url):
    return url.split("?")[0].rstrip("/").rsplit("/", 1)[-1].removesuffix(".html")


def _b(v):
    return 1 if v else 0


def _note_price(c, pid, price, old_price, now):
    """Append to price_history only when the price actually changed."""
    if price is None:
        return
    last = c.execute(
        "SELECT price FROM price_history WHERE product_id=? ORDER BY id DESC LIMIT 1", (pid,)
    ).fetchone()
    if last is None or abs(last["price"] - price) > 0.5:
        c.execute(
            "INSERT INTO price_history (product_id, price, old_price, seen_at) VALUES (?,?,?,?)",
            (pid, price, old_price, now),
        )


# --------------------------------------------------------------------------- writes
def upsert_card(card, c=None):
    """Save a listing-page card (dict from main.parse_card)."""
    if c is None:
        with connect() as conn:
            return upsert_card(card, conn)
    pid = card.get("product_id")
    if not pid or not card.get("url"):
        return
    now = time.time()
    c.execute(
        """INSERT INTO products (product_id, slug, sku, name, brand, url, categories, price, old_price,
               discount_percent, currency, rating, rating_count, image, official_store, jumia_express,
               seller_id, promo_tags, first_seen, listing_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(product_id) DO UPDATE SET
               sku=COALESCE(excluded.sku, sku), name=excluded.name, brand=COALESCE(excluded.brand, brand),
               url=excluded.url, categories=excluded.categories, price=excluded.price,
               old_price=excluded.old_price, discount_percent=excluded.discount_percent,
               rating=COALESCE(excluded.rating, rating), rating_count=COALESCE(excluded.rating_count, rating_count),
               image=COALESCE(excluded.image, image), official_store=excluded.official_store,
               jumia_express=excluded.jumia_express, seller_id=COALESCE(NULLIF(excluded.seller_id,''), seller_id),
               promo_tags=excluded.promo_tags, listing_at=excluded.listing_at, updated_at=excluded.updated_at""",
        (pid, slug_from_url(card["url"]), card.get("sku"), card["name"], card.get("brand"), card["url"],
         json.dumps(card.get("categories") or []), card.get("price"), card.get("old_price"),
         card.get("discount_percent"), card.get("currency", "NGN"), card.get("rating"),
         card.get("rating_count"), card.get("image"), _b(card.get("official_store")),
         _b(card.get("jumia_express")), card.get("seller_id"), json.dumps(card.get("promo_tags") or []),
         now, now, now),
    )
    _note_price(c, pid, card.get("price"), card.get("old_price"), now)


def upsert_item(item, c=None):
    """Save a full record produced by main.merge() (listing + detail page)."""
    if c is None:
        with connect() as conn:
            return upsert_item(item, conn)
    pid = item.get("product_id")
    if not pid or not item.get("url"):
        return
    now = time.time()
    pr, av, rt = item.get("pricing", {}), item.get("availability", {}), item.get("ratings", {})
    seller = item.get("seller") or {}
    has_detail = bool(item.get("detail_scraped"))
    cats = [b.get("name") for b in (item.get("category") or {}).get("breadcrumbs", []) if b.get("name")]
    img = (item.get("images") or [None])[0]
    slug = slug_from_url(item["url"])
    item = {**item, "slug": slug}
    c.execute(
        """INSERT INTO products (product_id, slug, sku, name, title, brand, url, categories, category_leaf,
               price, old_price, discount_percent, currency, rating, rating_count, image, official_store,
               jumia_express, seller_id, seller_name, promo_tags, detail, first_seen, listing_at, detail_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(product_id) DO UPDATE SET
               sku=COALESCE(excluded.sku, sku), name=excluded.name, title=COALESCE(excluded.title, title),
               brand=COALESCE(excluded.brand, brand), url=excluded.url, categories=excluded.categories,
               category_leaf=COALESCE(excluded.category_leaf, category_leaf), price=excluded.price,
               old_price=excluded.old_price, discount_percent=excluded.discount_percent,
               rating=COALESCE(excluded.rating, rating), rating_count=COALESCE(excluded.rating_count, rating_count),
               image=COALESCE(excluded.image, image), official_store=excluded.official_store,
               jumia_express=excluded.jumia_express, seller_id=COALESCE(excluded.seller_id, seller_id),
               seller_name=COALESCE(excluded.seller_name, seller_name), promo_tags=excluded.promo_tags,
               detail=COALESCE(excluded.detail, detail), detail_at=COALESCE(excluded.detail_at, detail_at),
               updated_at=excluded.updated_at""",
        (pid, slug, item.get("sku"), item.get("name") or item.get("title") or slug, item.get("title"),
         item.get("brand"), item["url"], json.dumps(cats), (item.get("category") or {}).get("leaf"),
         pr.get("price"), pr.get("old_price"), pr.get("discount_percent"), pr.get("currency", "NGN"),
         rt.get("average"), rt.get("count"), img, _b((item.get("badges") or {}).get("official_store")),
         _b((item.get("badges") or {}).get("jumia_express")), seller.get("id"), seller.get("name"),
         json.dumps(pr.get("promo_tags") or []), json.dumps(item, ensure_ascii=False) if has_detail else None,
         now, now, now if has_detail else None, now),
    )
    _note_price(c, pid, pr.get("price"), pr.get("old_price"), now)


def save_search(query, page, result):
    """Remember a search page and store its products. `result` = {"cards", "last_page", "total"}."""
    now = time.time()
    with connect() as c:
        for card in result["cards"]:
            upsert_card(card, c)
        c.execute(
            "INSERT OR REPLACE INTO searches (query, page, total, last_page, product_ids, fetched_at) VALUES (?,?,?,?,?,?)",
            (query.lower(), page, result.get("total"), result.get("last_page"),
             json.dumps([x["product_id"] for x in result["cards"]]), now),
        )


# --------------------------------------------------------------------------- reads
def row_to_card(r):
    return {
        "product_id": r["product_id"], "sku": r["sku"], "name": r["name"], "brand": r["brand"], "url": r["url"],
        "categories": json.loads(r["categories"] or "[]"), "price": r["price"], "old_price": r["old_price"],
        "discount_percent": r["discount_percent"], "currency": r["currency"] or "NGN", "rating": r["rating"],
        "rating_count": r["rating_count"], "image": r["image"], "official_store": bool(r["official_store"]),
        "jumia_express": bool(r["jumia_express"]), "promo_tags": json.loads(r["promo_tags"] or "[]"),
        "seller_id": r["seller_id"],
    }


def get_search(query, page):
    """-> (result dict, age in seconds) or None."""
    with connect() as c:
        s = c.execute("SELECT * FROM searches WHERE query=? AND page=?", (query.lower(), page)).fetchone()
        if not s:
            return None
        ids = json.loads(s["product_ids"])
        rows = {r["product_id"]: r for r in c.execute(
            f"SELECT * FROM products WHERE product_id IN ({','.join('?' * len(ids))})", ids)} if ids else {}
    cards = [row_to_card(rows[i]) for i in ids if i in rows]
    return ({"query": query, "page": page, "last_page": s["last_page"], "total": s["total"], "cards": cards},
            time.time() - s["fetched_at"])


def get_product(slug):
    """-> (full record, age in seconds) or None if the detail page was never scraped."""
    with connect() as c:
        r = c.execute("SELECT detail, detail_at FROM products WHERE slug=? AND detail IS NOT NULL", (slug,)).fetchone()
    if not r:
        return None
    return json.loads(r["detail"]), time.time() - r["detail_at"]


def price_history(slug, days=90):
    since = time.time() - days * 86400
    with connect() as c:
        rows = c.execute(
            """SELECT h.price, h.old_price, h.seen_at FROM price_history h
               JOIN products p ON p.product_id = h.product_id
               WHERE p.slug=? AND h.seen_at>=? ORDER BY h.seen_at""", (slug, since)).fetchall()
        if not rows:  # keep the last known point even if older than the window
            rows = c.execute(
                """SELECT h.price, h.old_price, h.seen_at FROM price_history h
                   JOIN products p ON p.product_id = h.product_id
                   WHERE p.slug=? ORDER BY h.seen_at DESC LIMIT 1""", (slug,)).fetchall()
    return [{"price": r["price"], "old_price": r["old_price"], "at": r["seen_at"]} for r in rows]


def deals(limit=8, fresh_days=3):
    """Best discounts among recently-seen products; ones with real review history first."""
    since = time.time() - fresh_days * 86400
    with connect() as c:
        rows = c.execute(
            """SELECT * FROM products WHERE price IS NOT NULL AND discount_percent > 0 AND listing_at >= ?
               ORDER BY (COALESCE(rating_count,0) >= 10 AND COALESCE(rating,0) >= 3.5) DESC,
                        discount_percent DESC, rating_count DESC LIMIT ?""", (since, limit)).fetchall()
    return [row_to_card(r) for r in rows]


def trending(limit=8, fresh_days=3):
    since = time.time() - fresh_days * 86400
    with connect() as c:
        rows = c.execute(
            """SELECT * FROM products WHERE price IS NOT NULL AND rating_count > 0 AND listing_at >= ?
               ORDER BY rating_count DESC LIMIT ?""", (since, limit)).fetchall()
    return [row_to_card(r) for r in rows]


# --------------------------------------------------------------------------- locations + delivery fees
def save_locations(kind, rows, parent_id=None):
    now = time.time()
    with connect() as c:
        c.executemany(
            "INSERT OR REPLACE INTO locations (kind, id, parent_id, name, updated_at) VALUES (?,?,?,?,?)",
            [(kind, r["id"], parent_id, r["name"], now) for r in rows])


def get_locations(kind, parent_id=None):
    """-> (rows [{id,name}], age seconds) or None when nothing is stored."""
    with connect() as c:
        if parent_id is None:
            rows = c.execute("SELECT id, name, updated_at FROM locations WHERE kind=? ORDER BY name", (kind,)).fetchall()
        else:
            rows = c.execute("SELECT id, name, updated_at FROM locations WHERE kind=? AND parent_id=? ORDER BY name",
                             (kind, parent_id)).fetchall()
    if not rows:
        return None
    return [{"id": r["id"], "name": r["name"]} for r in rows], time.time() - min(r["updated_at"] for r in rows)


def city_name(city_id):
    with connect() as c:
        r = c.execute("SELECT name, parent_id FROM locations WHERE kind='city' AND id=?", (city_id,)).fetchone()
    return (r["name"], r["parent_id"]) if r else (None, None)


def save_delivery(sku, city_id, options):
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO delivery_fees (sku, city_id, options, fetched_at) VALUES (?,?,?,?)",
                  (sku, city_id, json.dumps(options, ensure_ascii=False), time.time()))


def get_delivery(sku, city_id):
    """-> (options list, age seconds) or None."""
    with connect() as c:
        r = c.execute("SELECT options, fetched_at FROM delivery_fees WHERE sku=? AND city_id=?", (sku, city_id)).fetchone()
    return (json.loads(r["options"]), time.time() - r["fetched_at"]) if r else None


def any_slug():
    with connect() as c:
        r = c.execute("SELECT slug FROM products WHERE detail IS NOT NULL LIMIT 1").fetchone()
    return r["slug"] if r else None


def sku_for_slug(slug):
    with connect() as c:
        r = c.execute("SELECT sku FROM products WHERE slug=?", (slug,)).fetchone()
    return r["sku"] if r and r["sku"] else None


def stats():
    with connect() as c:
        one = lambda q: c.execute(q).fetchone()[0]
        return {
            "products": one("SELECT COUNT(*) FROM products"),
            "with_detail": one("SELECT COUNT(*) FROM products WHERE detail IS NOT NULL"),
            "price_points": one("SELECT COUNT(*) FROM price_history"),
            "searches": one("SELECT COUNT(*) FROM searches"),
            "locations": one("SELECT COUNT(*) FROM locations"),
            "delivery_quotes": one("SELECT COUNT(*) FROM delivery_fees"),
            "last_update": one("SELECT MAX(updated_at) FROM products"),
        }


# --------------------------------------------------------------------------- import of old JSON crawls
def import_json(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    n = 0
    with connect() as c:
        for item in data.get("products", []):
            upsert_item(item, c)
            n += 1
    return n


init()

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    if cmd == "import":
        for f in sys.argv[2:]:
            print(f"{f}: {import_json(f)} products imported")
    print(json.dumps(stats(), indent=2))
