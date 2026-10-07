import { proxyJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ region: string }> }) {
  const region = parseInt((await params).region, 10);
  if (!Number.isInteger(region) || region < 1 || region > 999) return Response.json({ error: "bad region" }, { status: 400 });
  return proxyJson(`/locations/regions/${region}/cities`, 86400);
}
