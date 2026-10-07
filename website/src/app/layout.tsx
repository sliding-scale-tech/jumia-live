import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer, TrustStrip } from "@/components/Chrome";
import { SITE_NAME } from "@/lib/format";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — compare prices on Jumia Nigeria`, template: `%s · ${SITE_NAME}` },
  description: "Search Jumia Nigeria, compare prices, see discounts and ratings, and keep a watchlist of products.",
};

export const viewport: Viewport = { themeColor: "#f57c00", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Header />
        <TrustStrip />
        <main className="mx-auto w-full max-w-[1104px] px-4 pt-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
