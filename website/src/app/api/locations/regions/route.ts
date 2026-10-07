import { proxyJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return proxyJson("/locations/regions", 86400);
}
