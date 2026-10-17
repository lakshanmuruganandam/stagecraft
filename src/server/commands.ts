import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import { buildBracket, reportResult, setLive, BracketError } from "@/lib/bracket";
import { canManageEvent, HttpError, type Viewer } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { adminChannel, publicChannel, publish, userChannel, type Channel } from "@/lib/live";
import { vet } from "@/lib/moderation";
import { take } from "@/lib/ratelimit";
import { REACTIONS } from "@/lib/types";
import { bracketDTOs, chatDTO, contestDTOs, eventDTO, pollDTOs, questionDTO, segmentsOf, toBMatch } from "./views";
import { wrapUpEvent } from "./wrapup";

/**
 * Command bus for everything that happens during a live event.
 *
 * One endpoint (POST /api/events/:id/commands) receives a discriminated
 * union; each command declares its schema, who may run it, and a handler.
 * Handlers mutate, then publish redacted (public) and full (manager)
 * views to the change log. Adding a feature = adding one entry here.
 */

type Ctx = { db: DB; viewer: Viewer; event: typeof s.events.$inferSelect };
type Def<S extends z.ZodType> = { schema: S; manager?: boolean; run: (ctx: Ctx, input: z.infer<S>) => Promise<unknown> };
const def = <S extends z.ZodType>(d: Def<S>) => d;

const id = z.string().min(1).max(64);
const both = (eventId: string): Channel[] => [publicChannel(eventId), adminChannel(eventId)];

async function audit(ctx: Ctx, action: string, detail?: string) {
  await ctx.db.insert(s.auditLog).values({ id: newId(), actorId: ctx.viewer.id, eventId: ctx.event.id, action, detail });
}

async function limit(key: string, capacity: number, perSec: number, what = "That") {
  const r = await take(key, capacity, perSec);
  if (!r.ok) throw new HttpError(429, `${what} is too fast. Try again in ${Math.ceil(r.retryInMs / 1000)}s.`);
}

function assertNotMuted(v: Viewer) {
  if (v.mutedUntil && v.mutedUntil > Date.now()) {
    const mins = Math.ceil((v.mutedUntil - Date.now()) / 60000);
    throw new HttpError(403, `You're muted by a moderator for ${mins} more minute${mins === 1 ? "" : "s"}.`);
  }
}

function assertLive(ctx: Ctx) {
  if (ctx.event.status === "ended") throw new HttpError(409, "This event has ended");
}

/* ───────── publishers ───────── */

async function pushEvent(ctx: Ctx) {
  const e = await ctx.db.query.events.findFirst({ where: eq(s.events.id, ctx.event.id) });
  await publish(both(ctx.event.id), "event.update", eventDTO(e!));
  return eventDTO(e!);
}

async function pushQuestion(ctx: Ctx, qid: string) {
  const [pub, mgr] = await Promise.all([questionDTO(ctx.db, qid, "public"), questionDTO(ctx.db, qid, "manager")]);
  if (!pub || !mgr) return;
  await publish(adminChannel(ctx.event.id), "qa.upsert", mgr);
  if (pub.status === "hidden" || pub.status === "pending") {
    await publish(publicChannel(ctx.event.id), "qa.remove", { id: qid });
  } else {
    await publish(publicChannel(ctx.event.id), "qa.upsert", pub);
  }
}

async function pushPoll(ctx: Ctx, pollId: string) {
  const [[pub], [mgr]] = await Promise.all([pollDTOs(ctx.db, { pollId }, "public"), pollDTOs(ctx.db, { pollId }, "manager")]);
  if (mgr) await publish(adminChannel(ctx.event.id), "poll.upsert", mgr);
  if (pub) await publish(publicChannel(ctx.event.id), "poll.upsert", pub);
  return mgr;
}

async function pushBracket(ctx: Ctx, bracketId: string) {
  const [b] = await bracketDTOs(ctx.db, { bracketId });
  if (b) await publish(both(ctx.event.id), "bracket.upsert", b);
  return b;
}

async function pushContest(ctx: Ctx, contestId: string) {
  const [[pub], [mgr]] = await Promise.all([contestDTOs(ctx.db, { contestId }, "public"), contestDTOs(ctx.db, { contestId }, "manager")]);
  if (mgr) await publish(adminChannel(ctx.event.id), "contest.upsert", mgr);
  if (pub) await publish(publicChannel(ctx.event.id), "contest.upsert", pub);
  return mgr;
}

async function ownPoll(ctx: Ctx, pollId: string) {
  const p = await ctx.db.query.polls.findFirst({ where: and(eq(s.polls.id, pollId), eq(s.polls.eventId, ctx.event.id)) });
  if (!p) throw new HttpError(404, "Poll not found");
  return p;
}

async function ownQuestion(ctx: Ctx, qid: string) {
  const q = await ctx.db.query.questions.findFirst({ where: and(eq(s.questions.id, qid), eq(s.questions.eventId, ctx.event.id)) });
  if (!q) throw new HttpError(404, "Question not found");
  return q;
}

async function ownMatch(ctx: Ctx, matchId: string) {
  const [row] = await ctx.db
    .select({ m: s.matches, b: s.brackets })
    .from(s.matches)
    .innerJoin(s.brackets, eq(s.brackets.id, s.matches.bracketId))
    .where(and(eq(s.matches.id, matchId), eq(s.brackets.eventId, ctx.event.id)));
  if (!row) throw new HttpError(404, "Match not found");
  return row;
}

async function ownContest(ctx: Ctx, contestId: string) {
  const c = await ctx.db.query.contests.findFirst({ where: and(eq(s.contests.id, contestId), eq(s.contests.eventId, ctx.event.id)) });
  if (!c) throw new HttpError(404, "Contest not found");
  return c;
}

/** Persist a whole bracket after a pure-engine transition. */
async function saveMatches(db: DB, ms: ReturnType<typeof reportResult>) {
  await db.transaction(async (tx) => {
    for (const m of ms) {
      await tx
        .update(s.matches)
        .set({ aId: m.aId, bId: m.bId, scoreA: m.scoreA, scoreB: m.scoreB, winnerId: m.winnerId, status: m.status })
        .where(eq(s.matches.id, m.id));
    }
  });
}

/* ───────── commands ───────── */

export const commands = {
  /* Chat */
  "chat.send": def({
    schema: z.object({ body: z.string() }),
    async run(ctx, { body }) {
      assertLive(ctx);
      assertNotMuted(ctx.viewer);
      if (!ctx.event.settings.chatEnabled && !canManageEvent(ctx.viewer, ctx.event)) throw new HttpError(403, "Chat is paused by the organizers");
      const v = vet(body, { max: 280 });
      if (!v.ok) throw new HttpError(400, v.reason);
      await limit(`chat:${ctx.viewer.id}`, 5, 1, "Chatting");
      const slow = ctx.event.settings.slowModeSec;
      if (slow > 0 && !canManageEvent(ctx.viewer, ctx.event)) await limit(`slow:${ctx.event.id}:${ctx.viewer.id}`, 1, 1 / slow, "Slow mode is on. Chatting");
      const mid = newId();
      await ctx.db.insert(s.chatMessages).values({ id: mid, eventId: ctx.event.id, userId: ctx.viewer.id, body: v.body });
      const dto = await chatDTO(ctx.db, mid);
      await publish(both(ctx.event.id), "chat.new", dto);
      return dto;
    },
  }),
  "chat.hide": def({
    manager: true,
    schema: z.object({ messageId: id }),
    async run(ctx, { messageId }) {
      await ctx.db.update(s.chatMessages).set({ hidden: true }).where(and(eq(s.chatMessages.id, messageId), eq(s.chatMessages.eventId, ctx.event.id)));
      await publish(both(ctx.event.id), "chat.remove", { id: messageId });
      await audit(ctx, "chat.hide", messageId);
    },
  }),
  "chat.pin": def({
    manager: true,
    schema: z.object({ messageId: id, pinned: z.boolean() }),
    async run(ctx, { messageId, pinned }) {
      const msg = await ctx.db.query.chatMessages.findFirst({ where: and(eq(s.chatMessages.id, messageId), eq(s.chatMessages.eventId, ctx.event.id), eq(s.chatMessages.hidden, false)) });
      if (!msg) throw new HttpError(404, "Message not found");
      if (pinned) await ctx.db.update(s.chatMessages).set({ pinned: false }).where(eq(s.chatMessages.eventId, ctx.event.id));
      await ctx.db.update(s.chatMessages).set({ pinned }).where(and(eq(s.chatMessages.id, messageId), eq(s.chatMessages.eventId, ctx.event.id)));
      const dto = await chatDTO(ctx.db, messageId);
      await publish(both(ctx.event.id), "chat.update", dto);
    },
  }),
  "user.mute": def({
    manager: true,
    schema: z.object({ userId: id, minutes: z.number().int().min(0).max(24 * 60) }),
    async run(ctx, { userId, minutes }) {
      if (userId === ctx.viewer.id) throw new HttpError(400, "You can't mute yourself");
      const target = await ctx.db.query.users.findFirst({ where: eq(s.users.id, userId) });
      if (!target) throw new HttpError(404, "User not found");
      if (target.role === "admin" || (target.role === "organizer" && ctx.viewer.role !== "admin")) throw new HttpError(403, "You can't mute another organizer or an admin");
      // Moderators may only act on people taking part in *this* event.
      const inEvent =
        (await ctx.db.query.chatMessages.findFirst({ where: and(eq(s.chatMessages.eventId, ctx.event.id), eq(s.chatMessages.userId, userId)) })) ??
        (await ctx.db.query.questions.findFirst({ where: and(eq(s.questions.eventId, ctx.event.id), eq(s.questions.userId, userId)) }));
      if (!inEvent) throw new HttpError(403, "That person hasn't taken part in this event");
      await ctx.db.update(s.users).set({ mutedUntil: minutes ? Date.now() + minutes * 60_000 : null }).where(eq(s.users.id, userId));
      await publish(userChannel(userId), "toast", { message: minutes ? `A moderator muted you for ${minutes} minutes.` : "You've been unmuted." });
      await audit(ctx, "user.mute", `${userId} for ${minutes}m`);
    },
  }),

  /* Q&A */
  "qa.ask": def({
    schema: z.object({ body: z.string(), anonymous: z.boolean().default(false) }),
    async run(ctx, { body, anonymous }) {
      assertLive(ctx);
      assertNotMuted(ctx.viewer);
      const v = vet(body, { max: 300 });
      if (!v.ok) throw new HttpError(400, v.reason);
      if (v.body.length < 8) throw new HttpError(400, "Make your question a little longer");
      await limit(`qa:${ctx.viewer.id}`, 3, 1 / 20, "Asking");
      const qid = newId();
      const status = ctx.event.settings.qaModeration && !canManageEvent(ctx.viewer, ctx.event) ? "pending" : "live";
      await ctx.db.insert(s.questions).values({ id: qid, eventId: ctx.event.id, userId: ctx.viewer.id, body: v.body, anonymous: anonymous && ctx.event.settings.allowAnonymousQa, status });
      await pushQuestion(ctx, qid);
      const mine = await questionDTO(ctx.db, qid, "manager");
      if (status === "pending") await publish(userChannel(ctx.viewer.id), "qa.upsert", mine);
      return mine;
    },
  }),
  "qa.vote": def({
    schema: z.object({ questionId: id }),
    async run(ctx, { questionId }) {
      const q = await ownQuestion(ctx, questionId);
      if (q.status !== "live") throw new HttpError(409, "Voting is closed for this question");
      await limit(`vote:${ctx.viewer.id}`, 20, 2, "Voting");
      // Toggle atomically; the counter is derived from the vote table so it can't drift.
      const del = await ctx.db.delete(s.questionVotes).where(and(eq(s.questionVotes.questionId, questionId), eq(s.questionVotes.userId, ctx.viewer.id)));
      const voted = del.rowsAffected === 0;
      if (voted) await ctx.db.insert(s.questionVotes).values({ questionId, userId: ctx.viewer.id }).onConflictDoNothing();
      await ctx.db
        .update(s.questions)
        .set({ votes: sql`(select count(*) from ${s.questionVotes} where ${s.questionVotes.questionId} = ${questionId})` })
        .where(eq(s.questions.id, questionId));
      await pushQuestion(ctx, questionId);
      return { voted };
    },
  }),
  "qa.status": def({
    manager: true,
    schema: z.object({ questionId: id, status: z.enum(["pending", "live", "answered", "hidden"]) }),
    async run(ctx, { questionId, status }) {
      await ownQuestion(ctx, questionId);
      await ctx.db.update(s.questions).set({ status }).where(eq(s.questions.id, questionId));
      if (status !== "live" && ctx.event.spotlightQuestionId === questionId && status !== "answered") {
        await ctx.db.update(s.events).set({ spotlightQuestionId: null }).where(eq(s.events.id, ctx.event.id));
        await pushEvent(ctx);
      }
      await pushQuestion(ctx, questionId);
      await audit(ctx, `qa.${status}`, questionId);
    },
  }),
  "qa.spotlight": def({
    manager: true,
    schema: z.object({ questionId: id.nullable() }),
    async run(ctx, { questionId }) {
      if (questionId) {
        const q = await ownQuestion(ctx, questionId);
        if (q.status === "pending" || q.status === "hidden") {
          await ctx.db.update(s.questions).set({ status: "live" }).where(eq(s.questions.id, questionId));
          await pushQuestion(ctx, questionId);
        }
      }
      await ctx.db.update(s.events).set({ spotlightQuestionId: questionId, stageScene: questionId ? "question" : ctx.event.stageScene }).where(eq(s.events.id, ctx.event.id));
      return pushEvent(ctx);
    },
  }),

  /* Polls */
  "poll.create": def({
    manager: true,
    schema: z.object({
      question: z.string().trim().min(3).max(200),
      options: z.array(z.string().trim().min(1).max(80)).min(2).max(6),
      liveResults: z.boolean().default(true),
      correctIndex: z.number().int().min(0).max(5).nullable().default(null),
      openNow: z.boolean().default(false),
      durationSec: z.number().int().min(0).max(3600).default(0),
    }),
    async run(ctx, input) {
      const pid = newId();
      const now = Date.now();
      await ctx.db.insert(s.polls).values({
        id: pid,
        eventId: ctx.event.id,
        question: input.question,
        options: input.options,
        liveResults: input.liveResults,
        correctIndex: input.correctIndex !== null && input.correctIndex < input.options.length ? input.correctIndex : null,
        status: input.openNow ? "open" : "draft",
        openedAt: input.openNow ? now : null,
        closesAt: input.openNow && input.durationSec ? now + input.durationSec * 1000 : null,
      });
      if (input.openNow) await ctx.db.update(s.events).set({ stageScene: "poll" }).where(eq(s.events.id, ctx.event.id));
      await audit(ctx, "poll.create", input.question);
      if (input.openNow) await pushEvent(ctx);
      return pushPoll(ctx, pid);
    },
  }),
  "poll.status": def({
    manager: true,
    schema: z.object({ pollId: id, status: z.enum(["open", "closed"]), durationSec: z.number().int().min(0).max(3600).default(0) }),
    async run(ctx, { pollId, status, durationSec }) {
      await ownPoll(ctx, pollId);
      const now = Date.now();
      if (status === "open") {
        await ctx.db.update(s.polls).set({ status, openedAt: now, closesAt: durationSec ? now + durationSec * 1000 : null }).where(eq(s.polls.id, pollId));
        await ctx.db.update(s.events).set({ stageScene: "poll" }).where(eq(s.events.id, ctx.event.id));
        await pushEvent(ctx);
      } else {
        await ctx.db.update(s.polls).set({ status, closesAt: now }).where(eq(s.polls.id, pollId));
      }
      await audit(ctx, `poll.${status}`, pollId);
      return pushPoll(ctx, pollId);
    },
  }),
  "poll.delete": def({
    manager: true,
    schema: z.object({ pollId: id }),
    async run(ctx, { pollId }) {
      await ownPoll(ctx, pollId);
      await ctx.db.delete(s.polls).where(eq(s.polls.id, pollId));
      await publish(both(ctx.event.id), "poll.remove", { id: pollId });
      await audit(ctx, "poll.delete", pollId);
    },
  }),
  "poll.vote": def({
    schema: z.object({ pollId: id, option: z.number().int().min(0) }),
    async run(ctx, { pollId, option }) {
      const p = await ownPoll(ctx, pollId);
      const expired = p.closesAt && p.closesAt < Date.now();
      if (p.status !== "open" || expired) throw new HttpError(409, "This poll is closed");
      if (option >= p.options.length) throw new HttpError(400, "Unknown option");
      await limit(`vote:${ctx.viewer.id}`, 20, 2, "Voting");
      // One vote per person; re-voting changes your answer.
      await ctx.db
        .insert(s.pollVotes)
        .values({ pollId, userId: ctx.viewer.id, option })
        .onConflictDoUpdate({ target: [s.pollVotes.pollId, s.pollVotes.userId], set: { option } });
      await pushPoll(ctx, pollId);
      return { option };
    },
  }),

  /* Brackets */
  "bracket.create": def({
    manager: true,
    schema: z.object({
      title: z.string().trim().min(2).max(80),
      game: z.string().trim().max(40).optional(),
      bestOf: z.number().int().min(1).max(7).default(3),
      thirdPlace: z.boolean().default(true),
      entrants: z.array(z.object({ name: z.string().trim().min(1).max(60), houseId: z.string().nullable().optional() })).min(2).max(64),
    }),
    async run(ctx, input) {
      const bid = newId();
      const ents = input.entrants.map((e, i) => ({ id: newId(), bracketId: bid, name: e.name, houseId: e.houseId ?? null, seed: i + 1 }));
      const ms = buildBracket(ents.map((e) => e.id), { thirdPlace: input.thirdPlace, makeId: newId });
      await ctx.db.transaction(async (tx) => {
        await tx.insert(s.brackets).values({ id: bid, eventId: ctx.event.id, title: input.title, game: input.game, bestOf: input.bestOf, thirdPlace: input.thirdPlace });
        await tx.insert(s.entrants).values(ents);
        await tx.insert(s.matches).values(ms.map((m) => ({ ...m, bracketId: bid })));
      });
      await audit(ctx, "bracket.create", `${input.title} (${ents.length} entrants)`);
      return pushBracket(ctx, bid);
    },
  }),
  "match.report": def({
    manager: true,
    schema: z.object({ matchId: id, scoreA: z.number().int().min(0).max(99), scoreB: z.number().int().min(0).max(99) }),
    async run(ctx, { matchId, scoreA, scoreB }) {
      const { b } = await ownMatch(ctx, matchId);
      const all = (await ctx.db.select().from(s.matches).where(eq(s.matches.bracketId, b.id))).map(toBMatch);
      try {
        await saveMatches(ctx.db, reportResult(all, matchId, scoreA, scoreB));
      } catch (e) {
        if (e instanceof BracketError) throw new HttpError(409, e.message);
        throw e;
      }
      await audit(ctx, "match.report", `${matchId}: ${scoreA}-${scoreB}`);
      return pushBracket(ctx, b.id);
    },
  }),
  "match.live": def({
    manager: true,
    schema: z.object({ matchId: id, live: z.boolean() }),
    async run(ctx, { matchId, live }) {
      const { b } = await ownMatch(ctx, matchId);
      const all = (await ctx.db.select().from(s.matches).where(eq(s.matches.bracketId, b.id))).map(toBMatch);
      try {
        await saveMatches(ctx.db, setLive(all, matchId, live));
      } catch (e) {
        if (e instanceof BracketError) throw new HttpError(409, e.message);
        throw e;
      }
      if (live) {
        await ctx.db.update(s.events).set({ stageScene: "bracket" }).where(eq(s.events.id, ctx.event.id));
        await pushEvent(ctx);
      }
      return pushBracket(ctx, b.id);
    },
  }),
  "match.predict": def({
    schema: z.object({ matchId: id, pickId: id }),
    async run(ctx, { matchId, pickId }) {
      const { m, b } = await ownMatch(ctx, matchId);
      if (m.status !== "ready") throw new HttpError(409, m.status === "live" ? "Predictions lock once a match goes live" : "This match isn't open for predictions");
      if (pickId !== m.aId && pickId !== m.bId) throw new HttpError(400, "Pick one of the two sides");
      await limit(`vote:${ctx.viewer.id}`, 20, 2, "Predicting");
      await ctx.db
        .insert(s.predictions)
        .values({ matchId, userId: ctx.viewer.id, pickId })
        .onConflictDoUpdate({ target: [s.predictions.matchId, s.predictions.userId], set: { pickId } });
      await pushBracket(ctx, b.id);
      return { pickId };
    },
  }),

  /* Talent hunt */
  "contest.create": def({
    manager: true,
    schema: z.object({
      title: z.string().trim().min(2).max(80),
      judgeWeight: z.number().int().min(0).max(100).default(60),
      votesPerUser: z.number().int().min(1).max(5).default(1),
      acts: z.array(z.object({ performer: z.string().trim().min(1).max(60), title: z.string().trim().min(1).max(100), houseId: z.string().nullable().optional() })).min(2).max(40),
    }),
    async run(ctx, input) {
      const cid = newId();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(s.contests).values({ id: cid, eventId: ctx.event.id, title: input.title, judgeWeight: input.judgeWeight, votesPerUser: input.votesPerUser });
        await tx.insert(s.acts).values(input.acts.map((a, i) => ({ id: newId(), contestId: cid, performer: a.performer, title: a.title, houseId: a.houseId ?? null, position: i })));
      });
      await audit(ctx, "contest.create", input.title);
      return pushContest(ctx, cid);
    },
  }),
  "contest.status": def({
    manager: true,
    schema: z.object({ contestId: id, status: z.enum(["draft", "open", "closed", "revealed"]) }),
    async run(ctx, { contestId, status }) {
      await ownContest(ctx, contestId);
      await ctx.db.update(s.contests).set({ status }).where(eq(s.contests.id, contestId));
      if (status === "open" || status === "revealed") {
        await ctx.db.update(s.events).set({ stageScene: "contest" }).where(eq(s.events.id, ctx.event.id));
        await pushEvent(ctx);
      }
      await audit(ctx, `contest.${status}`, contestId);
      return pushContest(ctx, contestId);
    },
  }),
  "contest.vote": def({
    schema: z.object({ contestId: id, actId: id }),
    async run(ctx, { contestId, actId }) {
      const c = await ownContest(ctx, contestId);
      if (c.status !== "open") throw new HttpError(409, "Voting isn't open");
      const act = await ctx.db.query.acts.findFirst({ where: and(eq(s.acts.id, actId), eq(s.acts.contestId, contestId)) });
      if (!act) throw new HttpError(404, "Act not found");
      if (act.userId === ctx.viewer.id) throw new HttpError(403, "You can't vote for your own act");
      await limit(`vote:${ctx.viewer.id}`, 20, 2, "Voting");
      const del = await ctx.db.delete(s.actVotes).where(and(eq(s.actVotes.actId, actId), eq(s.actVotes.userId, ctx.viewer.id)));
      let voted = false;
      if (del.rowsAffected === 0) {
        const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)` }).from(s.actVotes).where(and(eq(s.actVotes.contestId, contestId), eq(s.actVotes.userId, ctx.viewer.id)));
        if (n >= c.votesPerUser) throw new HttpError(409, `You have ${c.votesPerUser} vote${c.votesPerUser === 1 ? "" : "s"}. Remove one to vote for this act.`);
        await ctx.db.insert(s.actVotes).values({ contestId, actId, userId: ctx.viewer.id });
        voted = true;
      }
      await pushContest(ctx, contestId);
      return { voted };
    },
  }),
  "contest.judge": def({
    manager: true,
    schema: z.object({ actId: id, score: z.number().min(0).max(10) }),
    async run(ctx, { actId, score }) {
      const act = await ctx.db.query.acts.findFirst({ where: eq(s.acts.id, actId) });
      if (!act) throw new HttpError(404, "Act not found");
      await ownContest(ctx, act.contestId);
      await ctx.db
        .insert(s.judgeScores)
        .values({ actId, judgeId: ctx.viewer.id, score })
        .onConflictDoUpdate({ target: [s.judgeScores.actId, s.judgeScores.judgeId], set: { score } });
      await audit(ctx, "contest.judge", `${act.performer}: ${score}`);
      return pushContest(ctx, act.contestId);
    },
  }),

  /* Run of show & stage */
  "event.status": def({
    manager: true,
    schema: z.object({ status: z.enum(["draft", "scheduled", "live", "ended"]) }),
    async run(ctx, { status }) {
      await ctx.db.update(s.events).set({ status }).where(eq(s.events.id, ctx.event.id));
      await audit(ctx, "event.status", status);
      return pushEvent(ctx);
    },
  }),
  "event.segment": def({
    manager: true,
    schema: z.object({ segmentId: id.nullable() }),
    async run(ctx, { segmentId }) {
      const seg = segmentId ? await ctx.db.query.segments.findFirst({ where: and(eq(s.segments.id, segmentId), eq(s.segments.eventId, ctx.event.id)) }) : null;
      if (segmentId && !seg) throw new HttpError(404, "Segment not found");
      await ctx.db.update(s.events).set({ currentSegmentId: segmentId }).where(eq(s.events.id, ctx.event.id));
      if (seg) await ctx.db.update(s.events).set({ lowerThird: seg.speaker ? `${seg.title} · ${seg.speaker}` : seg.title }).where(eq(s.events.id, ctx.event.id));
      return pushEvent(ctx);
    },
  }),
  "event.segments": def({
    manager: true,
    schema: z.object({ segments: z.array(z.object({ title: z.string().trim().min(1).max(100), speaker: z.string().trim().max(80).nullable().optional(), durationMin: z.number().int().min(1).max(600) })).max(40) }),
    async run(ctx, input) {
      await ctx.db.transaction(async (tx) => {
        await tx.delete(s.segments).where(eq(s.segments.eventId, ctx.event.id));
        if (input.segments.length) await tx.insert(s.segments).values(input.segments.map((x, i) => ({ id: newId(), eventId: ctx.event.id, title: x.title, speaker: x.speaker ?? null, durationMin: x.durationMin, position: i })));
        await tx.update(s.events).set({ currentSegmentId: null }).where(eq(s.events.id, ctx.event.id));
      });
      const segs = await segmentsOf(ctx.db, ctx.event.id);
      await publish(both(ctx.event.id), "segments.update", segs);
      await pushEvent(ctx);
      return segs;
    },
  }),
  "event.scene": def({
    manager: true,
    schema: z.object({ scene: z.enum(["auto", "question", "poll", "bracket", "contest", "lower-third", "blank"]) }),
    async run(ctx, { scene }) {
      await ctx.db.update(s.events).set({ stageScene: scene }).where(eq(s.events.id, ctx.event.id));
      return pushEvent(ctx);
    },
  }),
  "event.lowerThird": def({
    manager: true,
    schema: z.object({ text: z.string().trim().max(120).nullable() }),
    async run(ctx, { text }) {
      await ctx.db.update(s.events).set({ lowerThird: text || null }).where(eq(s.events.id, ctx.event.id));
      return pushEvent(ctx);
    },
  }),
  "event.settings": def({
    manager: true,
    schema: z.object({
      slowModeSec: z.number().int().min(0).max(300).optional(),
      qaModeration: z.boolean().optional(),
      allowAnonymousQa: z.boolean().optional(),
      chatEnabled: z.boolean().optional(),
    }),
    async run(ctx, patch) {
      const settings = { ...ctx.event.settings, ...patch };
      await ctx.db.update(s.events).set({ settings }).where(eq(s.events.id, ctx.event.id));
      await audit(ctx, "event.settings", JSON.stringify(patch));
      return pushEvent(ctx);
    },
  }),
  "event.wrapup": def({
    manager: true,
    schema: z.object({}),
    async run(ctx) {
      return wrapUpEvent(ctx.db, ctx.event.id, { actorId: ctx.viewer.id });
    },
  }),

  "cert.revoke": def({
    manager: true,
    schema: z.object({ certificateId: id, reason: z.string().trim().min(3, "Give a short reason").max(200) }),
    async run(ctx, { certificateId, reason }) {
      const cert = await ctx.db.query.certificates.findFirst({
        where: and(eq(s.certificates.id, certificateId.toUpperCase()), eq(s.certificates.eventId, ctx.event.id)),
      });
      if (!cert) throw new HttpError(404, "Certificate not found for this event");
      if (cert.revokedAt) throw new HttpError(409, "Already revoked");
      // The signature stays valid; verifiers check revocation status separately.
      await ctx.db.update(s.certificates).set({ revokedAt: Date.now(), revokeReason: reason }).where(eq(s.certificates.id, cert.id));
      await audit(ctx, "cert.revoke", `${cert.id} (${cert.recipientName}): ${reason}`);
      if (cert.userId) await publish(userChannel(cert.userId), "toast", { message: `Your certificate ${cert.id} was revoked: ${reason}` });
      return { id: cert.id };
    },
  }),

  /* Reactions: ephemeral, never stored beyond the change log. */
  react: def({
    schema: z.object({ emoji: z.enum(REACTIONS) }),
    async run(ctx, { emoji }) {
      await limit(`react:${ctx.viewer.id}`, 8, 2, "Reacting");
      await publish(both(ctx.event.id), "reaction", { emoji, houseId: ctx.viewer.houseId });
    },
  }),
} as const;

export type CommandName = keyof typeof commands;
export type CommandInput<K extends CommandName> = z.input<(typeof commands)[K]["schema"]>;

export async function runCommand(db: DB, viewer: Viewer, eventId: string, raw: unknown) {
  const name = (raw as { type?: string })?.type as CommandName | undefined;
  if (!name || !(name in commands)) throw new HttpError(400, "Unknown command");
  const cmd = commands[name] as Def<z.ZodType>;
  const event = await db.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!event) throw new HttpError(404, "Event not found");
  const manager = canManageEvent(viewer, event);
  if (!manager && event.status === "draft") throw new HttpError(404, "Event not found");
  if (cmd.manager && !manager) throw new HttpError(403, "Organizers only");
  const parsed = cmd.schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  return cmd.run({ db, viewer, event }, parsed.data);
}
