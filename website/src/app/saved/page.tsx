import type { Metadata } from "next";
import { Watchlist } from "@/components/Watchlist";

export const metadata: Metadata = { title: "My watchlist" };

export default function SavedPage() {
  return (
    <div>
      <h1 className="mb-1 text-base font-bold">My watchlist</h1>
      <p className="mb-4 text-ink-3">Saved in this browser. We re-check each price when you open this page.</p>
      <Watchlist />
    </div>
  );
}
