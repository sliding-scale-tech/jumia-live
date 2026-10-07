export const NAV_LINKS = [
  { label: "Phones", q: "phone" },
  { label: "Computers", q: "laptop" },
  { label: "Audio", q: "headphones" },
  { label: "Consoles", q: "playstation" },
  { label: "Appliances", q: "air fryer" },
  { label: "Fashion", q: "sneakers" },
];

export const CATEGORY_PANEL = [
  { icon: "📱", label: "Phones & Tablets", q: "smartphone" },
  { icon: "💻", label: "Computers", q: "laptop" },
  { icon: "🎧", label: "Audio & Sound", q: "headphones" },
  { icon: "🎮", label: "Consoles & Games", q: "playstation" },
  { icon: "📷", label: "Cameras", q: "camera" },
  { icon: "🏠", label: "Home & Appliances", q: "blender" },
  { icon: "👟", label: "Fashion & Shoes", q: "sneakers" },
  { icon: "⌚", label: "Watches & Jewellery", q: "watch" },
  { icon: "🛒", label: "All categories", q: "deals" },
];

export const searchHref = (q: string) => `/search?q=${encodeURIComponent(q)}`;
