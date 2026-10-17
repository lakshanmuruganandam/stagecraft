import "server-only";
import { and, desc, eq, gte, like, lt, sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

export const AUDIT_PAGE = 50;
export const PREFIXES = ["auth", "user", "event", "poll", "qa", "chat", "bracket", "match", "contest", "cert", "audit"] as const;

export type AuditFilters = {
  prefix?: (typeof PREFIXES)[number];
  actor?: string;
  event?: string;
  from?: string; // YYYY-MM-DD, IST
  to?: string; // YYYY-MM-DD, IST, inclusive
  limit: number;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export function parseAuditFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams, maxLimit = 1000): AuditFilters {
  const get = (k: string) => (sp instanceof URLSearchParams ? (sp.get(k) ?? undefined) : one(sp[k]));
  const prefix = get("prefix");
  const limit = Number(get("limit") ?? AUDIT_PAGE);
  return {
    prefix: (PREFIXES as readonly string[]).includes(prefix ?? "") ? (prefix as AuditFilters["prefix"]) : undefined,
    actor: get("actor"),
    event: get("event"),
    from: isDate(get("from")),
    to: isDate(get("to")),
    limit: Number.isFinite(limit) ? Math.min(maxLimit, Math.max(1, Math.floor(limit))) : AUDIT_PAGE,
  };
}

/** IST calendar day → epoch ms at 00:00 IST. */
const istDay = (d: string) => Date.parse(`${d}T00:00:00+05:30`);

function where(f: AuditFilters) {
  const w: SQL[] = [];
  if (f.prefix) w.push(like(s.auditLog.action, `${f.prefix}.%`));
  if (f.actor === "system") w.push(sql`${s.auditLog.actorId} is null`);
  else if (f.actor) w.push(eq(s.auditLog.actorId, f.actor));
  if (f.event === "none") w.push(sql`${s.auditLog.eventId} is null`);
  else if (f.event) w.push(eq(s.auditLog.eventId, f.event));
  if (f.from) w.push(gte(s.auditLog.createdAt, istDay(f.from)));
  if (f.to) w.push(lt(s.auditLog.createdAt, istDay(f.to) + 86_400_000));
  return w.length ? and(...w) : undefined;
}

export async function listAudit(f: AuditFilters) {
  const db = await getDb();
  const cond = where(f);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: s.auditLog.id,
        action: s.auditLog.action,
        detail: s.auditLog.detail,
        createdAt: s.auditLog.createdAt,
        actorId: s.auditLog.actorId,
        actor: s.users.name,
        actorEmail: s.users.email,
        eventId: s.auditLog.eventId,
        eventTitle: s.events.title,
      })
      .from(s.auditLog)
      .leftJoin(s.users, eq(s.users.id, s.auditLog.actorId))
      .leftJoin(s.events, eq(s.events.id, s.auditLog.eventId))
      .where(cond)
      .orderBy(desc(s.auditLog.createdAt))
      .limit(f.limit + 1),
    db.select({ total: sql<number>`count(*)` }).from(s.auditLog).where(cond),
  ]);
  return { rows: rows.slice(0, f.limit), total, hasMore: rows.length > f.limit };
}

/** Options for the filter dropdowns: only actors and events that appear in the log. */
export async function auditFacets() {
  const db = await getDb();
  const [actors, events] = await Promise.all([
    db
      .selectDistinct({ id: s.users.id, name: s.users.name })
      .from(s.auditLog)
      .innerJoin(s.users, eq(s.users.id, s.auditLog.actorId))
      .orderBy(s.users.name),
    db
      .selectDistinct({ id: s.events.id, title: s.events.title })
      .from(s.auditLog)
      .innerJoin(s.events, eq(s.events.id, s.auditLog.eventId))
      .orderBy(s.events.title),
  ]);
  return { actors, events };
}

export function auditQuery(f: AuditFilters, patch: Partial<AuditFilters> = {}) {
  const m = { ...f, ...patch };
  const p = new URLSearchParams();
  for (const k of ["prefix", "actor", "event", "from", "to"] as const) if (m[k]) p.set(k, m[k]!);
  if (m.limit !== AUDIT_PAGE) p.set("limit", String(m.limit));
  const q = p.toString();
  return q ? `?${q}` : "";
}
