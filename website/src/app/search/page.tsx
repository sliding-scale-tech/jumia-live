import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveSearch } from "@/components/LiveSearch";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}”` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  if (!q) redirect("/");
  const page = Math.min(50, Math.max(1, parseInt(sp.page ?? "1", 10) || 1));

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-ink-3">
        <Link href="/" className="hover:underline">Home</Link> › Results for &ldquo;{q}&rdquo;
      </nav>
      <h1 className="mb-4 text-base font-bold">&ldquo;{q}&rdquo;</h1>
      {/* products stream in live from the scraper; see components/LiveSearch.tsx */}
      <LiveSearch key={`${q}|${page}`} q={q} page={page} />
    </div>
  );
}
