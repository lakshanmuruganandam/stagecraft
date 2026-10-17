import "server-only";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

export const PAGE = 25;

export type UserFilters = {
  q?: string;
  house?: string;
  role?: "member" | "organizer" | "admin";
  status?: "active" | "suspended" | "muted";
  limit: number;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseUserFilters(sp: Record<string, string | string[] | undefined>): UserFilters {
  const role = one(sp.role);
  const status = one(sp.status);
  const limit = Number(one(sp.limit) ?? PAGE);
  return {
    q: one(sp.q)?.slice(0, 80),
    house: one(sp.house),
    role: role === "member" || role === "organizer" || role === "admin" ? role : undefined,
    status: status === "active" || status === "suspended" || status === "muted" ? status : undefined,
    limit: Number.isFinite(limit) ? Math.min(500, Math.max(PAGE, Math.floor(limit))) : PAGE,
  };
}

/** Current time for queries; kept out of render functions on purpose. */
export const now = () => Date.now();

export async function listUsers(f: UserFilters) {
  const db = await getDb();
  const t = now();
  const where: SQL[] = [];
  if (f.q) {
    const pat = `%${f.q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    where.push(or(sql`${s.users.name} like ${pat} escape '\\'`, sql`${s.users.email} like ${pat} escape '\\'`)!);
  }
  if (f.house === "none") where.push(isNull(s.users.houseId));
  else if (f.house) where.push(eq(s.users.houseId, f.house));
  if (f.role) where.push(eq(s.users.role, f.role));
  if (f.status === "suspended") where.push(isNotNull(s.users.suspendedAt));
  if (f.status === "muted") where.push(and(isNull(s.users.suspendedAt), gt(s.users.mutedUntil, t))!);
  if (f.status === "active") where.push(and(isNull(s.users.suspendedAt), or(isNull(s.users.mutedUntil), sql`${s.users.mutedUntil} <= ${t}`))!);
  const cond = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ u: s.users, house: { name: s.houses.name, color: s.houses.color } })
      .from(s.users)
      .leftJoin(s.houses, eq(s.houses.id, s.users.houseId))
      .where(cond)
      // Admins and organizers first, then most recently active.
      .orderBy(sql`case ${s.users.role} when 'admin' then 0 when 'organizer' then 1 else 2 end`, desc(sql`coalesce(${s.users.lastLoginAt}, 0)`), asc(s.users.name))
      .limit(f.limit + 1),
    db.select({ total: sql<number>`count(*)` }).from(s.users).where(cond),
  ]);
  const page = rows.slice(0, f.limit);
  const sessions = page.length ? await activeSessionCounts(page.map((r) => r.u.id)) : new Map<string, number>();
  return {
    total,
    hasMore: rows.length > f.limit,
    users: page.map((r) => ({ ...r.u, house: r.house?.name ? r.house : null, activeSessions: sessions.get(r.u.id) ?? 0 })),
  };
}

export async function activeSessionCounts(userIds: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ userId: s.sessions.userId, n: sql<number>`count(*)` })
    .from(s.sessions)
    .where(and(inArray(s.sessions.userId, userIds), isNull(s.sessions.revokedAt), gt(s.sessions.expiresAt, now())))
    .groupBy(s.sessions.userId);
  return new Map(rows.map((r) => [r.userId, r.n]));
}

export async function getUserDetail(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ u: s.users, house: s.houses })
    .from(s.users)
    .leftJoin(s.houses, eq(s.houses.id, s.users.houseId))
    .where(eq(s.users.id, id));
  if (!row) return null;
  const [sessions, certs, audit] = await Promise.all([
    db.select().from(s.sessions).where(eq(s.sessions.userId, id)).orderBy(desc(s.sessions.lastSeenAt)).limit(50),
    db
      .select({ id: s.certificates.id, achievement: s.certificates.achievement, kind: s.certificates.kind, issuedAt: s.certificates.issuedAt, revokedAt: s.certificates.revokedAt, eventTitle: s.events.title })
      .from(s.certificates)
      .innerJoin(s.events, eq(s.events.id, s.certificates.eventId))
      .where(eq(s.certificates.userId, id))
      .orderBy(desc(s.certificates.issuedAt)),
    // Audit rows reference users by id in their detail, or as the actor.
    db
      .select({ id: s.auditLog.id, action: s.auditLog.action, detail: s.auditLog.detail, createdAt: s.auditLog.createdAt, eventId: s.auditLog.eventId, actorId: s.auditLog.actorId, actor: s.users.name })
      .from(s.auditLog)
      .leftJoin(s.users, eq(s.users.id, s.auditLog.actorId))
      .where(or(like(s.auditLog.detail, `%${id}%`), eq(s.auditLog.actorId, id)))
      .orderBy(desc(s.auditLog.createdAt))
      .limit(60),
  ]);
  return { user: row.u, house: row.house, sessions, certs, audit };
}

export async function securityStats() {
  const db = await getDb();
  const t = now();
  const [[a], [b]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(s.sessions)
      .where(and(isNull(s.sessions.revokedAt), gt(s.sessions.lastSeenAt, t - 86_400_000), gt(s.sessions.expiresAt, t))),
    db.select({ n: sql<number>`count(*)` }).from(s.users).where(isNotNull(s.users.suspendedAt)),
  ]);
  return { activeSessions24h: a.n, suspended: b.n };
}
