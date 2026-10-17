import type { NextRequest } from "next/server";
import { canManageEvent, getViewer } from "@/lib/auth";
import { getEventRow, getSnapshot } from "@/server/queries";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/events/[id]/snapshot">) {
  const { id } = await ctx.params;
  const row = await getEventRow(id);
  const viewer = await getViewer();
  if (!row || (row.status === "draft" && !canManageEvent(viewer, row))) return Response.json({ error: "Not found" }, { status: 404 });
  const snap = await getSnapshot(row.id, viewer);
  return Response.json(snap, { headers: { "Cache-Control": "no-store" } });
}
