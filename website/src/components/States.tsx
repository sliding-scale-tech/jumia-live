import Link from "next/link";
import { searchHref } from "@/lib/categories";

export function ErrorCard({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-md border border-line bg-white p-8 text-center">
      <div aria-hidden className="text-5xl">⚠️</div>
      <h2 className="mt-3 text-sm font-bold">We couldn&apos;t load this right now</h2>
      <p className="mt-1 text-ink-3">{message}</p>
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-md bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#ef6c00]"
        >
          Try again
        </button>
      ) : (
        <Link href="/" className="mt-4 inline-block rounded-md bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ef6c00]">
          Back to home
        </Link>
      )}
    </div>
  );
}

export function EmptyResults({ query }: { query: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-10 text-center">
      <div aria-hidden className="text-5xl">🔎</div>
      <h2 className="mt-3 text-sm font-bold">No results for &ldquo;{query}&rdquo;</h2>
      <p className="mt-1 text-ink-3">Check the spelling or try a more general word.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {["phone", "laptop", "headphones", "television"].map((q) => (
          <Link key={q} href={searchHref(q)} className="rounded-full border border-brand-500 px-3 py-1 font-medium text-brand-500 hover:bg-brand-50">
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
