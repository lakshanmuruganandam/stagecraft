import type { NextRequest } from "next/server";
import { buildIcs, radarEvents } from "@/server/hub";

/** Subscribable feed of every public house event (webcal-friendly). */
export async function GET(req: NextRequest) {
  const ics = buildIcs(await radarEvents(), req.nextUrl.origin);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="stagecraft.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
