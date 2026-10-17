import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decodeSession, encodeSession, SESSION_COOKIE } from "./session";

export type Viewer = typeof schema.users.$inferSelect & {
  house: typeof schema.houses.$inferSelect | null;
};

/** The signed-in user for this request, or null. Deduped per render. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const uid = await decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const db = await getDb();
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, uid) });
  if (!row) return null;
  const house = row.houseId
    ? ((await db.query.houses.findFirst({ where: eq(schema.houses.id, row.houseId) })) ?? null)
    : null;
  return { ...row, house };
});

export async function startSession(uid: string) {
  (await cookies()).set(SESSION_COOKIE, await encodeSession(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new HttpError(401, "Sign in to take part");
  return v;
}

/**
 * Organizers can run events hosted by their own house; admins run all.
 * This is the single place event-level authorization is decided.
 */
export function canManageEvent(v: Viewer | null, event: { hostHouseIds: string[]; createdBy: string | null }) {
  if (!v) return false;
  if (v.role === "admin") return true;
  if (v.role !== "organizer") return false;
  return event.createdBy === v.id || (!!v.houseId && event.hostHouseIds.includes(v.houseId));
}

export async function requireEventManager(eventId: string) {
  const v = await requireViewer();
  const db = await getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event) throw new HttpError(404, "Event not found");
  if (!canManageEvent(v, event)) throw new HttpError(403, "You can't manage this event");
  return { viewer: v, event, db };
}
