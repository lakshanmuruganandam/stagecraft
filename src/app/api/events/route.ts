import { listEvents } from "@/server/queries";

/** Public event index (used by the command palette and integrations). */
export async function GET() {
  const events = await listEvents();
  return Response.json(
    events.map(({ id, slug, title, kind, status, startsAt, hostHouseIds }) => ({ id, slug, title, kind, status, startsAt, hostHouseIds })),
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
