import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import { standings } from "@/lib/contest";
import type { BMatch } from "@/lib/bracket";
import type {
  BracketDTO,
  ChatDTO,
  ContestDTO,
  EventDTO,
  PollDTO,
  QuestionDTO,
  SegmentDTO,
} from "@/lib/types";

/**
 * Row → DTO builders. Every builder takes an `audience` so the same code
 * produces the redacted public view and the full organizer view; that is
 * what keeps hidden poll results and pending questions off the wire.
 */
export type Audience = "public" | "manager";

export function eventDTO(e: typeof s.events.$inferSelect): EventDTO {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    tagline: e.tagline,
    description: e.description,
    kind: e.kind,
    status: e.status,
    streamUrl: e.streamUrl,
    hostHouseIds: e.hostHouseIds,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    hue: e.hue,
    settings: e.settings,
    currentSegmentId: e.currentSegmentId,
    stageScene: e.stageScene,
    spotlightQuestionId: e.spotlightQuestionId,
    lowerThird: e.lowerThird,
    wrappedAt: e.wrappedAt,
  };
}

export async function segmentsOf(db: DB, eventId: string): Promise<SegmentDTO[]> {
  const rows = await db.select().from(s.segments).where(eq(s.segments.eventId, eventId)).orderBy(asc(s.segments.position));
  return rows.map(({ id, title, speaker, durationMin, position }) => ({ id, title, speaker, durationMin, position }));
}

/* ── chat ── */

export async function chatDTO(db: DB, id: string): Promise<ChatDTO | null> {
  const [row] = await db
    .select({ m: s.chatMessages, u: { id: s.users.id, name: s.users.name, houseId: s.users.houseId } })
    .from(s.chatMessages)
    .innerJoin(s.users, eq(s.users.id, s.chatMessages.userId))
    .where(eq(s.chatMessages.id, id));
  if (!row) return null;
  return { id: row.m.id, body: row.m.body, createdAt: row.m.createdAt, pinned: row.m.pinned, user: row.u };
}

export async function recentChat(db: DB, eventId: string, limit = 80): Promise<ChatDTO[]> {
  const rows = await db
    .select({ m: s.chatMessages, u: { id: s.users.id, name: s.users.name, houseId: s.users.houseId } })
    .from(s.chatMessages)
    .innerJoin(s.users, eq(s.users.id, s.chatMessages.userId))
    .where(and(eq(s.chatMessages.eventId, eventId), eq(s.chatMessages.hidden, false)))
    .orderBy(desc(s.chatMessages.createdAt))
    .limit(limit);
  return rows.reverse().map((r) => ({ id: r.m.id, body: r.m.body, createdAt: r.m.createdAt, pinned: r.m.pinned, user: r.u }));
}

/* ── questions ── */

function questionFromRow(
  q: typeof s.questions.$inferSelect,
  u: { id: string; name: string; houseId: string | null },
  audience: Audience,
): QuestionDTO {
  return {
    id: q.id,
    body: q.body,
    votes: q.votes,
    status: q.status,
    createdAt: q.createdAt,
    anonymous: q.anonymous,
    author: q.anonymous && audience === "public" ? null : u,
  };
}

export async function questionDTO(db: DB, id: string, audience: Audience): Promise<QuestionDTO | null> {
  const [row] = await db
    .select({ q: s.questions, u: { id: s.users.id, name: s.users.name, houseId: s.users.houseId } })
    .from(s.questions)
    .innerJoin(s.users, eq(s.users.id, s.questions.userId))
    .where(eq(s.questions.id, id));
  return row ? questionFromRow(row.q, row.u, audience) : null;
}

export async function questionsOf(db: DB, eventId: string, audience: Audience, viewerId?: string): Promise<QuestionDTO[]> {
  const rows = await db
    .select({ q: s.questions, u: { id: s.users.id, name: s.users.name, houseId: s.users.houseId } })
    .from(s.questions)
    .innerJoin(s.users, eq(s.users.id, s.questions.userId))
    .where(and(eq(s.questions.eventId, eventId), audience === "manager" ? undefined : ne(s.questions.status, "hidden")))
    .orderBy(desc(s.questions.votes), asc(s.questions.createdAt));
  return rows
    .filter((r) => audience === "manager" || r.q.status !== "pending" || r.q.userId === viewerId)
    .map((r) => questionFromRow(r.q, r.u, audience));
}

/* ── polls ── */

export async function pollDTOs(db: DB, where: { eventId?: string; pollId?: string }, audience: Audience): Promise<PollDTO[]> {
  const rows = await db
    .select()
    .from(s.polls)
    .where(where.pollId ? eq(s.polls.id, where.pollId) : eq(s.polls.eventId, where.eventId!))
    .orderBy(desc(s.polls.createdAt));
  if (!rows.length) return [];
  const counts = await db
    .select({ pollId: s.pollVotes.pollId, option: s.pollVotes.option, n: sql<number>`count(*)` })
    .from(s.pollVotes)
    .where(inArray(s.pollVotes.pollId, rows.map((r) => r.id)))
    .groupBy(s.pollVotes.pollId, s.pollVotes.option);

  return rows
    .filter((p) => audience === "manager" || p.status !== "draft")
    .map((p) => {
      const tallies = p.options.map((_, i) => counts.find((c) => c.pollId === p.id && c.option === i)?.n ?? 0);
      const total = tallies.reduce((a, b) => a + b, 0);
      const visible = audience === "manager" || p.status === "closed" || p.liveResults;
      return {
        id: p.id,
        question: p.question,
        options: p.options,
        status: p.status,
        liveResults: p.liveResults,
        correctIndex: audience === "manager" || p.status === "closed" ? p.correctIndex : null,
        openedAt: p.openedAt,
        closesAt: p.closesAt,
        tallies: visible ? tallies : null,
        total,
      };
    });
}

/* ── brackets ── */

export async function bracketDTOs(db: DB, where: { eventId?: string; bracketId?: string }): Promise<BracketDTO[]> {
  const bs = await db
    .select()
    .from(s.brackets)
    .where(where.bracketId ? eq(s.brackets.id, where.bracketId) : eq(s.brackets.eventId, where.eventId!))
    .orderBy(asc(s.brackets.createdAt));
  if (!bs.length) return [];
  const ids = bs.map((b) => b.id);
  const [ents, ms] = await Promise.all([
    db.select().from(s.entrants).where(inArray(s.entrants.bracketId, ids)).orderBy(asc(s.entrants.seed)),
    db.select().from(s.matches).where(inArray(s.matches.bracketId, ids)),
  ]);
  const matchIds = ms.map((m) => m.id);
  const picks = matchIds.length
    ? await db
        .select({ matchId: s.predictions.matchId, pickId: s.predictions.pickId, n: sql<number>`count(*)` })
        .from(s.predictions)
        .where(inArray(s.predictions.matchId, matchIds))
        .groupBy(s.predictions.matchId, s.predictions.pickId)
    : [];

  return bs.map((b) => {
    const bm = ms.filter((m) => m.bracketId === b.id);
    const pk: BracketDTO["picks"] = {};
    for (const p of picks) {
      if (!bm.some((m) => m.id === p.matchId)) continue;
      (pk[p.matchId] ??= {})[p.pickId] = p.n;
    }
    return {
      id: b.id,
      title: b.title,
      game: b.game,
      bestOf: b.bestOf,
      thirdPlace: b.thirdPlace,
      entrants: ents.filter((e) => e.bracketId === b.id).map(({ id, name, houseId, seed }) => ({ id, name, houseId, seed })),
      matches: bm.map(toBMatch),
      picks: pk,
    };
  });
}

export const toBMatch = (m: typeof s.matches.$inferSelect): BMatch => ({
  id: m.id,
  round: m.round,
  slot: m.slot,
  lane: m.lane,
  aId: m.aId,
  bId: m.bId,
  scoreA: m.scoreA,
  scoreB: m.scoreB,
  winnerId: m.winnerId,
  status: m.status,
});

/* ── contests ── */

export async function contestDTOs(db: DB, where: { eventId?: string; contestId?: string }, audience: Audience): Promise<ContestDTO[]> {
  const cs = await db
    .select()
    .from(s.contests)
    .where(where.contestId ? eq(s.contests.id, where.contestId) : eq(s.contests.eventId, where.eventId!))
    .orderBy(asc(s.contests.createdAt));
  if (!cs.length) return [];
  const ids = cs.map((c) => c.id);
  const actRows = await db.select().from(s.acts).where(inArray(s.acts.contestId, ids)).orderBy(asc(s.acts.position));
  const actIds = actRows.map((a) => a.id);
  const [votes, scores] = actIds.length
    ? await Promise.all([
        db.select({ actId: s.actVotes.actId, n: sql<number>`count(*)` }).from(s.actVotes).where(inArray(s.actVotes.actId, actIds)).groupBy(s.actVotes.actId),
        db.select().from(s.judgeScores).where(inArray(s.judgeScores.actId, actIds)),
      ])
    : [[], []];

  return cs
    .filter((c) => audience === "manager" || c.status !== "draft")
    .map((c) => {
      const acts = actRows.filter((a) => a.contestId === c.id);
      const input = acts.map((a) => ({
        id: a.id,
        votes: votes.find((v) => v.actId === a.id)?.n ?? 0,
        judgeScores: scores.filter((x) => x.actId === a.id).map((x) => x.score),
      }));
      const visible = audience === "manager" || c.status === "revealed";
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        judgeWeight: c.judgeWeight,
        votesPerUser: c.votesPerUser,
        acts: acts.map(({ id, performer, title, houseId, position }) => ({ id, performer, title, houseId, position })),
        totalVotes: input.reduce((a, b) => a + b.votes, 0),
        standings: visible ? standings(input, c.judgeWeight) : null,
      };
    });
}
