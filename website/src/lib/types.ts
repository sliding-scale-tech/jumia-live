/** One product as returned by GET /search and GET /home (listing data). */
export interface Card {
  product_id: string;
  sku: string | null;
  name: string;
  brand: string | null;
  url: string;
  categories: string[];
  price: number | null;
  old_price: number | null;
  discount_percent: number | null;
  currency: string;
  rating: number | null;
  rating_count: number | null;
  image: string | null;
  official_store: boolean;
  jumia_express: boolean;
  promo_tags: string[];
  seller_id: string | null;
}

export interface SearchResult {
  query: string;
  page: number;
  last_page: number;
  total: number | null;
  cards: Card[];
}

export interface HomeData {
  deals: Card[];
  trending: Card[];
  count: number;
}

/** One way to receive the product: collect at a pickup station, or have it delivered to the door. */
export interface DeliveryOption {
  type: "pickup" | "door";
  title: string;
  fee: number | null;
  eta_from: string | null;
  eta_to: string | null;
  order_within: string | null;
  note: string | null;
}

export interface DeliveryLocation {
  region_id: number | null;
  region: string | null;
  city_id: number | null;
  city: string | null;
}

/** Fees for the location Jumia shows by default (Lagos / Sangotedo), part of the product record. */
export interface Delivery {
  location: DeliveryLocation;
  options: DeliveryOption[];
}

/** Full product detail as returned by GET /product/{slug}. */
export interface Product {
  product_id: string;
  slug: string;
  sku: string | null;
  url: string;
  name: string;
  title: string | null;
  brand: string | null;
  description: string | null;
  pricing: {
    currency: string;
    price: number | null;
    old_price: number | null;
    discount_percent: number | null;
    shipping_from: number | null;
  };
  availability: {
    status: string | null;
    stock_text: string | null;
    units_left: number | null;
    condition: string | null;
  };
  category: { leaf: string | null; breadcrumbs: { name: string; url?: string }[] };
  ratings: { average: number | null; count: number | null; breakdown: Record<string, number> };
  badges: { official_store: boolean; jumia_express: boolean; pay_on_delivery: boolean | null };
  seller: {
    name?: string | null;
    url?: string | null;
    score_percent?: number | null;
    followers?: number | null;
    performance?: Record<string, string>;
  };
  images: string[];
  key_features: string[];
  specifications: Record<string, string>;
  delivery_returns: string | null;
  delivery: Delivery | null;
  reviews: {
    rating: number | null;
    title: string | null;
    body: string | null;
    date: string | null;
    author: string | null;
  }[];
}
