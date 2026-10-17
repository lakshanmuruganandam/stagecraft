import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type DB } from "@/db";
import * as s from "@/db/schema";
import { canManageEvent, type Viewer } from "@/lib/auth";
import { latestSeq } from "@/lib/live";
import type { CertificateDTO, HouseDTO, MyState, Snapshot } from "@/lib/types";
import { bracketDTOs, contestDTOs, eventDTO, pollDTOs, questionsOf, recentChat, segmentsOf } from "./views";

export async function listHouses(db?: DB): Promise<HouseDTO[]> {
  db ??= await getDb();
  return db.select({ id: s.houses.id, slug: s.houses.slug, name: s.houses.name, color: s.houses.color }).from(s.houses).orderBy(asc(s.houses.name));
}

export async function listEvents() {
  const db = await getDb();
  const rows = await db.select().from(s.events).where(sql`${s.events.status} != 'draft'`).orderBy(asc(s.events.startsAt));
  return rows.map(eventDTO);
}

export async function listAllEventsForAdmin(viewer: Viewer) {
  const db = await getDb();
  const rows = await db.select().from(s.events).orderBy(desc(s.events.startsAt));
  return rows.filter((e) => canManageEvent(viewer, e)).map((e) => ({ ...eventDTO(e), createdBy: e.createdBy }));
}

export async function getEventRow(slugOrId: string) {
  const db = await getDb();
  return (
    (await db.query.events.findFirst({ where: eq(s.events.slug, slugOrId) })) ??
    (await db.query.events.findFirst({ where: eq(s.events.id, slugOrId) })) ??
    null
  );
}

async function myState(db: DB, eventId: string, v: Viewer): Promise<MyState> {
  const [qv, pv, pr, av] = await Promise.all([
    db
      .select({ id: s.questionVotes.questionId })
      .from(s.questionVotes)
      .innerJoin(s.questions, eq(s.questions.id, s.questionVotes.questionId))
      .where(and(eq(s.questions.eventId, eventId), eq(s.questionVotes.userId, v.id))),
    db
      .select({ pollId: s.pollVotes.pollId, option: s.pollVotes.option })
      .from(s.pollVotes)
      .innerJoin(s.polls, eq(s.polls.id, s.pollVotes.pollId))
      .where(and(eq(s.polls.eventId, eventId), eq(s.pollVotes.userId, v.id))),
    db
      .select({ matchId: s.predictions.matchId, pickId: s.predictions.pickId })
      .from(s.predictions)
      .innerJoin(s.matches, eq(s.matches.id, s.predictions.matchId))
      .innerJoin(s.brackets, eq(s.brackets.id, s.matches.bracketId))
      .where(and(eq(s.brackets.eventId, eventId), eq(s.predictions.userId, v.id))),
    db
      .select({ actId: s.actVotes.actId })
      .from(s.actVotes)
      .innerJoin(s.contests, eq(s.contests.id, s.actVotes.contestId))
      .where(and(eq(s.contests.eventId, eventId), eq(s.actVotes.userId, v.id))),
  ]);
  return {
    userId: v.id,
    name: v.name,
    houseId: v.houseId,
    role: v.role,
    questionVotes: qv.map((x) => x.id),
    pollVotes: Object.fromEntries(pv.map((x) => [x.pollId, x.option])),
    predictions: Object.fromEntries(pr.map((x) => [x.matchId, x.pickId])),
    actVotes: av.map((x) => x.actId),
  };
}

/**
 * Everything a live page needs in one round trip. The cursor is read
 * *before* the data, so any change racing with this query is replayed
 * by the stream — duplicates are harmless because the client upserts.
 */
export async function getSnapshot(eventId: string, viewer: Viewer | null): Promise<Snapshot | null> {
  const db = await getDb();
  const cursor = await latestSeq();
  const row = await db.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!row) return null;
  const canManage = canManageEvent(viewer, row);
  const audience = canManage ? "manager" : "public";
  const [segments, chat, questions, polls, brackets, contests, houses, me] = await Promise.all([
    segmentsOf(db, eventId),
    recentChat(db, eventId),
    questionsOf(db, eventId, audience, viewer?.id),
    pollDTOs(db, { eventId }, audience),
    bracketDTOs(db, { eventId }),
    contestDTOs(db, { eventId }, audience),
    listHouses(db),
    viewer ? myState(db, eventId, viewer) : Promise.resolve(null),
  ]);
  return { event: eventDTO(row), segments, chat, questions, polls, brackets, contests, houses, me, canManage, cursor };
}

export async function leaderboard() {
  const db = await getDb();
  const rows = await db
    .select({
      id: s.houses.id,
      slug: s.houses.slug,
      name: s.houses.name,
      color: s.houses.color,
      points: sql<number>`coalesce(sum(${s.housePoints.points}), 0)`,
    })
    .from(s.houses)
    .leftJoin(s.housePoints, eq(s.housePoints.houseId, s.houses.id))
    .groupBy(s.houses.id)
    .orderBy(desc(sql`coalesce(sum(${s.housePoints.points}), 0)`));
  return rows;
}

export async function recentAwards(limit = 8) {
  const db = await getDb();
  return db
    .select({ id: s.housePoints.id, points: s.housePoints.points, reason: s.housePoints.reason, createdAt: s.housePoints.createdAt, house: s.houses.name, color: s.houses.color })
    .from(s.housePoints)
    .innerJoin(s.houses, eq(s.houses.id, s.housePoints.houseId))
    .where(sql`${s.housePoints.eventId} is not null`)
    .orderBy(desc(s.housePoints.createdAt))
    .limit(limit);
}

const certSelect = {
  id: s.certificates.id,
  eventId: s.certificates.eventId,
  eventTitle: s.events.title,
  eventSlug: s.events.slug,
  recipientName: s.certificates.recipientName,
  houseName: s.houses.name,
  kind: s.certificates.kind,
  achievement: s.certificates.achievement,
  issuedAt: s.certificates.issuedAt,
  revokedAt: s.certificates.revokedAt,
};

export async function certificatesFor(where: { userId?: string; eventId?: string }): Promise<CertificateDTO[]> {
  const db = await getDb();
  return db
    .select(certSelect)
    .from(s.certificates)
    .innerJoin(s.events, eq(s.events.id, s.certificates.eventId))
    .leftJoin(s.houses, eq(s.houses.id, s.certificates.houseId))
    .where(where.userId ? eq(s.certificates.userId, where.userId) : eq(s.certificates.eventId, where.eventId!))
    .orderBy(desc(s.certificates.issuedAt));
}

export async function certificateById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ ...certSelect, payload: s.certificates.payload, signature: s.certificates.signature, revokeReason: s.certificates.revokeReason })
    .from(s.certificates)
    .innerJoin(s.events, eq(s.events.id, s.certificates.eventId))
    .leftJoin(s.houses, eq(s.houses.id, s.certificates.houseId))
    .where(eq(s.certificates.id, id.toUpperCase()));
  return row ?? null;
}

export async function auditFor(eventId: string, limit = 50) {
  const db = await getDb();
  return db
    .select({ id: s.auditLog.id, action: s.auditLog.action, detail: s.auditLog.detail, createdAt: s.auditLog.createdAt, actor: s.users.name })
    .from(s.auditLog)
    .leftJoin(s.users, eq(s.users.id, s.auditLog.actorId))
    .where(eq(s.auditLog.eventId, eventId))
    .orderBy(desc(s.auditLog.createdAt))
    .limit(limit);
}

/** Engagement stats for the organizer dashboard and CSV export. */
export async function engagement(eventId: string) {
  const db = await getDb();
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [chat, qs, qVotes, pVotes, aVotes, preds, people] = await Promise.all([
    one(db.select({ n: sql<number>`count(*)` }).from(s.chatMessages).where(eq(s.chatMessages.eventId, eventId))),
    one(db.select({ n: sql<number>`count(*)` }).from(s.questions).where(eq(s.questions.eventId, eventId))),
    one(db.select({ n: sql<number>`count(*)` }).from(s.questionVotes).innerJoin(s.questions, eq(s.questions.id, s.questionVotes.questionId)).where(eq(s.questions.eventId, eventId))),
    one(db.select({ n: sql<number>`count(*)` }).from(s.pollVotes).innerJoin(s.polls, eq(s.polls.id, s.pollVotes.pollId)).where(eq(s.polls.eventId, eventId))),
    one(db.select({ n: sql<number>`count(*)` }).from(s.actVotes).innerJoin(s.contests, eq(s.contests.id, s.actVotes.contestId)).where(eq(s.contests.eventId, eventId))),
    one(db.select({ n: sql<number>`count(*)` }).from(s.predictions).innerJoin(s.matches, eq(s.matches.id, s.predictions.matchId)).innerJoin(s.brackets, eq(s.brackets.id, s.matches.bracketId)).where(eq(s.brackets.eventId, eventId))),
    participants(db, eventId).then((p) => p.length),
  ]);
  return { chat, questions: qs, questionVotes: qVotes, pollVotes: pVotes, actVotes: aVotes, predictions: preds, participants: people };
}

/** Anyone who registered or meaningfully interacted with the event. */
export async function participants(db: DB, eventId: string) {
  const res = await db.all<{ user_id: string; actions: number }>(sql`
    select user_id, count(*) as actions from (
      select user_id from ${s.registrations} where event_id = ${eventId}
      union all select user_id from ${s.chatMessages} where event_id = ${eventId}
      union all select user_id from ${s.questions} where event_id = ${eventId}
      union all select v.user_id from ${s.questionVotes} v join ${s.questions} q on q.id = v.question_id where q.event_id = ${eventId}
      union all select v.user_id from ${s.pollVotes} v join ${s.polls} p on p.id = v.poll_id where p.event_id = ${eventId}
      union all select v.user_id from ${s.actVotes} v join ${s.contests} c on c.id = v.contest_id where c.event_id = ${eventId}
      union all select v.user_id from ${s.predictions} v join ${s.matches} m on m.id = v.match_id join ${s.brackets} b on b.id = m.bracket_id where b.event_id = ${eventId}
    ) group by user_id
  `);
  const ids = res.map((r) => r.user_id);
  if (!ids.length) return [];
  const users = await db.select().from(s.users).where(inArray(s.users.id, ids));
  return users.map((u) => ({ ...u, actions: res.find((r) => r.user_id === u.id)!.actions }));
}

/** Headline numbers for the home page. */
export async function platformStats() {
  const db = await getDb();
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [certs, members, chats, votes, questions, live] = await Promise.all([
    n(db.select({ n: sql<number>`count(*)` }).from(s.certificates)),
    n(db.select({ n: sql<number>`count(*)` }).from(s.users)),
    n(db.select({ n: sql<number>`count(*)` }).from(s.chatMessages)),
    n(db.select({ n: sql<number>`(select count(*) from poll_votes) + (select count(*) from question_votes) + (select count(*) from act_votes) + (select count(*) from predictions)` }).from(s.houses).limit(1)),
    n(db.select({ n: sql<number>`count(*)` }).from(s.questions)),
    n(db.select({ n: sql<number>`count(*)` }).from(s.events).where(eq(s.events.status, "live"))),
  ]);
  return { certs, members, interactions: chats + votes + questions, live };
}

/** The most exciting open poll right now, for the hero's live preview card. */
export async function featuredPoll() {
  const db = await getDb();
  const [row] = await db
    .select({ id: s.polls.id, eventId: s.polls.eventId, slug: s.events.slug, title: s.events.title })
    .from(s.polls)
    .innerJoin(s.events, eq(s.events.id, s.polls.eventId))
    .where(and(eq(s.polls.status, "open"), eq(s.polls.liveResults, true), eq(s.events.status, "live")))
    .orderBy(desc(sql`(select count(*) from poll_votes v where v.poll_id = ${s.polls.id})`))
    .limit(1);
  if (!row) return null;
  const { pollDTOs } = await import("./views");
  const [poll] = await pollDTOs(db, { pollId: row.id }, "public");
  return poll ? { poll, event: { slug: row.slug, title: row.title } } : null;
}

/** Real data for the home hero's 3D scene: a live question, match and credential. */
export async function heroScene() {
  const db = await getDb();
  const [poll, [question], [match], [cert]] = await Promise.all([
    featuredPoll(),
    db
      .select({ body: s.questions.body, votes: s.questions.votes, slug: s.events.slug })
      .from(s.questions)
      .innerJoin(s.events, eq(s.events.id, s.questions.eventId))
      .where(and(eq(s.questions.status, "live"), eq(s.events.status, "live")))
      .orderBy(desc(s.questions.votes))
      .limit(1),
    db
      .select({ m: s.matches, slug: s.events.slug, game: s.brackets.game })
      .from(s.matches)
      .innerJoin(s.brackets, eq(s.brackets.id, s.matches.bracketId))
      .innerJoin(s.events, eq(s.events.id, s.brackets.eventId))
      .where(eq(s.matches.status, "live"))
      .limit(1),
    db
      .select({ id: s.certificates.id, name: s.certificates.recipientName, achievement: s.certificates.achievement })
      .from(s.certificates)
      .where(and(eq(s.certificates.kind, "winner"), sql`${s.certificates.revokedAt} is null`))
      .orderBy(desc(s.certificates.issuedAt))
      .limit(1),
  ]);
  let teams: { name: string; color: string }[] = [];
  if (match?.m.aId && match.m.bId) {
    const rows = await db
      .select({ id: s.entrants.id, name: s.entrants.name, color: s.houses.color })
      .from(s.entrants)
      .leftJoin(s.houses, eq(s.houses.id, s.entrants.houseId))
      .where(inArray(s.entrants.id, [match.m.aId, match.m.bId]));
    teams = [match.m.aId, match.m.bId].map((id) => {
      const r = rows.find((x) => x.id === id);
      return { name: r?.name ?? "TBD", color: r?.color ?? "#999" };
    });
  }
  return {
    poll,
    question: question ?? null,
    match: match && teams.length === 2 ? { slug: match.slug, game: match.game, teams, scoreA: match.m.scoreA ?? 0, scoreB: match.m.scoreB ?? 0 } : null,
    cert: cert ?? null,
  };
}
