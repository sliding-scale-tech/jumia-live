import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-md border border-line bg-white p-10 text-center">
      <div aria-hidden className="text-5xl">🧭</div>
      <h1 className="mt-3 text-sm font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-1 text-ink-3">The product may have been removed or the link is wrong.</p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ef6c00]">
        Back to home
      </Link>
    </div>
  );
}
