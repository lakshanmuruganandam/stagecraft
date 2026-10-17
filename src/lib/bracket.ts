/**
 * Single-elimination bracket engine (pure, unit-tested).
 *
 * - Standard seeding (1v16, 8v9, …) so top seeds can only meet late.
 * - Byes go to the top seeds and auto-advance.
 * - Optional bronze match fed by the semi-final losers.
 * - Correcting a result re-routes the winner, but refuses if the match it
 *   fed has already been played (no silent history rewrites).
 */

export type Lane = "main" | "third";
export type MatchStatus = "pending" | "ready" | "live" | "done";

export type BMatch = {
  id: string;
  round: number; // 1-based
  slot: number; // 0-based within round
  lane: Lane;
  aId: string | null;
  bId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: MatchStatus;
};

export const nextPow2 = (n: number) => {
  let p = 2;
  while (p < n) p *= 2;
  return p;
};

/** Seed numbers in bracket-line order, e.g. size 8 → [1,8,4,5,2,7,3,6]. */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const m = order.length * 2 + 1;
    order = order.flatMap((s) => [s, m - s]);
  }
  return order;
}

export const roundCount = (size: number) => Math.log2(size);

export function roundName(round: number, rounds: number, lane: Lane = "main") {
  if (lane === "third") return "Bronze match";
  const fromEnd = rounds - round;
  if (fromEnd === 0) return "Grand final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round of ${2 ** (fromEnd + 1)}`;
}

function statusOf(m: BMatch): MatchStatus {
  if (m.winnerId) return "done";
  if (m.status === "live" && m.aId && m.bId) return "live";
  return m.aId && m.bId ? "ready" : "pending";
}

/**
 * Builds every match for a bracket. `ids` lets callers supply stable ids
 * (the DB layer passes nanoid); entrants must be sorted by seed.
 */
export function buildBracket(
  entrantIds: string[],
  opts: { thirdPlace?: boolean; makeId?: () => string } = {},
): BMatch[] {
  if (entrantIds.length < 2) throw new Error("A bracket needs at least 2 entrants");
  let counter = 0;
  const makeId = opts.makeId ?? (() => `m${++counter}`);
  const size = nextPow2(entrantIds.length);
  const rounds = roundCount(size);
  const order = seedOrder(size);
  const matches: BMatch[] = [];

  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let s = 0; s < count; s++) {
      const m: BMatch = { id: makeId(), round: r, slot: s, lane: "main", aId: null, bId: null, scoreA: null, scoreB: null, winnerId: null, status: "pending" };
      if (r === 1) {
        m.aId = entrantIds[order[2 * s] - 1] ?? null;
        m.bId = entrantIds[order[2 * s + 1] - 1] ?? null;
      }
      matches.push(m);
    }
  }
  if (opts.thirdPlace && rounds >= 2) {
    matches.push({ id: makeId(), round: rounds, slot: 0, lane: "third", aId: null, bId: null, scoreA: null, scoreB: null, winnerId: null, status: "pending" });
  }

  // Resolve byes in round one.
  for (const m of matches.filter((x) => x.round === 1)) {
    if (m.aId && !m.bId) settle(matches, m, m.aId, rounds);
    else if (!m.aId && m.bId) settle(matches, m, m.bId, rounds);
  }
  for (const m of matches) m.status = statusOf(m);
  return matches;
}

const find = (ms: BMatch[], lane: Lane, round: number, slot: number) =>
  ms.find((m) => m.lane === lane && m.round === round && m.slot === slot);

function feeds(ms: BMatch[], m: BMatch, rounds: number) {
  if (m.lane === "third" || m.round === rounds) return { next: undefined, bronze: undefined };
  const side = m.slot % 2 === 0 ? ("aId" as const) : ("bId" as const);
  return {
    next: { match: find(ms, "main", m.round + 1, Math.floor(m.slot / 2))!, side },
    bronze: m.round === rounds - 1 ? (() => {
      const b = find(ms, "third", rounds, 0);
      return b ? { match: b, side } : undefined;
    })() : undefined,
  };
}

function settle(ms: BMatch[], m: BMatch, winnerId: string, rounds: number) {
  m.winnerId = winnerId;
  m.status = "done";
  const loserId = m.aId === winnerId ? m.bId : m.aId;
  const { next, bronze } = feeds(ms, m, rounds);
  if (next) {
    next.match[next.side] = winnerId;
    next.match.status = statusOf(next.match);
  }
  if (bronze && loserId) {
    bronze.match[bronze.side] = loserId;
    bronze.match.status = statusOf(bronze.match);
  }
}

export class BracketError extends Error {}

/** Records a score. Returns the full, updated match list (new objects). */
export function reportResult(input: BMatch[], matchId: string, scoreA: number, scoreB: number): BMatch[] {
  const ms = input.map((m) => ({ ...m }));
  const m = ms.find((x) => x.id === matchId);
  if (!m) throw new BracketError("Match not found");
  if (!m.aId || !m.bId) throw new BracketError("Both sides must be decided first");
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0)
    throw new BracketError("Scores must be non-negative integers");
  if (scoreA === scoreB) throw new BracketError("Elimination matches can't end in a draw");

  const rounds = Math.max(...ms.filter((x) => x.lane === "main").map((x) => x.round));
  const winnerId = scoreA > scoreB ? m.aId : m.bId;

  if (m.winnerId && m.winnerId !== winnerId) {
    // Correction: the downstream matches must not have been played yet.
    const { next, bronze } = feeds(ms, m, rounds);
    for (const f of [next, bronze]) {
      if (f && f.match.winnerId) throw new BracketError("A later match already used this result. Reset it first.");
    }
    if (next) next.match[next.side] = null;
    if (bronze) bronze.match[bronze.side] = null;
  }
  m.scoreA = scoreA;
  m.scoreB = scoreB;
  settle(ms, m, winnerId, rounds);
  for (const x of ms) x.status = statusOf(x);
  return ms;
}

export function setLive(input: BMatch[], matchId: string, live: boolean): BMatch[] {
  return input.map((m) => {
    if (m.id !== matchId) return m;
    if (live && m.status !== "ready") throw new BracketError("Only a ready match can go live");
    return { ...m, status: live ? "live" : statusOf({ ...m, status: "ready" }) };
  });
}

export type Podium = { first: string | null; second: string | null; third: string[] };

export function podium(ms: BMatch[]): Podium {
  const main = ms.filter((m) => m.lane === "main");
  const rounds = Math.max(...main.map((m) => m.round));
  const final = find(ms, "main", rounds, 0);
  const bronze = find(ms, "third", rounds, 0);
  const first = final?.winnerId ?? null;
  const second = first ? (final!.aId === first ? final!.bId : final!.aId) : null;
  let third: string[] = [];
  if (bronze?.winnerId) third = [bronze.winnerId];
  else if (!bronze && rounds >= 2) {
    third = main
      .filter((m) => m.round === rounds - 1 && m.winnerId)
      .map((m) => (m.aId === m.winnerId ? m.bId : m.aId))
      .filter((x): x is string => !!x);
  }
  return { first, second, third };
}
