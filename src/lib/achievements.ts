/**
 * House Odyssey — achievements engine (pure, unit-tested).
 *
 * Input: activity counts for one member (aggregated by server/odyssey.ts).
 * Output: tiered badges with progress, XP, a level on a smooth curve, and
 * quest completion. No I/O here, so the rules are easy to read and test.
 */

export type Activity = {
  questionsAsked: number;
  upvotesGiven: number;
  upvotesReceived: number;
  pollsVoted: number;
  predictionsMade: number;
  correctPredictions: number;
  actsVoted: number;
  chatsSent: number;
  eventsAttended: number;
  podiums: number;
  certificates: number;
  crossHouseEvents: number;
};

export const EMPTY_ACTIVITY: Activity = {
  questionsAsked: 0,
  upvotesGiven: 0,
  upvotesReceived: 0,
  pollsVoted: 0,
  predictionsMade: 0,
  correctPredictions: 0,
  actsVoted: 0,
  chatsSent: 0,
  eventsAttended: 0,
  podiums: 0,
  certificates: 0,
  crossHouseEvents: 0,
};

export type Tier = "bronze" | "silver" | "gold";

/** Icon keys map to lucide icons in components/odyssey/icons.tsx. */
export type IconKey =
  | "spark"
  | "megaphone"
  | "heart"
  | "flame"
  | "vote"
  | "crystal"
  | "target"
  | "music"
  | "chat"
  | "compass"
  | "bridge"
  | "crown"
  | "scroll"
  | "users"
  | "sunrise";

type BadgeDef = {
  id: string;
  name: string;
  description: string;
  icon: IconKey;
  metric: keyof Activity;
  /** Thresholds for bronze, silver, gold. */
  tiers: [number, number, number];
};

export const BADGES: BadgeDef[] = [
  { id: "first-light", name: "First Light", description: "Take part in events", icon: "sunrise", metric: "eventsAttended", tiers: [1, 5, 15] },
  { id: "curious-mind", name: "Curious Mind", description: "Ask questions during live sessions", icon: "spark", metric: "questionsAsked", tiers: [1, 5, 20] },
  { id: "crowd-voice", name: "Voice of the Crowd", description: "Collect upvotes on your questions", icon: "megaphone", metric: "upvotesReceived", tiers: [5, 25, 100] },
  { id: "good-taste", name: "Good Taste", description: "Upvote the questions you want answered", icon: "heart", metric: "upvotesGiven", tiers: [3, 15, 50] },
  { id: "pollster", name: "Pollster", description: "Vote in live polls", icon: "vote", metric: "pollsVoted", tiers: [1, 10, 30] },
  { id: "oracle", name: "Oracle", description: "Call the winner of esports matches", icon: "crystal", metric: "correctPredictions", tiers: [1, 5, 15] },
  { id: "bracketeer", name: "Bracketeer", description: "Make match predictions", icon: "target", metric: "predictionsMade", tiers: [1, 8, 25] },
  { id: "patron", name: "Patron of the Arts", description: "Vote for acts in talent hunts", icon: "music", metric: "actsVoted", tiers: [1, 6, 20] },
  { id: "campfire", name: "Campfire Talker", description: "Chat with your house during shows", icon: "chat", metric: "chatsSent", tiers: [5, 40, 150] },
  { id: "wanderer", name: "Forest Wanderer", description: "Join events hosted by other houses", icon: "compass", metric: "crossHouseEvents", tiers: [1, 3, 8] },
  { id: "podium", name: "On the Podium", description: "Finish in the top three", icon: "crown", metric: "podiums", tiers: [1, 3, 6] },
  { id: "archivist", name: "Archivist", description: "Earn verified certificates", icon: "scroll", metric: "certificates", tiers: [1, 5, 12] },
];

/** XP per unit of activity. Podiums and showing up are worth the most. */
export const XP_WEIGHTS: Record<keyof Activity, number> = {
  questionsAsked: 15,
  upvotesGiven: 2,
  upvotesReceived: 3,
  pollsVoted: 5,
  predictionsMade: 4,
  correctPredictions: 12,
  actsVoted: 5,
  chatsSent: 1,
  eventsAttended: 30,
  podiums: 120,
  certificates: 25,
  crossHouseEvents: 40,
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: IconKey;
  /** Highest tier reached, or null if still locked. */
  tier: Tier | null;
  value: number;
  /** Threshold of the next tier (or the gold threshold once maxed). */
  next: number;
  /** 0–1 progress toward `next`. */
  progress: number;
};

const TIER_NAMES: Tier[] = ["bronze", "silver", "gold"];

export function evaluateBadges(a: Activity): Badge[] {
  return BADGES.map((b) => {
    const value = Math.max(0, a[b.metric]);
    let reached = -1;
    b.tiers.forEach((t, i) => {
      if (value >= t) reached = i;
    });
    const next = b.tiers[Math.min(reached + 1, 2)];
    const prev = reached >= 0 ? b.tiers[reached] : 0;
    const progress = reached === 2 ? 1 : Math.min(1, (value - prev) / Math.max(1, next - prev));
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      tier: reached >= 0 ? TIER_NAMES[reached] : null,
      value,
      next,
      progress: Math.max(0, progress),
    };
  });
}

export function xpFor(a: Activity): number {
  return (Object.keys(XP_WEIGHTS) as (keyof Activity)[]).reduce((sum, k) => sum + Math.max(0, a[k]) * XP_WEIGHTS[k], 0);
}

/** Total XP needed to *reach* level n (level 1 is free). */
export const xpForLevel = (n: number) => (n <= 1 ? 0 : Math.round(100 * Math.pow(n - 1, 1.5)));

export type Level = { level: number; xp: number; floor: number; ceiling: number; progress: number; title: string };

const TITLES = ["Seedling", "Sapling", "Forager", "Trailblazer", "Ranger", "Canopy Keeper", "Elder Oak", "Forest Legend"];

export function levelFor(xp: number): Level {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return {
    level,
    xp,
    floor,
    ceiling,
    progress: (xp - floor) / (ceiling - floor),
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
  };
}

/* ───────────────────────── Quests ───────────────────────── */

export type QuestDef = {
  id: string;
  title: string;
  hint: string;
  metric: keyof Activity;
  target: number;
  xp: number;
  /** Quests unlock after their parents are complete (constellation edges). */
  requires: string[];
  /** Which kind of live event helps complete it, for the deep link. */
  eventKind?: "talk" | "esports" | "cultural" | "hackathon";
  /** Layout position in the constellation (0–100 viewBox units). */
  x: number;
  y: number;
};

export const QUESTS: QuestDef[] = [
  { id: "arrive", title: "Find your seat", hint: "Join any live event and interact once.", metric: "eventsAttended", target: 1, xp: 30, requires: [], x: 50, y: 84 },
  { id: "first-question", title: "Ask your first question", hint: "Open the Q&A tab in a live guest session and ask the speaker something.", metric: "questionsAsked", target: 1, xp: 15, requires: ["arrive"], eventKind: "talk", x: 24, y: 70 },
  { id: "first-poll", title: "Cast a vote", hint: "Vote in a live poll. It takes one tap.", metric: "pollsVoted", target: 1, xp: 5, requires: ["arrive"], eventKind: "talk", x: 50, y: 66 },
  { id: "first-pick", title: "Make a call", hint: "Predict the winner of a ready esports match before it goes live.", metric: "predictionsMade", target: 1, xp: 4, requires: ["arrive"], eventKind: "esports", x: 76, y: 70 },
  { id: "upvoter", title: "Lift five voices", hint: "Upvote five questions you want answered.", metric: "upvotesGiven", target: 5, xp: 10, requires: ["first-question"], eventKind: "talk", x: 12, y: 46 },
  { id: "poll-five", title: "Vote in five polls", hint: "Polls pop up during shows. Keep an eye on the Polls tab.", metric: "pollsVoted", target: 5, xp: 25, requires: ["first-poll"], eventKind: "talk", x: 38, y: 44 },
  { id: "patron", title: "Back a performer", hint: "Vote for your favourite act in a talent hunt.", metric: "actsVoted", target: 1, xp: 5, requires: ["first-poll"], eventKind: "cultural", x: 62, y: 44 },
  { id: "predict-three", title: "Predict three matches", hint: "Call three esports matches. Correct calls earn extra XP.", metric: "predictionsMade", target: 3, xp: 12, requires: ["first-pick"], eventKind: "esports", x: 88, y: 46 },
  { id: "wanderer", title: "Cross the river", hint: "Attend an event hosted by another house.", metric: "crossHouseEvents", target: 1, xp: 40, requires: ["upvoter", "poll-five"], x: 26, y: 22 },
  { id: "oracle", title: "Read the future", hint: "Get a prediction right.", metric: "correctPredictions", target: 1, xp: 12, requires: ["predict-three"], eventKind: "esports", x: 76, y: 22 },
  { id: "certified", title: "Earn a certificate", hint: "Take part until an event wraps. Certificates arrive automatically.", metric: "certificates", target: 1, xp: 25, requires: ["patron", "wanderer"], x: 50, y: 18 },
  { id: "podium", title: "Reach the podium", hint: "Compete in a bracket, quiz or talent hunt and finish in the top three.", metric: "podiums", target: 1, xp: 120, requires: ["certified", "oracle"], x: 50, y: 4 },
];

export type QuestState = "done" | "available" | "locked";
export type Quest = QuestDef & { state: QuestState; value: number; progress: number };

export function evaluateQuests(a: Activity): Quest[] {
  const done = new Set(QUESTS.filter((q) => a[q.metric] >= q.target).map((q) => q.id));
  return QUESTS.map((q) => {
    const value = Math.max(0, a[q.metric]);
    const state: QuestState = done.has(q.id) ? "done" : q.requires.every((r) => done.has(r)) ? "available" : "locked";
    return { ...q, state, value, progress: Math.min(1, value / q.target) };
  });
}

/* ───────────────────────── Profile summary ───────────────────────── */

export type Odyssey = { xp: number; level: Level; badges: Badge[]; quests: Quest[]; earned: number };

export function summarize(a: Activity): Odyssey {
  const xp = xpFor(a);
  const badges = evaluateBadges(a);
  return { xp, level: levelFor(xp), badges, quests: evaluateQuests(a), earned: badges.filter((b) => b.tier).length };
}
