import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { canManageEvent, getViewer } from "@/lib/auth";
import { getEventRow, participants } from "@/server/queries";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Organizer-only CSV of everyone who took part, for house records. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/events/[id]/export">) {
  const { id } = await ctx.params;
  const event = await getEventRow(id);
  if (!event) return new Response("Not found", { status: 404 });
  if (!canManageEvent(await getViewer(), event)) return new Response("Forbidden", { status: 403 });
  const db = await getDb();
  const houses = await db.query.houses.findMany();
  const rows = await participants(db, event.id);
  const lines = [
    ["name", "email", "house", "interactions"].join(","),
    ...rows.sort((a, b) => b.actions - a.actions).map((r) => [r.name, r.email, houses.find((h) => h.id === r.houseId)?.name, r.actions].map(csv).join(",")),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-participants.csv"`,
    },
  });
}
