/** DTOs shared by server and client. Nothing here may import server code. */
import type { BMatch } from "./bracket";
import type { Standing } from "./contest";
import type {
  CertKind,
  ContestStatus,
  EventKind,
  EventSettings,
  EventStatus,
  PollStatus,
  QuestionStatus,
  Role,
  StageScene,
} from "@/db/schema";

export type { BMatch, Standing, CertKind, ContestStatus, EventKind, EventSettings, EventStatus, PollStatus, QuestionStatus, Role, StageScene };

export type HouseDTO = { id: string; slug: string; name: string; color: string };

export type EventDTO = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string;
  kind: EventKind;
  status: EventStatus;
  streamUrl: string | null;
  hostHouseIds: string[];
  startsAt: number;
  endsAt: number;
  hue: number;
  settings: EventSettings;
  currentSegmentId: string | null;
  stageScene: StageScene;
  spotlightQuestionId: string | null;
  lowerThird: string | null;
  wrappedAt: number | null;
};

export type SegmentDTO = { id: string; title: string; speaker: string | null; durationMin: number; position: number };

export type UserRef = { id: string; name: string; houseId: string | null };

export type ChatDTO = { id: string; body: string; createdAt: number; pinned: boolean; user: UserRef };

export type QuestionDTO = {
  id: string;
  body: string;
  votes: number;
  status: QuestionStatus;
  createdAt: number;
  anonymous: boolean;
  author: UserRef | null; // null when anonymous (for non-managers)
};

export type PollDTO = {
  id: string;
  question: string;
  options: string[];
  status: PollStatus;
  liveResults: boolean;
  correctIndex: number | null;
  openedAt: number | null;
  closesAt: number | null;
  /** null when results are hidden from this audience. */
  tallies: number[] | null;
  total: number;
};

export type EntrantDTO = { id: string; name: string; houseId: string | null; seed: number };

export type BracketDTO = {
  id: string;
  title: string;
  game: string | null;
  bestOf: number;
  thirdPlace: boolean;
  entrants: EntrantDTO[];
  matches: BMatch[];
  /** matchId → entrantId → number of audience picks */
  picks: Record<string, Record<string, number>>;
};

export type ActDTO = { id: string; performer: string; title: string; houseId: string | null; position: number };

export type ContestDTO = {
  id: string;
  title: string;
  status: ContestStatus;
  judgeWeight: number;
  votesPerUser: number;
  acts: ActDTO[];
  totalVotes: number;
  /** null while results are hidden from this audience. */
  standings: Standing[] | null;
};

export type MyState = {
  userId: string;
  name: string;
  houseId: string | null;
  role: Role;
  questionVotes: string[];
  pollVotes: Record<string, number>;
  predictions: Record<string, string>;
  actVotes: string[];
};

export type Snapshot = {
  event: EventDTO;
  segments: SegmentDTO[];
  chat: ChatDTO[];
  questions: QuestionDTO[];
  polls: PollDTO[];
  brackets: BracketDTO[];
  contests: ContestDTO[];
  houses: HouseDTO[];
  me: MyState | null;
  canManage: boolean;
  cursor: number;
};

export type CertificateDTO = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  recipientName: string;
  houseName: string | null;
  kind: CertKind;
  achievement: string;
  issuedAt: number;
  revokedAt: number | null;
};

/** Messages pushed over SSE. */
export type LiveEvent =
  | { type: "event.update"; payload: EventDTO }
  | { type: "segments.update"; payload: SegmentDTO[] }
  | { type: "chat.new"; payload: ChatDTO }
  | { type: "chat.update"; payload: ChatDTO }
  | { type: "chat.remove"; payload: { id: string } }
  | { type: "qa.upsert"; payload: QuestionDTO }
  | { type: "qa.remove"; payload: { id: string } }
  | { type: "poll.upsert"; payload: PollDTO }
  | { type: "poll.remove"; payload: { id: string } }
  | { type: "bracket.upsert"; payload: BracketDTO }
  | { type: "contest.upsert"; payload: ContestDTO }
  | { type: "reaction"; payload: { emoji: string; houseId: string | null } }
  | { type: "cert.issued"; payload: CertificateDTO }
  | { type: "presence"; payload: { count: number } }
  | { type: "toast"; payload: { message: string } };

export const REACTIONS = ["👏", "🔥", "💚", "😂", "🤯", "🎉"] as const;
