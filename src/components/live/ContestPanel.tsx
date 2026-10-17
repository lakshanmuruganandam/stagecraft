"use client";

import { Crown, Heart, Lock, Medal } from "lucide-react";
import { useState } from "react";
import { useLive } from "./LiveProvider";
import { SignInPrompt } from "./ChatPanel";
import { Badge, Button } from "@/components/ui/primitives";
import type { ContestDTO } from "@/lib/types";

export function ContestsPanel() {
  const { state } = useLive();
  if (!state.contests.length) return <p className="p-8 text-center text-sm text-ink-400">No audience vote for this event.</p>;
  return (
    <div className="space-y-6">
      {state.contests.map((c) => (
        <ContestView key={c.id} contest={c} />
      ))}
    </div>
  );
}

const STATUS_COPY = { draft: "Not open yet", open: "Voting open", closed: "Voting closed · results soon", revealed: "Results" } as const;

export function ContestView({ contest: c }: { contest: ContestDTO }) {
  const { state, run, patchMe, houseColor, houseName } = useLive();
  const mine = new Set(state.me?.actVotes ?? []);
  const myCount = c.acts.filter((a) => mine.has(a.id)).length;
  const ranked = c.standings ? c.standings.map((s) => ({ s, act: c.acts.find((a) => a.id === s.id)! })) : null;

  async function vote(actId: string) {
    const had = mine.has(actId);
    patchMe((me) => ({ ...me, actVotes: had ? me.actVotes.filter((x) => x !== actId) : [...me.actVotes, actId] }));
    const r = await run("contest.vote", { contestId: c.id, actId });
    if (!r) patchMe((me) => ({ ...me, actVotes: had ? [...me.actVotes, actId] : me.actVotes.filter((x) => x !== actId) }));
  }

  return (
    <section aria-label={c.title}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {STATUS_COPY[c.status]} · judges {c.judgeWeight}% / audience {100 - c.judgeWeight}%
          </p>
          <h3 className="font-display text-xl font-semibold text-white">{c.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="muted" className="timecode">
            {c.totalVotes} votes
          </Badge>
          {c.status === "open" && state.me && (
            <Badge tone="spot">
              {c.votesPerUser - myCount} of {c.votesPerUser} votes left
            </Badge>
          )}
        </div>
      </div>

      {state.canManage && <ContestAdmin contest={c} />}

      {ranked && state.canManage && c.status !== "revealed" && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-400">
          <Lock size={12} /> Organizer preview. The audience sees this only after the reveal.
        </p>
      )}

      {ranked && (c.status === "revealed" || state.canManage) ? (
        <ol className="space-y-2">
          {ranked.map(({ s, act }) => (
            <li key={act.id} className={`relative overflow-hidden rounded-xl border p-3.5 ${s.rank === 1 && c.status === "revealed" ? "border-spot-500/50 bg-spot-500/8" : "border-white/7 bg-white/2"}`}>
              <span aria-hidden className="absolute inset-y-0 left-0 bg-white/5 transition-[width] duration-700" style={{ width: `${s.total}%` }} />
              <div className="relative flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center">
                  {s.rank === 1 ? <Crown className="text-spot-400" size={20} /> : s.rank <= 3 ? <Medal className="text-ink-300" size={18} /> : <span className="timecode text-ink-400">{s.rank}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{act.title}</p>
                  <p className="text-xs" style={{ color: houseColor(act.houseId) }}>
                    {act.performer} · {houseName(act.houseId)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="timecode text-lg font-semibold text-white">{s.total.toFixed(1)}</p>
                  <p className="timecode text-[0.65rem] text-ink-400">
                    {s.votes} votes · judges {s.judgeAvg?.toFixed(1) ?? "–"}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {c.acts.map((a) => {
            const voted = mine.has(a.id);
            return (
              <li key={a.id} className={`flex flex-col rounded-2xl border p-4 transition ${voted ? "border-spot-500/50 bg-spot-500/8" : "border-white/8 bg-white/2"}`}>
                <span className="mb-3 h-1 w-10 rounded-full" style={{ background: houseColor(a.houseId) }} />
                <p className="font-display text-[1.02rem] font-semibold leading-snug text-white">{a.title}</p>
                <p className="mt-1 text-sm text-ink-300">
                  {a.performer} · <span style={{ color: houseColor(a.houseId) }}>{houseName(a.houseId)}</span>
                </p>
                {c.status === "open" && state.me && (
                  <Button size="sm" variant={voted ? "primary" : "outline"} className="mt-4 self-start" aria-pressed={voted} onClick={() => vote(a.id)}>
                    <Heart size={14} fill={voted ? "currentColor" : "none"} /> {voted ? "Voted" : "Vote"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {c.status === "open" && !state.me && (
        <div className="mt-4">
          <SignInPrompt what="vote for your favourite act" />
        </div>
      )}
    </section>
  );
}

function ContestAdmin({ contest: c }: { contest: ContestDTO }) {
  const { run } = useLive();
  const [scores, setScores] = useState<Record<string, string>>({});
  const next = { draft: "open", open: "closed", closed: "revealed", revealed: "open" } as const;
  const label = { draft: "Open voting", open: "Close voting", closed: "Reveal results", revealed: "Re-open voting" } as const;
  return (
    <div className="mb-4 rounded-xl border border-white/8 bg-ink-900/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-200">
        <span>Organizer tools: judging and reveal</span>
        <Button size="sm" onClick={() => run("contest.status", { contestId: c.id, status: next[c.status] })}>
          {label[c.status]}
        </Button>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-ink-400">Enter judge scores</summary>
        <div className="mt-3 grid gap-2">
          {c.acts.map((a) => (
            <form
              key={a.id}
              className="flex items-center gap-2 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                run("contest.judge", { actId: a.id, score: Number(scores[a.id]) });
              }}
            >
              <span className="min-w-0 flex-1 truncate text-ink-200">
                {a.performer}: {a.title}
              </span>
              <input
                aria-label={`Judge score for ${a.performer}`}
                type="number"
                min={0}
                max={10}
                step={0.1}
                placeholder="0–10"
                value={scores[a.id] ?? ""}
                onChange={(e) => setScores({ ...scores, [a.id]: e.target.value })}
                className="h-8 w-20 rounded-lg border border-white/10 bg-ink-850 px-2 text-center"
              />
              <Button size="sm" variant="subtle" disabled={!scores[a.id]}>
                Score
              </Button>
            </form>
          ))}
        </div>
      </details>
    </div>
  );
}
