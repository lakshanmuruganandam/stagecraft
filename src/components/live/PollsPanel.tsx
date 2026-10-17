"use client";

import { Check, Lock, Play, Square, Timer, Trash2 } from "lucide-react";
import { useLive } from "./LiveProvider";
import { useNow } from "./useNow";
import { SignInPrompt } from "./ChatPanel";
import { Badge, Button } from "@/components/ui/primitives";
import type { PollDTO } from "@/lib/types";

export function PollsPanel({ compact = false }: { compact?: boolean }) {
  const { state } = useLive();
  const polls = state.polls.slice().sort((a, b) => rank(a) - rank(b) || (b.openedAt ?? 0) - (a.openedAt ?? 0));
  if (!polls.length) return <p className="p-8 text-center text-sm text-ink-400">No polls yet. They pop up here the moment the host launches one.</p>;
  return (
    <div className={`space-y-3 ${compact ? "" : "p-3"}`}>
      {polls.map((p) => (
        <PollCard key={p.id} poll={p} />
      ))}
    </div>
  );
}

const rank = (p: PollDTO) => (p.status === "open" ? 0 : p.status === "draft" ? 1 : 2);

export function PollCard({ poll, big = false }: { poll: PollDTO; big?: boolean }) {
  const { state, run, patchMe } = useLive();
  const now = useNow();
  const mine = state.me?.pollVotes[poll.id];
  const expired = !!poll.closesAt && now > 0 && now > poll.closesAt;
  const open = poll.status === "open" && !expired;
  const showBars = poll.tallies && (mine !== undefined || !open || state.canManage || big);
  const left = poll.closesAt && open && now ? Math.max(0, Math.ceil((poll.closesAt - now) / 1000)) : null;

  async function vote(i: number) {
    const prev = mine;
    patchMe((me) => ({ ...me, pollVotes: { ...me.pollVotes, [poll.id]: i } }));
    const ok = await run("poll.vote", { pollId: poll.id, option: i });
    if (!ok) patchMe((me) => ({ ...me, pollVotes: prev === undefined ? Object.fromEntries(Object.entries(me.pollVotes).filter(([k]) => k !== poll.id)) : { ...me.pollVotes, [poll.id]: prev } }));
  }

  return (
    <article className={`rounded-2xl border p-4 ${open ? "border-spot-500/30 bg-spot-500/5" : "border-white/7 bg-white/2"}`} aria-label={`Poll: ${poll.question}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <h3 className={`font-display font-semibold leading-snug text-white ${big ? "text-3xl" : "text-[0.98rem]"}`}>{poll.question}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {left !== null && (
            <Badge tone="spot">
              <Timer size={11} /> {left}s
            </Badge>
          )}
          {poll.status === "draft" ? <Badge tone="muted">Draft</Badge> : open ? <Badge tone="live">Live</Badge> : <Badge tone="muted">Closed</Badge>}
        </div>
      </header>
      <ul className={`grid ${big ? "gap-3" : "gap-2"}`}>
        {poll.options.map((opt, i) => {
          const n = poll.tallies?.[i] ?? 0;
          const pct = poll.total ? Math.round((n / poll.total) * 100) : 0;
          const chosen = mine === i;
          const correct = poll.correctIndex === i && !open;
          return (
            <li key={i}>
              <button
                disabled={!open || !state.me}
                onClick={() => vote(i)}
                aria-pressed={chosen}
                className={`relative w-full overflow-hidden rounded-xl border text-left transition ${big ? "px-5 py-4 text-xl" : "px-3.5 py-2.5 text-sm"} ${chosen ? "border-spot-500/60" : correct ? "border-ok/60" : "border-white/10"} ${open && state.me ? "hover:border-white/30" : "cursor-default"}`}
              >
                {showBars && (
                  <span aria-hidden className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${chosen ? "bg-spot-500/25" : correct ? "bg-ok/20" : "bg-white/7"}`} style={{ width: `${pct}%` }} />
                )}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-ink-100">
                    {chosen && <Check size={big ? 20 : 14} className="text-spot-400" />}
                    {opt}
                    {correct && <Badge tone="ok">Answer</Badge>}
                  </span>
                  {showBars && <span className="timecode text-ink-200">{pct}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
        <span className="timecode">
          {poll.total} vote{poll.total === 1 ? "" : "s"}
          {!poll.tallies && open && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Lock size={11} /> results revealed at close
            </span>
          )}
        </span>
        {!state.me && open && !big && <SignInPrompt what="vote" />}
        {state.canManage && !big && (
          <span className="flex gap-1.5">
            {poll.status !== "open" || expired ? (
              <Button size="sm" variant="subtle" onClick={() => run("poll.status", { pollId: poll.id, status: "open", durationSec: 60 })}>
                <Play size={13} /> {poll.status === "draft" ? "Launch · 60s" : "Reopen"}
              </Button>
            ) : (
              <Button size="sm" variant="subtle" onClick={() => run("poll.status", { pollId: poll.id, status: "closed" })}>
                <Square size={12} /> Close
              </Button>
            )}
            <Button size="sm" variant="ghost" aria-label="Delete poll" onClick={() => run("poll.delete", { pollId: poll.id })}>
              <Trash2 size={13} />
            </Button>
          </span>
        )}
      </footer>
    </article>
  );
}
