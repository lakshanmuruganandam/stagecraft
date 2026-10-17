/**
 * Talent-hunt scoring (pure, unit-tested).
 *
 * final = w · judge% + (1 − w) · audience%
 *   judge%    = mean judge score / 10
 *   audience% = votes / max votes for any act  (so the crowd favourite
 *               gets the full audience share, regardless of turnout)
 */

export type ActInput = { id: string; votes: number; judgeScores: number[] };
export type Standing = {
  id: string;
  votes: number;
  judgeAvg: number | null;
  audiencePct: number;
  judgePct: number;
  total: number;
  rank: number;
};

export function standings(acts: ActInput[], judgeWeight: number): Standing[] {
  const w = Math.min(100, Math.max(0, judgeWeight)) / 100;
  const maxVotes = Math.max(0, ...acts.map((a) => a.votes));
  const anyJudged = acts.some((a) => a.judgeScores.length > 0);
  // With no judge scores yet, the crowd decides alone rather than everyone sitting at 0.
  const effW = anyJudged ? w : 0;

  const rows = acts.map((a) => {
    const judgeAvg = a.judgeScores.length ? a.judgeScores.reduce((s, x) => s + x, 0) / a.judgeScores.length : null;
    const judgePct = judgeAvg === null ? 0 : (judgeAvg / 10) * 100;
    const audiencePct = maxVotes === 0 ? 0 : (a.votes / maxVotes) * 100;
    const total = effW * judgePct + (1 - effW) * audiencePct;
    return { id: a.id, votes: a.votes, judgeAvg, judgePct, audiencePct, total: Math.round(total * 10) / 10, rank: 0 };
  });

  rows.sort((a, b) => b.total - a.total || b.votes - a.votes);
  // Competition ranking: ties share a rank (1, 2, 2, 4).
  rows.forEach((r, i) => {
    r.rank = i > 0 && r.total === rows[i - 1].total && r.votes === rows[i - 1].votes ? rows[i - 1].rank : i + 1;
  });
  return rows;
}
