import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { EMPTY_ACTIVITY, summarize, type Activity } from "@/lib/achievements";

/**
 * Activity aggregation for House Odyssey. Everything is derived from the
 * live-event tables, so badges and XP can never disagree with what
 * actually happened at events.
 */

type Row = { user_id: string } & Record<keyof Activity, number>;

// One interaction = (user, event). Used for attendance, tracks and cross-house.
const INTERACTIONS = sql`
  select user_id, event_id from ${s.registrations}
  union all select user_id, event_id from ${s.chatMessages}
  union all select user_id, event_id from ${s.questions}
  union all select v.user_id, q.event_id from ${s.questionVotes} v join ${s.questions} q on q.id = v.question_id
  union all select v.user_id, p.event_id from ${s.pollVotes} v join ${s.polls} p on p.id = v.poll_id
  union all select v.user_id, c.event_id from ${s.actVotes} v join ${s.contests} c on c.id = v.contest_id
  union all select v.user_id, b.event_id from ${s.predictions} v join ${s.matches} m on m.id = v.match_id join ${s.brackets} b on b.id = m.bracket_id
`;

async function activityRows(userId?: string): Promise<Row[]> {
  const db = await getDb();
  const only = userId ? sql`where u.id = ${userId}` : sql``;
  return db.all<Row>(sql`
    with i as (${INTERACTIONS})
    select
      u.id as user_id,
      (select count(*) from ${s.questions} q where q.user_id = u.id) as questionsAsked,
      (select count(*) from ${s.questionVotes} v where v.user_id = u.id) as upvotesGiven,
      (select count(*) from ${s.questionVotes} v join ${s.questions} q on q.id = v.question_id where q.user_id = u.id and v.user_id != u.id) as upvotesReceived,
      (select count(*) from ${s.pollVotes} v where v.user_id = u.id) as pollsVoted,
      (select count(*) from ${s.predictions} p where p.user_id = u.id) as predictionsMade,
      (select count(*) from ${s.predictions} p join ${s.matches} m on m.id = p.match_id where p.user_id = u.id and m.winner_id = p.pick_id) as correctPredictions,
      (select count(*) from ${s.actVotes} v where v.user_id = u.id) as actsVoted,
      (select count(*) from ${s.chatMessages} c where c.user_id = u.id and c.hidden = 0) as chatsSent,
      (select count(distinct i.event_id) from i where i.user_id = u.id) as eventsAttended,
      (select count(*) from ${s.certificates} c where c.user_id = u.id and c.revoked_at is null and c.kind in ('winner', 'runner-up', 'third')) as podiums,
      (select count(*) from ${s.certificates} c where c.user_id = u.id and c.revoked_at is null) as certificates,
      (select count(distinct i.event_id) from i join ${s.events} e on e.id = i.event_id
         where i.user_id = u.id and u.house_id is not null
           and not exists (select 1 from json_each(e.host_house_ids) j where j.value = u.house_id)) as crossHouseEvents
    from ${s.users} u
    ${only}
  `);
}

const toActivity = (r: Row | undefined): Activity =>
  r ? (Object.fromEntries(Object.keys(EMPTY_ACTIVITY).map((k) => [k, Number(r[k as keyof Activity]) || 0])) as Activity) : EMPTY_ACTIVITY;

export async function activityFor(userId: string): Promise<Activity> {
  const [row] = await activityRows(userId);
  return toActivity(row);
}

export async function odysseyFor(userId: string) {
  return summarize(await activityFor(userId));
}

export type MemberRank = { id: string; name: string; houseId: string | null; xp: number; level: number; title: string; badges: number };

/** Top members by XP, optionally within one house. */
export async function xpLeaderboard(limit = 10, houseId?: string): Promise<MemberRank[]> {
  const db = await getDb();
  const [rows, users] = await Promise.all([activityRows(), db.select({ id: s.users.id, name: s.users.name, houseId: s.users.houseId, suspendedAt: s.users.suspendedAt }).from(s.users)]);
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows
    .flatMap((r) => {
      const u = byId.get(r.user_id);
      // Filter before scoring: suspended members and other houses never rank.
      if (!u || u.suspendedAt || (houseId && u.houseId !== houseId)) return [];
      const o = summarize(toActivity(r));
      return [{ id: u.id, name: u.name, houseId: u.houseId, xp: o.xp, level: o.level.level, title: o.level.title, badges: o.earned }];
    })
    .filter((m) => m.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

export type Contribution = { eventId: string; slug: string; title: string; kind: s.EventKind; startsAt: number; actions: number };

/** Per-event participation for the portfolio timeline and track chart. */
export async function contributionsFor(userId: string): Promise<Contribution[]> {
  const db = await getDb();
  const rows = await db.all<{ event_id: string; slug: string; title: string; kind: s.EventKind; starts_at: number; actions: number }>(sql`
    with i as (${INTERACTIONS})
    select e.id as event_id, e.slug, e.title, e.kind, e.starts_at, count(*) as actions
    from i join ${s.events} e on e.id = i.event_id
    where i.user_id = ${userId} and e.status != 'draft'
    group by e.id
    order by e.starts_at desc
  `);
  return rows.map((r) => ({ eventId: r.event_id, slug: r.slug, title: r.title, kind: r.kind, startsAt: r.starts_at, actions: Number(r.actions) }));
}

export async function memberById(id: string) {
  const db = await getDb();
  const u = await db.query.users.findFirst({ where: eq(s.users.id, id) });
  if (!u || u.suspendedAt) return null;
  const house = u.houseId ? ((await db.query.houses.findFirst({ where: eq(s.houses.id, u.houseId) })) ?? null) : null;
  return { id: u.id, name: u.name, role: u.role, createdAt: u.createdAt, house };
}
