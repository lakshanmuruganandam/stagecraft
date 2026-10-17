import type { NextRequest } from "next/server";
import { canManageEvent, getViewer } from "@/lib/auth";
import { currentCode, verifyStageKey } from "@/lib/checkin";
import { getEventRow } from "@/server/queries";

/**
 * Current rotating check-in code, for the stage screen only: requires the
 * event's stage key (from the organizer's Stage/OBS link) or an organizer
 * session, so remote viewers can't harvest codes.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/events/[id]/checkin-code">) {
  const { id } = await ctx.params;
  const event = await getEventRow(id);
  if (!event || event.status !== "live") return Response.json({ error: "Check-in is open only while the event is live" }, { status: 404 });
  const authorized = verifyStageKey(event.id, req.nextUrl.searchParams.get("key")) || canManageEvent(await getViewer(), event);
  if (!authorized) return Response.json({ error: "Stage key required" }, { status: 403 });
  return Response.json(currentCode(event.id), { headers: { "Cache-Control": "no-store" } });
}
