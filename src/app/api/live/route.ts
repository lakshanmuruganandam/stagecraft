import type { NextRequest } from "next/server";
import { getViewer, canManageEvent } from "@/lib/auth";
import { adminChannel, latestSeq, publicChannel, readSince, userChannel, waitForChange, type Channel } from "@/lib/live";
import { getEventRow } from "@/server/queries";

export const maxDuration = 60;

// Connections per event on this instance, for the "watching now" badge.
const g = globalThis as unknown as { __scPresence?: Map<string, number> };
const presence = (g.__scPresence ??= new Map());

/**
 * Server-Sent Events stream for one event. Tails the change log from the
 * client's cursor. Ends itself before serverless limits; EventSource
 * reconnects with Last-Event-ID and resumes exactly where it left off.
 */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("event");
  const event = eventId ? await getEventRow(eventId) : null;
  if (!event) return new Response("Unknown event", { status: 404 });

  const viewer = await getViewer();
  const channels: Channel[] = [publicChannel(event.id)];
  if (canManageEvent(viewer, event)) channels.push(adminChannel(event.id));
  if (viewer) channels.push(userChannel(viewer.id));

  const resume = req.headers.get("last-event-id") ?? req.nextUrl.searchParams.get("cursor");
  let cursor = resume && /^\d+$/.test(resume) ? Number(resume) : await latestSeq();

  const signal = req.signal;
  const encoder = new TextEncoder();
  const lifetime = process.env.VERCEL ? 50_000 : 10 * 60_000;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* client went away */
        }
      };
      presence.set(event.id, (presence.get(event.id) ?? 0) + 1);
      const started = Date.now();
      let lastBeat = 0;
      send(`retry: 1500\n\n`);
      try {
        while (!signal.aborted && Date.now() - started < lifetime) {
          const batch = await readSince(channels, cursor);
          for (const m of batch) {
            send(`id: ${m.seq}\ndata: ${JSON.stringify({ type: m.type, payload: m.payload })}\n\n`);
            cursor = m.seq;
          }
          if (batch.length === 200) continue; // catching up after a reconnect
          if (Date.now() - lastBeat > 10_000) {
            lastBeat = Date.now();
            send(`data: ${JSON.stringify({ type: "presence", payload: { count: presence.get(event.id) ?? 1 } })}\n\n`);
          }
          await waitForChange(channels, 1000, signal);
        }
      } finally {
        presence.set(event.id, Math.max(0, (presence.get(event.id) ?? 1) - 1));
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
