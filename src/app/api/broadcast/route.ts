import type { NextRequest } from "next/server";
import { z } from "zod";
import { auditGlobal, getViewer } from "@/lib/auth";
import { globalChannel, publish } from "@/lib/live";
import { vet } from "@/lib/moderation";
import { take } from "@/lib/ratelimit";

const Body = z.object({
  title: z.string().trim().min(2).max(60),
  message: z.string().trim().min(2).max(180),
  href: z.string().trim().regex(/^\/(?![\/\\])/, "Links must be pages on this site").max(200).optional(),
});

/** Admin spotlight broadcast: takes over every connected screen for a moment. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== req.headers.get("host")) return Response.json({ ok: false, error: "Cross-site request blocked" }, { status: 403 });
  } catch {
    return Response.json({ ok: false, error: "Bad origin" }, { status: 403 });
  }
  const v = await getViewer();
  if (!v || v.role !== "admin") return Response.json({ ok: false, error: "Admins only" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  if (!(await take(`broadcast:${v.id}`, 2, 1 / 60)).ok) return Response.json({ ok: false, error: "One broadcast a minute keeps it special." }, { status: 429 });
  const t = vet(parsed.data.title, { max: 60 });
  const m = vet(parsed.data.message, { max: 180 });
  if (!t.ok || !m.ok) return Response.json({ ok: false, error: "Message didn't pass moderation" }, { status: 400 });
  const payload = { title: t.body, message: m.body, href: parsed.data.href ?? null, from: v.name, houseColor: v.house?.color ?? "#ffa928", at: Date.now() };
  await publish(globalChannel, "broadcast", payload);
  await auditGlobal(v.id, "admin.broadcast", `${t.body}: ${m.body}`);
  return Response.json({ ok: true });
}
