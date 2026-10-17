import type { NextRequest } from "next/server";
import { buildIcs } from "@/server/hub";
import { getEventRow } from "@/server/queries";
import { eventDTO } from "@/server/views";

/** Single-event .ics download ("Add to calendar"). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/events/[id]/ics">) {
  const { id } = await ctx.params;
  const row = await getEventRow(id);
  if (!row || row.status === "draft") return new Response("Not found", { status: 404 });
  const e = eventDTO(row);
  return new Response(buildIcs([e], req.nextUrl.origin, e.title), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
