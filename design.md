# cheapradar — Design Specification

Source: the Figma Make site `https://paste-grainy-83841338.figma.site/` (a French-language price-comparison
home page for Abidjan, CI). Everything below was measured from the live page in Chrome at a
1366 px-wide viewport (computed styles + bounding boxes), plus three reference screenshots in
[`design-reference/`](design-reference/):

| File | Shows |
|---|---|
| `01-top.jpg` | header, category bar, trust strip, category panel, hero slide 1 (green), promo cards |
| `02-middle.jpg` | Flash Deals cards (bottom half), "trending" product cards |
| `03-bottom.jpg` | trending cards, price-alert banner, footer note |

Only the desktop layout and **one page (home)** exist in the source. Everything marked
**(inferred)** is not in the source design and was extended to fit the scraper app
(search results, product detail, watchlist, responsive behaviour, hover states).

The app is the front end for the Jumia Nigeria scraper: same look, **English copy, Nigerian Naira (₦)**,
real data from the scraper API.

---

## 1. Design principles

1. **Orange = money and action.** Orange is used for the brand, prices, primary buttons, links. It is the only saturated "brand" colour; green/blue appear only as semantic accents (good news, info).
2. **Dense, flat, retail.** 12 px body text, 6 px corners, 1 px hairline borders, almost no shadows. It should feel like a marketplace, not a SaaS dashboard.
3. **Emoji as icons.** Category and feature icons are colour emoji (Windows Fluent set in the source). Only the search magnifier and location pin are line icons (Lucide style, 16 px, 2 px stroke).
4. **One content column.** All page content sits in a centred 1104 px column on a light grey page.

---

## 2. Design tokens

### 2.1 Colours

| Token | Hex | Used for |
|---|---|---|
| `brand-500` | `#F57C00` | header, category-panel head, prices, primary buttons, links, progress fill |
| `brand-600` | `#E65100` | search button, discount badge, "LIMITED" pill, stock number, promo title |
| `brand-700` | `#D46A00` *(= `#F57C00` + 15 % black overlay)* | category bar background (rendered result of `rgba(0,0,0,.15)` over brand-500) |
| `brand-100` | `#FFE0B2` | logo "radar", location text, banner subtitle |
| `brand-50` | `#FFF3E0` | promo card 1 background |
| `brand-200` | `#FFCC80` | promo card 1 border |
| `green-700` | `#2E7D32` | positive price change (`-8 % moy.`), promo card 2 title, hero slide 1 start |
| `green-900` | `#1B5E20` | hero slide 1 end |
| `green-50` / `green-200` | `#E8F5E9` / `#A5D6A7` | promo card 2 background / border |
| `blue-800` | `#1565C0` | promo card 3 title, hero slide 2 start |
| `blue-900` | `#0D47A1` | hero slide 2 end |
| `blue-50` / `blue-200` | `#E3F2FD` / `#90CAF9` | promo card 3 background / border |
| `ink` | `#1A1A1A` | default text, product names |
| `ink-2` | `#374151` | category items, trust strip |
| `ink-3` | `#6B7280` | secondary text ("3 offers", seller tags, promo subtitles) |
| `ink-4` | `#9CA3AF` | tertiary text: old price, "stock left" label, product sub-title, placeholder |
| `line` | `#E2E5EA` | card borders |
| `line-soft` | `#F3F4F6` | list separators, progress track, tag background |
| `surface-2` | `#F8F9FA` | product image well |
| `page` | `#F4F5F7` | page background |
| `white` | `#FFFFFF` | cards, inputs, trust strip, footer |

Gradients (all `135deg`):
- Brand banner: `#F57C00 → #E65100`
- Hero slide 1 (green): `#2E7D32 → #1B5E20`
- Hero slide 2 (blue): `#1565C0 → #0D47A1`

Translucent whites used on coloured backgrounds: `rgba(255,255,255,.25)` (hero badge), `.20` (hero chips), `.80` (hero subtitle), `.40` (inactive carousel dot), `.90` (hero pill button, inferred).

### 2.2 Typography

Font: **Inter** (400 / 500 / 600 / 700), system sans fallback. Base `16px/24px`, body colour `ink`.

| Role | Size / weight | Colour | Notes |
|---|---|---|---|
| Logo | 20 / 700 | white + `brand-100` | letter-spacing `-0.5px`, lower-case, "cheap" white, "radar" brand-100 |
| Hero title | 30 / 700 | white | line-height 38 px |
| Hero subtitle | 14 / 400 | white 80 % | line-height 20 px |
| Section title | 14 / 700 | ink | "Flash Deals", "Trending this week" |
| Banner title | 16 / 700 | white | |
| Price (card) | 14 / 700 | brand-500 | |
| Price (product page, inferred) | 28 / 700 | brand-500 | |
| Buttons | 14 / 700 (search button 14 / 500) | white | |
| Product name | 12 / 600 | ink | line-height 15 px, max 2 lines (inferred) |
| Body small / labels | 12 / 400 | ink-2 / ink-3 / ink-4 | line-height 16 px |
| Category panel head | 12 / 700, uppercase, `letter-spacing .3px` | white | |
| Badges / pills | 12 / 700 | white | |
| Links | 12 / 500 | brand-500 | "View all →" |

Numbers use the locale thousands separator and the currency suffix in the source (`695 000 XOF`).
For Nigeria use the prefix form: `₦31,999` (en-NG, no decimals).

### 2.3 Spacing, radii, elevation

- Base unit 4 px. Common gaps: 4, 6, 8, 10, 12, 16, 20, 24, 32.
- Radius: **6 px** cards / hero / buttons / inputs; **4 px** badges, tags, the account button; **full** (pill) for hero chips, carousel dots, progress bar.
- Borders: 1 px `line` on cards; 1 px `#FFCC80/#A5D6A7/#90CAF9` on the promo cards.
- Elevation: **none** in the source. (Inferred hover: `0 4px 12px rgba(0,0,0,.08)` and `translateY(-1px)` on product cards.)

---

## 3. Page shell & grid

```
┌ header (58) ─────────────────────────────────────────────────────────────┐ bg brand-500
├ category bar (28) ───────────────────────────────────────────────────────┤ bg rgba(0,0,0,.15)
├ trust strip (33) ────────────────────────────────────────────────────────┤ bg white
│                       16 px                                              │
│        ┌──────── content column: 1104 px, centred ────────┐              │
│        │ [panel 208][16][ hero 880 x 250        ]         │              │
│        │            [   ][ promo ×3 : 285 | 12 | … ]      │              │
│        │ Flash Deals … 4 cards (267 | 12 gap)             │              │
│        │ Trending … 4 cards                               │              │
│        │ price-alert banner (88)                          │              │
│        └──────────────────────────────────────────────────┘              │
├ footer note (≈41, top border) ───────────────────────────────────────────┤
```

- Page bg `page`. Header/category bar/trust strip span the full width with 32 px side padding (content inside the header is **not** limited to 1104).
- Content column: `max-width 1104px`, centred, side padding 16 px on small screens.
- Vertical rhythm between sections: 16 px (hero → promos), ≈24 px (promos → section title), 12–16 px (title → cards), ≈24 px between sections.
- Product grids: **4 columns × 267 px, 12 px gap** (4×267 + 3×12 = 1104).

---

## 4. Components

### 4.1 Header (height 58, padding `10px 32px`, bg `brand-500`)

Left → right, vertically centred, gaps ≈ 16–20 px:

1. **Logo** at x = 32 (see typography). Links to `/`.
2. **Search box** — one 685 px unit starting x = 155: white field **558 × 38** (`padding 0 16px`, 14 px text `ink`, placeholder `ink-4` "Search for a product…", no border, left corners 6 px) joined to a **button 114 × 38**, bg `brand-600`, white 14/500 text, magnifier icon (16 px) + "Search", right corners 6 px. Submitting goes to `/search?q=…`.
3. **Location** — pin icon + "Lagos, NG" in `brand-100`, 12 px (static label in this app).
4. **Account button** — 97 × 30, transparent, 1 px white border, 4 px radius, `padding 6px 12px`, 12 px white. Label "My account" (inferred: opens the watchlist `/saved`).

### 4.2 Category bar (height 28, `padding 6px 32px`, bg `rgba(0,0,0,.15)`)

Text links, 12 px / 400 white, gap 24 px: Phones · Computers · Audio · Consoles · Appliances · Fashion.
(Inferred) hover: underline; each link goes to `/search?q=<term>`.

### 4.3 Trust strip (height 33, `padding 8px 32px`, bg white)

Five items spread with `justify-content: space-around`, each = emoji (14 px) + 12 px `ink-2` text:
`🚚 Delivery estimate included` · `📊 90-day price history` · `✅ Live verified prices` · `🤖 Personalised AI advice` · `📍 Lagos, Nigeria`.
Hidden below `md` (inferred) — or horizontally scrollable.

### 4.4 Category panel (208 × 374, left column, white, 1 px `line` border, 6 px radius, overflow hidden)

- **Head** 40 px: bg `brand-500`, "ALL CATEGORIES", white 12/700 uppercase, `ls .3px`, `padding 12px 16px`.
- **Rows** 37 px each (9 rows): emoji (14 px) + label (12 px `ink-2`), left padding 16 px, gap 10 px; chevron `›` at the right edge in `ink-4`; 1 px `line-soft` separator.
  Rows: 📱 Phones & Tablets · 💻 Computers · 🎧 Audio & Sound · 🎮 Consoles & Games · 📷 Cameras · 🏠 Home & Appliances · 👟 Fashion & Shoes · ⌚ Watches & Jewellery · 🛒 All categories.
- (Inferred) hover: bg `brand-50`, label `brand-600`. Each row links to a search.

### 4.5 Hero carousel (880 × 250, radius 6, padding 28 32, overflow hidden)

Two slides, **auto-advance every ≈ 4 s** (green → blue → green), cross-fade; two dots bottom-centre (y ≈ 234 from top of hero): active dot is a pill ≈ 20 × 6 white, inactive 6 × 6 `rgba(255,255,255,.4)`; dots are clickable (inferred).

Slide 1 (green) layout, left column 648 px wide:
1. Badge `SAVE` — `rgba(255,255,255,.25)`, 12/700 white, radius 4, `padding 2px 8px`, h 20.
2. Title `Up to 15% off` — 30/700 white (margin-top 8).
3. Subtitle `On Samsung phones right now` — 14 white 80 %.
4. **Compare form** (margin-top 20): white input 340 × 44 (`padding 12px 16px`, 14 px, left radius 6, placeholder "e.g. iPhone 17, Galaxy S25…") + button 108 × 44, bg `brand-500`, white 14/700 "Compare" (right radius 6).
5. **Quick chips** (margin-top 12): pills h 24, `rgba(255,255,255,.2)`, 12/500 white, `padding 4px 10px`, gap 8: `iPhone 17`, `AirPods Pro`, `PlayStation 5`, `Galaxy S25`. Click → search.

Right side (x ≈ 1057–1200 of the page): a large product emoji (≈ 110 px, 📲) with a white pill CTA under it: `Compare now` — white, text `brand-500` 12/700, two lines centred, radius full, `padding ≈ 12px 20px`, ≈ 144 × 48.

Slide 2 (blue) — the source only shows its background; content **(inferred)**: badge `NEW`, title "Best laptop deals", subtitle "Compare prices across Jumia sellers", chips Laptop / HP / Dell / MacBook, emoji 💻.

### 4.6 Promo cards (3 × 285 × 100, gap 12, under the hero; radius 6, `padding 16`, 1 px border)

Vertical stack: emoji (24 px) → title (12/700) → subtitle (12/400 `ink-3`), stack gap 2–8 px.

| Card | bg / border | Title colour | Content |
|---|---|---|---|
| 1 | `brand-50` / `#FFCC80` | `brand-600` | ⚡ **Flash Deals** — Limited-time prices |
| 2 | `green-50` / `#A5D6A7` | `green-700` | 🚚 **Fast delivery** — Get it in 1–2 days |
| 3 | `blue-50` / `#90CAF9` | `blue-800` | 🤖 **AI buying advice** — Buy now or wait? |

Cards are links (inferred: 1 → `#flash-deals`, 2 → search "express", 3 → `/saved`).

### 4.7 Section header

Row, space-between, baseline-aligned, margin-bottom 12 px:
- Left: emoji (20 px) + title 14/700 ink + optional pill (`LIMITED`: bg `brand-600`, white 12/700, radius 4, `padding 2px 8px`, h 20, margin-left 8).
- Right: link `View all →` 12/500 `brand-500` (inferred hover underline).

### 4.8 Product card — "deal" variant (267 × ≈ 249)

White, 1 px `line` border, radius 6, overflow hidden.

1. **Image well** — full width × 128, bg `surface-2`, content centred (emoji 48 px in the source; **product photo `object-contain`, max 112 px tall** in the app). Discount badge absolute at `top 8 / left 8`: bg `brand-600`, white 12/700, radius 4, `padding 2px 6px`, e.g. `-7%`.
2. **Body** `padding 12px`:
   - Name 12/600 ink (2-line clamp, 15 px line-height).
   - Old price 12 `ink-4`, strikethrough (margin-top 8).
   - Current price 14/700 `brand-500` (margin-top 2).
   - Footer row (margin-top 8): left label `Stock left` 12 `ink-4` — right value `3 units` 12 `brand-600`.
   - Progress bar: h 6, full radius, track `line-soft`, fill `brand-500`, width = share (e.g. 58 / 241 px = 24 %).
   - **App mapping:** Jumia listings have no stock count, so this row shows **rating** instead: label `Rating`, value `4.1 ★ (1,584)`, fill width = `rating / 5`. Hide the row when the product has no ratings.

### 4.9 Product card — "trending" variant (267 × ≈ 247)

Same shell and image well (no discount badge).
Body: name 12/600 → subtitle 12 `ink-4` (source: capacity / edition; app: **brand**) → price 14/700 `brand-500` (margin-top 8) → row: `3 offers` 12 `ink-3` ⟷ `-8% avg.` 12/500 `green-700` (app: `reviews` count ⟷ discount %) → tag row (margin-top 8, gap 4–6): tags are bg `line-soft`, text `ink-3` 12, radius 4, `padding 2px 6px`, h 20 (source: shop names "Jumia", "AliExpress"; app: `Official Store`, `Express`, seller name).

### 4.10 Price-alert banner (1104 × 88, gradient brand, radius 6, `padding 20px 24px`)

Flex, space-between, centred vertically.
- Left: title `Turn on price alerts` 16/700 white; subtitle `Get notified as soon as a saved product drops in price.` 14 `brand-100` (margin-top 4).
- Right: button 150 × 40, white bg, text `brand-500` 14/700, radius 6, `padding 10px 20px`: `View my watchlist` (source: "Create an alert").

### 4.11 Footer note (white, top border 1 px `line`, `padding ≈ 12px 16px`, centred, 12 px `ink-3`)

`📍 Prices estimated for **Lagos, Nigeria** · Change city · Delivery and taxes estimated in all displayed prices` — city bold `ink`, the link underlined `brand-500`.
(App: static; "Change city" omitted unless implemented.)

---

## 5. Additional pages (inferred, built from the same tokens)

### 5.1 Search results — `/search?q=…&page=…`
- Shell identical. Breadcrumb line (12 px `ink-3`): `Home › Results for "phone"`.
- Header row: `"phone"` (16/700) + `195,387 results` (12 `ink-3`) on the left; **Sort** select on the right (Relevance, Price low→high, Price high→low, Biggest discount, Top rated).
- Two columns: **filter sidebar 208 px** (white card, same style as the category panel): Price range (min/max inputs + Apply), Brand (checkbox list from current results, top 8), toggles "Discounted only", "Official Store only", "Jumia Express". Filters/sorting apply to the loaded page.
- Grid: 3 columns of the trending-style card (`267 px` → fluid), 12 px gap.
- Pagination: numbered buttons (32 × 32, radius 6, 1 px `line`, active = `brand-500` bg white text), prev/next.
- Empty state: 🔎 emoji 48 px, "No results for …", suggestions as hero-style chips (in `brand-500` outline).

### 5.2 Product page — `/product/[slug]`
- Breadcrumb from the Jumia category trail.
- Two-column card (white, border, radius 6, padding 20):
  left = image gallery (large 420 px well on `surface-2` + thumbnail row of 56 px squares, active thumb has `brand-500` 2 px border);
  right = brand (12 `brand-600` uppercase), title (20/700), rating row (stars in `#F59E0B`, `4.1 (1,584)` 12 `ink-3`), price block (28/700 `brand-500`, old price strikethrough, `-27%` badge), shipping line (`+ ₦1,000 delivery`), stock pill (green "In stock"), badges (Official Store, Express, Pay on delivery), buttons: primary `View on Jumia ↗` (brand-500, 44 px high, 6 px radius) and secondary `♡ Save` (white, 1 px `brand-500` border).
- Below: **Seller card** (name, score %, followers, performance rows with coloured dots), **Key features** list, **Specifications** table (zebra `line-soft`), **Rating breakdown** (5→1 bars in `brand-500` on `line-soft`), **Reviews** list (stars, title, body, author, date), **Delivery & returns** text.
- Sticky mobile bottom bar: price + `View on Jumia`.

### 5.3 Watchlist — `/saved`
- Grid of trending-style cards for products saved in the browser (localStorage). Each card shows the **saved price** and the **current price** (when re-checked), with a coloured delta (`green-700` if cheaper, `brand-600` if more expensive) and a remove (✕) button. Empty state: ♡ emoji + "Nothing saved yet".

### 5.4 Loading / error
- Route transitions use the radar loader (5.5). Skeletons: same card shells with `line-soft` blocks (image 128 px, 3 text lines), pulse animation 1.5 s.
- Error: white card, ⚠️ emoji, message, `Try again` primary button.

### 5.5 Live search & the radar loader (inferred — not in the source design)

Search results are **streamed** from the scraper (Server-Sent Events, proxied by the site) so the visitor sees the scraper working.

**Phase 1 — Radar loader** (from the request until the first product arrives). One white card (`border line`, radius 6, `padding 40 24`, centred):
- **Radar** 220 × 220: three concentric rings (`brand-200` 1 px; the inner disc filled `brand-50`), a horizontal and vertical cross-hair (`brand-200`), two expanding ping rings (`brand-500` 2 px, scale .15 → 1 while fading out, 2.4 s, second offset 1.2 s), a **sweeping beam** (conic gradient from transparent to `brand-500`, one rotation per 2.8 s, linear) and a centre dot (`brand-600`, white ring).
- **Blips**: four product emoji (📱 🎧 🎮 💻, 24 px) at fixed spots that fade/scale in as the beam passes (2.8 s loop, staggered 0.3 / 1.1 / 1.9 / 2.6 s).
- Title 14/700: `Scanning Jumia for “phone”`; status line 12 `ink-3` showing the **real** step reported by the scraper ("Connecting to the scraper…", "Asking Jumia for “phone”…"), cycling a generic message if none yet.
- Indeterminate bar 224 × 6 (same shape as the "stock left" bar: track `line-soft`, fill `brand-500`, 1.4 s slide).
- Pill `LIVE FROM THE SCRAPER`: `brand-600`, white 12/700, radius 4, `padding 2px 8px`, with a pulsing white dot.

**Phase 2 — products stream in.** A **live bar** (white card, `padding 12 16`) sits above the filters/grid:
`LIVE` pill (`brand-600`) + pulsing `brand-500` dot + text (`Receiving products… 12/40`, then `Reading product pages 3/12…`), right side = source (`Fresh from Jumia` / `Served from the database`) and total result count, and a 6 px progress bar (`brand-500` on `line-soft`; first half = products received, second half = product pages read). When finished the pill turns `good-700` and says `DONE`.
- Each product card **pops in** as its event arrives: 380 ms, `opacity 0 → 1`, `translateY(10px) scale(.97) → none`, ease `cubic-bezier(.2,.7,.2,1)`.
- After the cards, the scraper opens each product page in turn. While waiting a card shows a **shimmer** line (`line-soft ↔ brand-50` sweep); when the page has been read it becomes `✓ Seller name · 94 %` (tick `good-700`, `· 6 left` in `brand-600` when stock is known), separated from the card body by a 1 px `line-soft` rule.
- `prefers-reduced-motion`: all of the above animation is disabled; content still appears progressively.

**Errors:** if the stream fails before any product, show the standard error card with `Try again`; if it fails midway, keep the products already shown.

### 5.7 Delivery & pickup fees column (product page, right column, above "Seller")
Jumia quotes **two options per product and location**: *Pickup Station* (collect at a station) and *Door Delivery*. The fee depends on the product's size/weight and on the city; some areas only offer pickup. The scraper reads Jumia's own `/fragment/delivery/sku/{sku}/city/{id}/` response; the page opens with Jumia's default location (Lagos – Sangotedo).

Card "🚚 Delivery & pickup fees" (white, border `line`, radius 6; header row 14/700 with `line-soft` rule; body padding 20, gap 12):
- **Location picker**: two selects side by side (stacked below 1024 px): `State` and `City / area` — 36 px high, white, 1 px `line`, radius 6, 12 px text; label above each in `ink-3`. Choosing a state loads its areas and clears the fees; choosing an area fetches the fees. The choice is remembered in the browser and restored on the next product.
- **Option row** (one per option; white card, border `line`, radius 6, padding 12): 40 × 40 icon tile (`surface-2`, border `line-soft`, emoji 20 px: 🏬 pickup, 🚚 door) · title 12/600 · fee right-aligned **14/700 `brand-500`** · line `Ready between **16 October** and **19 October**` (`ink-3`, dates `ink-2` medium) · `Order within 8hrs 29mins` (`ink-4`) · `Total with item: **₦33,099**` (item price + fee) · collapsible "Details" link in `brand-500` with Jumia's pickup/delivery note.
- **Not offered** here: row on `surface-2` with border `line-soft`, fee slot reads `Not available here` in `ink-4`, hint "Choose another area…".
- **Loading**: two shimmer blocks (80 px). **Error**: `brand-50` box with an underlined "Try again".
- Footer note (`ink-4`): fees depend on size/weight and location, shown as quoted by Jumia.
- **Search cards**: after a product's page has been read, its footer line adds `🏬 ₦1,000  🚚 ₦1,600` (pickup / door fee for the default location, `—` when not offered), 12 px, `ink-2` with bold amounts.

### 5.6 Price history (product page)
Card "Price history · last 90 days": step line chart in `brand-500` (2 px) over a `brand-50` area, points as white dots with `brand-600` stroke, min/max/change summary above (`good-700` for lower, `brand-600` for higher). With fewer than two recorded prices it shows a short "tracking started" note. Data = the scraper database's `price_history` table (a point is stored only when the price changes).

---

## 6. Interaction states (inferred — the source is static)

| Element | Hover | Active / focus |
|---|---|---|
| Buttons (brand-500) | bg `#EF6C00` | focus ring `0 0 0 3px rgba(245,124,0,.35)` |
| Search button (brand-600) | bg `#BF360C` | same ring |
| Inputs | — | ring `0 0 0 3px rgba(245,124,0,.35)`, no border change |
| Product card | shadow `0 4px 12px rgba(0,0,0,.08)`, name turns `brand-600` | — |
| Links | underline | — |
| Category rows | bg `brand-50` | — |
| Chips | bg `rgba(255,255,255,.3)` | — |

Transitions: 150 ms ease for colour/shadow; hero cross-fade 500 ms.

## 7. Responsive behaviour (inferred)

| Breakpoint | Behaviour |
|---|---|
| ≥ 1280 | as specified (4-column grids, panel + hero side by side) |
| 1024–1279 | 4 → 3 columns; content column fluid with 16 px gutters |
| 768–1023 | category panel hidden (its links move to a horizontal scroll row); grids 2–3 columns; hero full width |
| < 768 | header wraps: logo + account on row 1, search full-width on row 2; category bar horizontally scrollable; trust strip hidden; hero padding 20, title 24 px, right-hand art hidden; promos stack (1 column, h auto); grids 2 columns with 8 px gap; banner stacks (button full width); product page single column |

## 8. Accessibility

- Text/background pairs that pass AA at their sizes: white on `brand-600` (4.6:1 ✔), `brand-500` on white **only for ≥ 14 px bold** (3.0:1 ✔ large text — keep prices ≥ 14/700), `ink`/`ink-2` on white ✔. `ink-4` (#9CA3AF) is **decorative/secondary only** (old prices, placeholders) — never the only carrier of meaning.
- Hero carousel: pause on hover/focus, dots are `<button aria-label="Show slide n">`, respects `prefers-reduced-motion` (no auto-advance).
- Emoji icons are `aria-hidden` when next to a text label.
- Visible focus ring on every interactive element; all cards are single links with an accessible name.

## 9. Content & data mapping (scraper API → UI)

| UI element | Field |
|---|---|
| Card name | `name` |
| Card image | `image` (listing) / `images[0]` (detail) |
| Discount badge | `discount_percent` |
| Price / old price | `price` / `old_price` (NGN) |
| Rating row | `rating`, `rating_count` |
| Tags | `official_store`, `jumia_express`, seller name |
| Product page | detail record: `pricing`, `availability`, `ratings.breakdown`, `seller`, `key_features`, `specifications`, `reviews`, `delivery_returns`, `category.breadcrumbs` |
| "View on Jumia" | `url` |
| Flash Deals | top discounts among home-page searches (real review history first) |
| Trending | highest `rating_count` |

Copy tone: short, friendly, sentence case; buttons are verbs (`Search`, `Compare`, `View on Jumia`, `Save`).
