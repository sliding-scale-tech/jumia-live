import { AlertBanner, CategoryPanel, PromoCards, SectionHeader } from "@/components/Chrome";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductCard";
import { ErrorCard } from "@/components/States";
import { getHome } from "@/lib/api";
import type { HomeData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function HomePage() {
  let data: HomeData | null = null;
  let error: string | null = null;
  try {
    data = await getHome();
  } catch (e) {
    error = e instanceof Error ? e.message : "Something went wrong";
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <CategoryPanel />
        <div className="min-w-0 flex-1 space-y-4">
          <Hero />
          <PromoCards />
        </div>
      </div>

      {error || !data ? (
        <ErrorCard message={error ?? "No data"} />
      ) : (
        <>
          <section>
            <SectionHeader id="flash-deals" icon="⚡" title="Flash Deals" pill="LIMITED" href="/search?q=deals" />
            <ProductGrid cards={data.deals.slice(0, 4)} variant="deal" />
          </section>

          <section>
            <SectionHeader title="Trending this week" href="/search?q=phone" />
            <ProductGrid cards={data.trending.slice(0, 4)} variant="trend" />
          </section>
        </>
      )}

      <AlertBanner />
    </div>
  );
}
