import type { NextRequest } from "next/server";
import { currentCode } from "@/lib/checkin";
import { getEventRow } from "@/server/queries";

/** Current rotating check-in code for the stage screen (public by design: it only works in the room, for 60s). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/events/[id]/checkin-code">) {
  const { id } = await ctx.params;
  const event = await getEventRow(id);
  if (!event || event.status !== "live") return Response.json({ error: "Check-in is open only while the event is live" }, { status: 404 });
  return Response.json(currentCode(event.id), { headers: { "Cache-Control": "no-store" } });
}
