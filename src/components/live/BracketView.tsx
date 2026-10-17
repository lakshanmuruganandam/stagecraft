"use client";

import { useState } from "react";
import { Crown, Radio, Trophy } from "lucide-react";
import { useLive } from "./LiveProvider";
import { Badge, Button } from "@/components/ui/primitives";
import { podium, roundName, type BMatch } from "@/lib/bracket";
import type { BracketDTO } from "@/lib/types";

export function BracketsPanel() {
  const { state } = useLive();
  if (!state.brackets.length) return <p className="p-8 text-center text-sm text-ink-400">No bracket for this event.</p>;
  return (
    <div className="space-y-8">
      {state.brackets.map((b) => (
        <BracketView key={b.id} bracket={b} />
      ))}
    </div>
  );
}

export function BracketView({ bracket }: { bracket: BracketDTO }) {
  const main = bracket.matches.filter((m) => m.lane === "main");
  const rounds = Math.max(...main.map((m) => m.round));
  const bronze = bracket.matches.find((m) => m.lane === "third");
  const pod = podium(bracket.matches);
  const champ = bracket.entrants.find((e) => e.id === pod.first);
  const { houseColor } = useLive();

  return (
    <section aria-label={bracket.title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">
            {bracket.game ?? "Bracket"} · best of {bracket.bestOf} · {bracket.entrants.length} teams
          </p>
          <h3 className="font-display text-xl font-semibold text-white">{bracket.title}</h3>
        </div>
        {champ && (
          <div className="flex items-center gap-2 rounded-full border border-spot-500/40 bg-spot-500/10 px-4 py-1.5 text-sm text-spot-300">
            <Crown size={16} className="text-spot-400" /> Champions: <strong style={{ color: houseColor(champ.houseId) }}>{champ.name}</strong>
          </div>
        )}
      </div>
      <div className="scrollbar-thin -mx-1 overflow-x-auto pb-3">
        <div className="flex min-w-max gap-6 px-1">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
            <div key={r} className="flex w-60 flex-col">
              <p className="eyebrow mb-3">{roundName(r, rounds)}</p>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {main
                  .filter((m) => m.round === r)
                  .sort((a, b) => a.slot - b.slot)
                  .map((m) => (
                    <MatchCard key={m.id} match={m} bracket={bracket} connector={r < rounds} />
                  ))}
              </div>
            </div>
          ))}
          {bronze && (
            <div className="flex w-60 flex-col justify-end">
              <p className="eyebrow mb-3">Bronze match</p>
              <MatchCard match={bronze} bracket={bracket} connector={false} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MatchCard({ match: m, bracket, connector }: { match: BMatch; bracket: BracketDTO; connector: boolean }) {
  const { state, run, patchMe, houseColor } = useLive();
  const [edit, setEdit] = useState(false);
  const [a, setA] = useState(String(m.scoreA ?? 0));
  const [b, setB] = useState(String(m.scoreB ?? 0));
  const ent = (id: string | null) => bracket.entrants.find((e) => e.id === id);
  const picks = bracket.picks[m.id] ?? {};
  const totalPicks = Object.values(picks).reduce((x, y) => x + y, 0);
  const myPick = state.me?.predictions[m.id];
  const bye = m.status === "done" && (!m.aId || !m.bId);

  async function predict(pickId: string) {
    patchMe((me) => ({ ...me, predictions: { ...me.predictions, [m.id]: pickId } }));
    await run("match.predict", { matchId: m.id, pickId });
  }

  const side = (id: string | null, score: number | null) => {
    const e = ent(id);
    const won = m.winnerId && m.winnerId === id;
    const lost = m.winnerId && id && m.winnerId !== id;
    const pct = totalPicks && id ? Math.round(((picks[id] ?? 0) / totalPicks) * 100) : null;
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${lost ? "opacity-45" : ""}`}>
        <span className="h-5 w-1 rounded-full" style={{ background: e ? houseColor(e.houseId) : "transparent" }} />
        <span className="timecode w-4 text-[0.65rem] text-ink-500">{e?.seed ?? ""}</span>
        <span className={`min-w-0 flex-1 truncate text-sm ${won ? "font-semibold text-white" : "text-ink-200"}`}>{e?.name ?? (bye ? "bye" : "TBD")}</span>
        {pct !== null && m.status !== "done" && <span className="timecode text-[0.65rem] text-ink-400">{pct}%</span>}
        <span className={`timecode w-5 text-right text-sm ${won ? "text-spot-300" : "text-ink-400"}`}>{score ?? (m.status === "done" ? "" : "–")}</span>
        {won && <Trophy size={12} className="text-spot-400" />}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className={`overflow-hidden rounded-xl border bg-ink-900 ${m.status === "live" ? "border-onair/60 shadow-[0_0_0_3px_rgb(255_59_59/0.12)]" : "border-white/8"}`}>
        {m.status === "live" && (
          <div className="flex items-center gap-1.5 bg-onair/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[#ff8a8a]">
            <span className="size-1.5 animate-tally rounded-full bg-onair" /> Live now
          </div>
        )}
        {side(m.aId, m.scoreA)}
        <div className="h-px bg-white/6" />
        {side(m.bId, m.scoreB)}
        {m.status === "ready" && state.me && !state.canManage && m.aId && m.bId && (
          <div className="grid grid-cols-2 gap-px border-t border-white/6 bg-white/6">
            {[m.aId, m.bId].map((id) => (
              <button key={id} onClick={() => predict(id!)} aria-pressed={myPick === id} className={`px-2 py-1.5 text-[0.7rem] transition ${myPick === id ? "bg-spot-500/20 text-spot-300" : "bg-ink-900 text-ink-300 hover:text-white"}`}>
                {myPick === id ? "✓ Your pick" : `Pick ${ent(id)?.name.split(" ")[0]}`}
              </button>
            ))}
          </div>
        )}
        {state.canManage && m.aId && m.bId && (
          <div className="border-t border-white/6 p-2">
            {edit ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await run("match.report", { matchId: m.id, scoreA: Number(a), scoreB: Number(b) });
                  if (ok) setEdit(false);
                }}
              >
                <input aria-label="Score A" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} className="h-7 w-10 rounded-md border border-white/10 bg-ink-850 text-center text-sm" />
                <span className="text-ink-500">:</span>
                <input aria-label="Score B" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value)} className="h-7 w-10 rounded-md border border-white/10 bg-ink-850 text-center text-sm" />
                <Button size="sm" className="ml-auto h-7">
                  Save
                </Button>
              </form>
            ) : (
              <div className="flex gap-1.5">
                <Button size="sm" variant="subtle" className="h-7 flex-1" onClick={() => setEdit(true)}>
                  {m.winnerId ? "Correct score" : "Report score"}
                </Button>
                {m.status === "ready" && (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => run("match.live", { matchId: m.id, live: true })}>
                    <Radio size={12} /> Live
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {connector && <span aria-hidden className="absolute -right-6 top-1/2 h-px w-6 bg-white/12" />}
      {m.status === "ready" && totalPicks > 0 && (
        <Badge className="absolute -top-2 right-2" tone="muted">
          {totalPicks} picks
        </Badge>
      )}
    </div>
  );
}
