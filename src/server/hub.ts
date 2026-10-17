import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { eventDTO } from "./views";
import { leaderboard } from "./queries";
import type { EventDTO } from "@/lib/types";

/**
 * House Hub data: standings, a house's front page and the event radar.
 * Everything is derived from existing tables (house_points ledger,
 * events, certificates, users), so there is no extra state to keep in sync.
 */

export type HouseStanding = {
  id: string;
  slug: string;
  name: string;
  color: string;
  motto: string | null;
  points: number;
  rank: number;
  members: number;
  live: number;
};

export async function houseStandings(): Promise<HouseStanding[]> {
  const db = await getDb();
  const [board, houses, members, liveRows] = await Promise.all([
    leaderboard(),
    db.select().from(s.houses),
    db.select({ houseId: s.users.houseId, n: sql<number>`count(*)` }).from(s.users).groupBy(s.users.houseId),
    db.select({ hostHouseIds: s.events.hostHouseIds }).from(s.events).where(eq(s.events.status, "live")),
  ]);
  return board.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    color: b.color,
    motto: houses.find((h) => h.id === b.id)?.motto ?? null,
    points: Number(b.points),
    // Competition ranking: equal points share a rank.
    rank: board.findIndex((x) => Number(x.points) === Number(b.points)) + 1,
    members: members.find((m) => m.houseId === b.id)?.n ?? 0,
    live: liveRows.filter((e) => e.hostHouseIds.includes(b.id)).length,
  }));
}

export type HouseHome = {
  house: HouseStanding;
  total: number;
  history: { t: number; points: number }[];
  live: EventDTO[];
  upcoming: EventDTO[];
  past: EventDTO[];
  contributors: { id: string; name: string; podiums: number; credentials: number; score: number }[];
  awards: { id: string; points: number; reason: string; createdAt: number }[];
};

export async function houseHome(slug: string): Promise<HouseHome | null> {
  const standings = await houseStandings();
  const house = standings.find((h) => h.slug === slug);
  if (!house) return null;
  const db = await getDb();

  const [ledger, eventRows, contributors, awards] = await Promise.all([
    db
      .select({ points: s.housePoints.points, createdAt: s.housePoints.createdAt })
      .from(s.housePoints)
      .where(eq(s.housePoints.houseId, house.id))
      .orderBy(asc(s.housePoints.createdAt)),
    db.select().from(s.events).where(sql`${s.events.status} != 'draft'`).orderBy(asc(s.events.startsAt)),
    db
      .select({
        id: s.users.id,
        name: s.users.name,
        podiums: sql<number>`sum(case when ${s.certificates.kind} in ('winner','runner-up','third') then 1 else 0 end)`,
        credentials: sql<number>`count(${s.certificates.id})`,
      })
      .from(s.certificates)
      .innerJoin(s.users, eq(s.users.id, s.certificates.userId))
      .where(and(eq(s.users.houseId, house.id), sql`${s.certificates.revokedAt} is null`))
      .groupBy(s.users.id)
      .orderBy(desc(sql`sum(case when ${s.certificates.kind} in ('winner','runner-up','third') then 5 else 1 end)`))
      .limit(6),
    db
      .select({ id: s.housePoints.id, points: s.housePoints.points, reason: s.housePoints.reason, createdAt: s.housePoints.createdAt })
      .from(s.housePoints)
      .where(and(eq(s.housePoints.houseId, house.id), sql`${s.housePoints.eventId} is not null`))
      .orderBy(desc(s.housePoints.createdAt))
      .limit(8),
  ]);

  let running = 0;
  const history = ledger.map((r) => ({ t: r.createdAt, points: (running += r.points) }));
  const hosted = eventRows.filter((e) => e.hostHouseIds.includes(house.id)).map(eventDTO);

  return {
    house,
    total: running,
    history,
    live: hosted.filter((e) => e.status === "live"),
    upcoming: hosted.filter((e) => e.status === "scheduled"),
    past: hosted.filter((e) => e.status === "ended").reverse(),
    contributors: contributors.map((c) => ({ ...c, podiums: Number(c.podiums), credentials: Number(c.credentials), score: Number(c.podiums) * 5 + (Number(c.credentials) - Number(c.podiums)) })),
    awards,
  };
}

/** Public events for the radar and the ICS feed. */
export async function radarEvents(): Promise<EventDTO[]> {
  const db = await getDb();
  const rows = await db.select().from(s.events).where(sql`${s.events.status} != 'draft'`).orderBy(asc(s.events.startsAt));
  return rows.map(eventDTO);
}

/* ───────────── iCalendar (RFC 5545) ───────────── */

const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Folds a content line at 75 octets (UTF-8 safe), continuation lines start with a space. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + b > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(events: EventDTO[], origin: string, name = "StageCraft · IITM BS house events"): string {
  const stamp = icsDate(Date.now());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StageCraft//House Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(name)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    const url = `${origin}/e/${e.slug}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@stagecraft`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(e.startsAt)}`,
      `DTEND:${icsDate(e.endsAt)}`,
      `SUMMARY:${icsText(e.title)}`,
      `DESCRIPTION:${icsText(`${e.tagline ? `${e.tagline}\n\n` : ""}${e.description}\n\nJoin live: ${url}`)}`,
      `URL:${url}`,
      "LOCATION:Online · StageCraft",
      "STATUS:CONFIRMED",
      `CATEGORIES:${icsText(e.kind)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`${e.title} starts in 15 minutes`)}`,
      "TRIGGER:-PT15M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: EventDTO, origin: string) {
  const u = new URL("https://calendar.google.com/calendar/render");
  u.search = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsDate(e.startsAt)}/${icsDate(e.endsAt)}`,
    details: `${e.tagline ?? ""}\n\nJoin live: ${origin}/e/${e.slug}`,
    location: "Online · StageCraft",
  }).toString();
  return u.toString();
}
