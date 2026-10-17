import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { newId } from "./ids";
import { hashToken, newSessionToken, SESSION_COOKIE, SESSION_TOUCH_MS, SESSION_TTL_MS } from "./session";

export type Viewer = typeof schema.users.$inferSelect & {
  house: typeof schema.houses.$inferSelect | null;
  sessionId: string;
};

/**
 * The signed-in user for this request, or null. Resolves the opaque
 * cookie token against the sessions table, so revocation, expiry and
 * suspension take effect on the very next request. Deduped per render.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ s: schema.sessions, u: schema.users, h: schema.houses })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .leftJoin(schema.houses, eq(schema.houses.id, schema.users.houseId))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), isNull(schema.sessions.revokedAt)));
  const now = Date.now();
  if (!row || row.s.expiresAt < now || row.u.suspendedAt) return null;
  if (now - row.s.lastSeenAt > SESSION_TOUCH_MS) {
    await db.update(schema.sessions).set({ lastSeenAt: now, expiresAt: now + SESSION_TTL_MS }).where(eq(schema.sessions.id, row.s.id));
  }
  return { ...row.u, house: row.h, sessionId: row.s.id };
});

/** Creates a session row and sets the cookie. Server Actions / Route Handlers only. */
export async function startSession(userId: string) {
  const db = await getDb();
  const h = await headers();
  const token = newSessionToken();
  const now = Date.now();
  await db.insert(schema.sessions).values({
    id: newId(),
    tokenHash: hashToken(token),
    userId,
    userAgent: h.get("user-agent")?.slice(0, 200) ?? null,
    ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null,
    lastSeenAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  await db.update(schema.users).set({ lastLoginAt: now }).where(eq(schema.users.id, userId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.update(schema.sessions).set({ revokedAt: Date.now() }).where(eq(schema.sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere (optionally keeping one session alive). */
export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  const db = await getDb();
  await db
    .update(schema.sessions)
    .set({ revokedAt: Date.now() })
    .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt), exceptSessionId ? ne(schema.sessions.id, exceptSessionId) : undefined));
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

export async function requireAdmin(): Promise<Viewer> {
  const v = await requireViewer();
  if (v.role !== "admin") throw new HttpError(403, "Admins only");
  return v;
}

/**
 * Organizers can run events hosted by their own house; admins run all.
 * This is the single place event-level authorization is decided.
 */
export function canManageEvent(v: Pick<Viewer, "id" | "role" | "houseId"> | null, event: { hostHouseIds: string[]; createdBy: string | null }) {
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

/** Writes an audit row not tied to an event (user admin, auth events). */
export async function auditGlobal(actorId: string | null, action: string, detail?: string) {
  const db = await getDb();
  await db.insert(schema.auditLog).values({ id: newId(), actorId, eventId: null, action, detail });
}
