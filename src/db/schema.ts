import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/* ───────────────────────── People & houses ───────────────────────── */

export const houses = sqliteTable("houses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  motto: text("motto"),
});

export type Role = "member" | "organizer" | "admin";

export const users = sqliteTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    houseId: text("house_id").references(() => houses.id),
    role: text("role").$type<Role>().notNull().default("member"),
    mutedUntil: integer("muted_until"),
    createdAt: createdAt(),
  },
  (t) => [index("users_house_idx").on(t.houseId)],
);

/* ───────────────────────────── Events ────────────────────────────── */

export type EventKind = "talk" | "cultural" | "esports" | "hackathon";
export type EventStatus = "draft" | "scheduled" | "live" | "ended";
export type StageScene =
  | "auto"
  | "question"
  | "poll"
  | "bracket"
  | "contest"
  | "lower-third"
  | "blank";

export type EventSettings = {
  slowModeSec: number;
  qaModeration: boolean;
  allowAnonymousQa: boolean;
  chatEnabled: boolean;
  /** House points awarded on wrap-up. */
  points: { first: number; second: number; third: number; participant: number };
};

export const defaultSettings: EventSettings = {
  slowModeSec: 0,
  qaModeration: false,
  allowAnonymousQa: true,
  chatEnabled: true,
  points: { first: 50, second: 30, third: 20, participant: 2 },
};

export const events = sqliteTable(
  "events",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    tagline: text("tagline"),
    description: text("description").notNull().default(""),
    kind: text("kind").$type<EventKind>().notNull(),
    status: text("status").$type<EventStatus>().notNull().default("draft"),
    streamUrl: text("stream_url"),
    hostHouseIds: text("host_house_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
    hue: integer("hue").notNull().default(260),
    settings: text("settings", { mode: "json" })
      .$type<EventSettings>()
      .notNull(),
    currentSegmentId: text("current_segment_id"),
    stageScene: text("stage_scene").$type<StageScene>().notNull().default("auto"),
    spotlightQuestionId: text("spotlight_question_id"),
    lowerThird: text("lower_third"),
    wrappedAt: integer("wrapped_at"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("events_status_idx").on(t.status, t.startsAt)],
);

export const segments = sqliteTable(
  "segments",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    speaker: text("speaker"),
    durationMin: integer("duration_min").notNull().default(15),
    position: integer("position").notNull(),
  },
  (t) => [index("segments_event_idx").on(t.eventId, t.position)],
);

export type RegistrationRole = "attendee" | "speaker" | "performer" | "player" | "organizer";

export const registrations = sqliteTable(
  "registrations",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<RegistrationRole>().notNull().default("attendee"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

/* ───────────────────────────── Live chat ─────────────────────────── */

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("chat_event_idx").on(t.eventId, t.createdAt)],
);

/* ──────────────────────────────── Q&A ────────────────────────────── */

export type QuestionStatus = "pending" | "live" | "answered" | "hidden";

export const questions = sqliteTable(
  "questions",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    anonymous: integer("anonymous", { mode: "boolean" }).notNull().default(false),
    status: text("status").$type<QuestionStatus>().notNull().default("live"),
    votes: integer("votes").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("questions_event_idx").on(t.eventId, t.status)],
);

export const questionVotes = sqliteTable(
  "question_votes",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.userId] })],
);

/* ─────────────────────────────── Polls ───────────────────────────── */

export type PollStatus = "draft" | "open" | "closed";

export const polls = sqliteTable(
  "polls",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    options: text("options", { mode: "json" }).$type<string[]>().notNull(),
    status: text("status").$type<PollStatus>().notNull().default("draft"),
    /** When false, audience only sees tallies once the poll closes. */
    liveResults: integer("live_results", { mode: "boolean" }).notNull().default(true),
    correctIndex: integer("correct_index"),
    openedAt: integer("opened_at"),
    closesAt: integer("closes_at"),
    createdAt: createdAt(),
  },
  (t) => [index("polls_event_idx").on(t.eventId)],
);

export const pollVotes = sqliteTable(
  "poll_votes",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    option: integer("option").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] })],
);

/* ────────────────────────── Esports brackets ─────────────────────── */

export const brackets = sqliteTable("brackets", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  game: text("game"),
  thirdPlace: integer("third_place", { mode: "boolean" }).notNull().default(true),
  bestOf: integer("best_of").notNull().default(3),
  createdAt: createdAt(),
});

export const entrants = sqliteTable(
  "entrants",
  {
    id: id(),
    bracketId: text("bracket_id")
      .notNull()
      .references(() => brackets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    houseId: text("house_id").references(() => houses.id),
    /** Optional link to members of the team, used for certificates. */
    memberIds: text("member_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    seed: integer("seed").notNull(),
  },
  (t) => [index("entrants_bracket_idx").on(t.bracketId)],
);

export type MatchStatus = "pending" | "ready" | "live" | "done";

export const matches = sqliteTable(
  "matches",
  {
    id: id(),
    bracketId: text("bracket_id")
      .notNull()
      .references(() => brackets.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    slot: integer("slot").notNull(),
    /** "main" for the elimination tree, "third" for the bronze match. */
    lane: text("lane").$type<"main" | "third">().notNull().default("main"),
    aId: text("a_id"),
    bId: text("b_id"),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    winnerId: text("winner_id"),
    status: text("status").$type<MatchStatus>().notNull().default("pending"),
  },
  (t) => [uniqueIndex("matches_pos_idx").on(t.bracketId, t.lane, t.round, t.slot)],
);

export const predictions = sqliteTable(
  "predictions",
  {
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    pickId: text("pick_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.userId] })],
);

/* ──────────────────────── Talent hunt contests ───────────────────── */

export type ContestStatus = "draft" | "open" | "closed" | "revealed";

export const contests = sqliteTable("contests", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").$type<ContestStatus>().notNull().default("draft"),
  /** 0–100: share of the final score that comes from judges. */
  judgeWeight: integer("judge_weight").notNull().default(60),
  votesPerUser: integer("votes_per_user").notNull().default(1),
  createdAt: createdAt(),
});

export const acts = sqliteTable(
  "acts",
  {
    id: id(),
    contestId: text("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    performer: text("performer").notNull(),
    title: text("title").notNull(),
    houseId: text("house_id").references(() => houses.id),
    userId: text("user_id").references(() => users.id),
    position: integer("position").notNull(),
  },
  (t) => [index("acts_contest_idx").on(t.contestId)],
);

export const actVotes = sqliteTable(
  "act_votes",
  {
    contestId: text("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    actId: text("act_id")
      .notNull()
      .references(() => acts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.actId, t.userId] }), index("act_votes_contest_user_idx").on(t.contestId, t.userId)],
);

export const judgeScores = sqliteTable(
  "judge_scores",
  {
    actId: text("act_id")
      .notNull()
      .references(() => acts.id, { onDelete: "cascade" }),
    judgeId: text("judge_id")
      .notNull()
      .references(() => users.id),
    score: real("score").notNull(),
  },
  (t) => [primaryKey({ columns: [t.actId, t.judgeId] })],
);

/* ──────────────────────── Credentials & points ───────────────────── */

export type CertKind = "winner" | "runner-up" | "third" | "participant" | "speaker" | "organizer";

export const certificates = sqliteTable(
  "certificates",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id),
    recipientName: text("recipient_name").notNull(),
    houseId: text("house_id").references(() => houses.id),
    kind: text("kind").$type<CertKind>().notNull(),
    achievement: text("achievement").notNull(),
    /** Canonical JSON that was signed. */
    payload: text("payload").notNull(),
    signature: text("signature").notNull(),
    issuedAt: integer("issued_at").notNull(),
    revokedAt: integer("revoked_at"),
    revokeReason: text("revoke_reason"),
    /** Idempotency key so wrapping up twice never issues duplicates. */
    dedupeKey: text("dedupe_key").notNull().unique(),
  },
  (t) => [index("certs_user_idx").on(t.userId), index("certs_event_idx").on(t.eventId)],
);

export const housePoints = sqliteTable(
  "house_points",
  {
    id: id(),
    houseId: text("house_id")
      .notNull()
      .references(() => houses.id),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    points: integer("points").notNull(),
    reason: text("reason").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("points_house_idx").on(t.houseId)],
);

/* ───────────────────────── Infra: realtime + audit ───────────────── */

/**
 * Append-only change log. Every live mutation writes a row here; SSE
 * subscribers tail it by id, which makes delivery resumable
 * (Last-Event-ID) and correct across many serverless instances.
 */
export const changes = sqliteTable(
  "changes",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    channel: text("channel").notNull(),
    type: text("type").notNull(),
    payload: text("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("changes_channel_idx").on(t.channel, t.seq)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id),
    eventId: text("event_id"),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_event_idx").on(t.eventId, t.createdAt)],
);

export const rateBuckets = sqliteTable("rate_buckets", {
  key: text("key").primaryKey(),
  tokens: real("tokens").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
