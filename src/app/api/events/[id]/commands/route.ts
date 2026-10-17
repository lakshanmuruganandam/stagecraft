import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { HttpError, getViewer } from "@/lib/auth";
import { runCommand } from "@/server/commands";

/** RPC-style endpoint for every live interaction. See server/commands.ts. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/events/[id]/commands">) {
  const { id } = await ctx.params;
  try {
    // CSRF: browsers always send Origin on cross-site POSTs; refuse mismatches.
    const origin = req.headers.get("origin");
    let sameSite = true;
    try {
      sameSite = !origin || new URL(origin).host === req.headers.get("host");
    } catch {
      sameSite = false;
    }
    if (!sameSite) throw new HttpError(403, "Cross-site request blocked");
    if (!req.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Send JSON");
    const viewer = await getViewer();
    if (!viewer) throw new HttpError(401, "Sign in to take part");
    const body = await req.json().catch(() => null);
    const result = await runCommand(await getDb(), viewer, id, body);
    return Response.json({ ok: true, result: result ?? null });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ ok: false, error: e.message }, { status: e.status });
    console.error("[commands]", e);
    return Response.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
