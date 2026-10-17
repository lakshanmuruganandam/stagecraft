import { leaderboard } from "@/server/queries";

/** House points (public), used by the background scenery's peaks. */
export async function GET() {
  const rows = await leaderboard();
  return Response.json(
    rows.map(({ slug, name, color, points }) => ({ slug, name, color, points })),
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
