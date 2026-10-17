import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { getEventRow, getSnapshot } from "@/server/queries";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/events/[id]/snapshot">) {
  const { id } = await ctx.params;
  const row = await getEventRow(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  const snap = await getSnapshot(row.id, await getViewer());
  return Response.json(snap, { headers: { "Cache-Control": "no-store" } });
}
