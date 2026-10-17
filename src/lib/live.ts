import "server-only";
import { EventEmitter } from "node:events";
import { and, asc, desc, gt, inArray, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Realtime fan-out.
 *
 *   mutation ──► INSERT INTO changes (append-only log) ──► local emitter
 *                                   ▲                         │ wakes
 *   SSE stream ── tails by seq ─────┘◄────────────────────────┘
 *
 * The log is the source of truth: a subscriber on any instance catches up
 * by polling `seq > cursor`, and a reconnecting browser resumes from its
 * Last-Event-ID, so no message is lost across deploys or cold starts. The
 * in-process emitter only shortcuts the poll when writer and reader share
 * an instance (always true in dev / single-node deploys).
 */

export type Channel = `e:${string}` | `a:${string}` | `u:${string}`;
export const publicChannel = (eventId: string): Channel => `e:${eventId}`;
export const adminChannel = (eventId: string): Channel => `a:${eventId}`;
export const userChannel = (userId: string): Channel => `u:${userId}`;

export type LiveMessage = { seq: number; channel: string; type: string; payload: unknown };

const g = globalThis as unknown as { __scBus?: EventEmitter };
const bus = (g.__scBus ??= new EventEmitter().setMaxListeners(0));

export async function publish(channel: Channel | Channel[], type: string, payload: unknown) {
  const db = await getDb();
  const list = Array.isArray(channel) ? channel : [channel];
  const body = JSON.stringify(payload);
  await db.insert(schema.changes).values(list.map((c) => ({ channel: c, type, payload: body })));
  for (const c of list) bus.emit("change", c);
}

export async function readSince(channels: Channel[], cursor: number, limit = 200): Promise<LiveMessage[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.changes)
    .where(and(inArray(schema.changes.channel, channels), gt(schema.changes.seq, cursor)))
    .orderBy(asc(schema.changes.seq))
    .limit(limit);
  return rows.map((r) => ({ seq: r.seq, channel: r.channel, type: r.type, payload: JSON.parse(r.payload) }));
}

export async function latestSeq(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ seq: schema.changes.seq }).from(schema.changes).orderBy(desc(schema.changes.seq)).limit(1);
  return row?.seq ?? 0;
}

/** Resolves when any of the channels changes locally, or after `ms`. */
export function waitForChange(channels: Channel[], ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const set = new Set<string>(channels);
    const done = () => {
      clearTimeout(timer);
      bus.off("change", onChange);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const onChange = (c: string) => set.has(c) && done();
    const timer = setTimeout(done, ms);
    bus.on("change", onChange);
    signal.addEventListener("abort", done);
  });
}

/** Housekeeping: the log only needs to outlive reconnect windows. */
export async function pruneChanges(olderThanMs = 1000 * 60 * 60 * 24) {
  const db = await getDb();
  await db.delete(schema.changes).where(lt(schema.changes.createdAt, Date.now() - olderThanMs));
}
