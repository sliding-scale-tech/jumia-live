import Link from "next/link";
import { NAV_LINKS, searchHref } from "@/lib/categories";
import { SITE_NAME } from "@/lib/format";

function Logo() {
  const i = SITE_NAME.toLowerCase().indexOf("radar");
  const head = i > 0 ? SITE_NAME.slice(0, i) : SITE_NAME;
  const tail = i > 0 ? SITE_NAME.slice(i) : "";
  return (
    <Link href="/" className="text-xl font-bold leading-6 text-white" style={{ letterSpacing: "-0.5px" }}>
      {head}
      <span className="text-brand-100">{tail}</span>
    </Link>
  );
}

export function Header({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <nav className="bg-brand-500" aria-label="Main">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 lg:px-8">
        <Logo />

        <form
          action="/search"
          role="search"
          className="order-last flex h-[38px] w-full min-w-0 overflow-hidden rounded-md md:order-none md:w-auto md:max-w-[685px] md:flex-1"
        >
          <input
            name="q"
            defaultValue={defaultQuery}
            required
            maxLength={80}
            placeholder="Search for a product…"
            aria-label="Search for a product"
            className="min-w-0 flex-1 bg-white px-4 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-2 bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search
          </button>
        </form>

        <span className="hidden items-center gap-1 text-brand-100 md:flex">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Lagos, NG
        </span>

        <Link
          href="/saved"
          className="ml-auto rounded border border-white px-3 py-1.5 text-white transition-colors hover:bg-white/15 md:ml-0"
        >
          My account
        </Link>
      </div>

      <div className="no-scrollbar flex gap-6 overflow-x-auto bg-black/15 px-4 py-1.5 text-white lg:px-8">
        {NAV_LINKS.map((l) => (
          <Link key={l.label} href={searchHref(l.q)} className="shrink-0 hover:underline">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
