"use client";

import { QRCodeSVG } from "./qr";
import { useLive } from "@/components/live/LiveProvider";
import { useClientValue } from "@/components/live/useNow";
import { PollCard } from "@/components/live/PollsPanel";
import { BracketView } from "@/components/live/BracketView";
import { Logo } from "@/components/site/Logo";
import type { StageScene } from "@/lib/types";

export function StageView({ transparent }: { transparent: boolean }) {
  const { state, reactions, houseColor, houseName } = useLive();
  const origin = useClientValue(() => location.origin);
  const e = state.event;

  const openPoll = state.polls.find((p) => p.status === "open") ?? state.polls.find((p) => p.status === "closed");
  const spot = state.questions.find((q) => q.id === e.spotlightQuestionId);
  const liveContest = state.contests.find((c) => c.status === "open" || c.status === "revealed");
  const bracket = state.brackets[0];

  // "auto" picks the most relevant thing happening right now.
  const scene: StageScene =
    e.stageScene !== "auto"
      ? e.stageScene
      : spot
        ? "question"
        : state.polls.some((p) => p.status === "open")
          ? "poll"
          : liveContest
            ? "contest"
            : bracket
              ? "bracket"
              : "lower-third";

  return (
    <div className={`stage-root fixed inset-0 z-[70] overflow-hidden ${transparent ? "transparent" : "bg-[radial-gradient(120%_80%_at_50%_0%,hsl(var(--h)_60%_22%),#050507_70%)]"}`} style={{ ["--h" as string]: e.hue }}>
      {!transparent && (
        <div className="absolute left-10 top-8 flex items-center gap-3">
          <Logo size={34} />
          <div>
            <p className="font-display text-xl font-semibold text-white">{e.title}</p>
            <p className="eyebrow">{e.status === "live" ? "● Live" : e.status}</p>
          </div>
        </div>
      )}

      <div className="absolute inset-x-[6vw] top-[16vh] bottom-[18vh] flex items-center justify-center">
        <div key={scene} className="w-full animate-rise">
          {scene === "question" && spot && (
            <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-ink-950/80 p-[3vw] shadow-2xl backdrop-blur">
              <p className="eyebrow mb-4 text-spot-300">Audience question · {spot.votes} upvotes</p>
              <p className="font-display text-[3.4vw] font-semibold leading-tight text-white">“{spot.body}”</p>
              <p className="mt-6 text-[1.4vw]" style={{ color: houseColor(spot.author?.houseId) }}>
                — {spot.author ? `${spot.author.name}, ${houseName(spot.author.houseId)}` : "Anonymous"}
              </p>
            </div>
          )}
          {scene === "poll" && openPoll && (
            <div className="mx-auto max-w-4xl rounded-3xl bg-ink-950/85 p-[2.4vw] backdrop-blur">
              <PollCard poll={openPoll} big />
            </div>
          )}
          {scene === "contest" && liveContest && (
            <div className="mx-auto max-w-5xl rounded-3xl bg-ink-950/85 p-[2.4vw] backdrop-blur">
              <p className="eyebrow mb-2">{liveContest.status === "revealed" ? "Final results" : "Vote now"}</p>
              <p className="mb-6 font-display text-[2.6vw] font-semibold text-white">{liveContest.title}</p>
              {liveContest.standings ? (
                <ol className="space-y-3">
                  {liveContest.standings.slice(0, 5).map((s) => {
                    const act = liveContest.acts.find((a) => a.id === s.id)!;
                    return (
                      <li key={s.id} className="relative overflow-hidden rounded-2xl bg-white/5 px-6 py-4">
                        <span className="absolute inset-y-0 left-0 transition-[width] duration-1000" style={{ width: `${s.total}%`, background: `${houseColor(act.houseId)}40` }} />
                        <span className="relative flex items-center justify-between text-[1.5vw] text-white">
                          <span>
                            <span className="timecode mr-4 text-ink-400">#{s.rank}</span>
                            {act.title} · <span style={{ color: houseColor(act.houseId) }}>{act.performer}</span>
                          </span>
                          <span className="timecode">{s.total.toFixed(1)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {liveContest.acts.map((a, i) => (
                    <div key={a.id} className="rounded-2xl bg-white/5 px-5 py-4 text-[1.3vw] text-white">
                      <span className="timecode mr-3 text-spot-400">{String(i + 1).padStart(2, "0")}</span>
                      {a.title}
                      <span className="block text-[1vw]" style={{ color: houseColor(a.houseId) }}>
                        {a.performer}
                      </span>
                    </div>
                  ))}
                  <p className="timecode col-span-2 mt-2 text-[1.1vw] text-ink-300">{liveContest.totalVotes} votes so far · results sealed until the reveal</p>
                </div>
              )}
            </div>
          )}
          {scene === "bracket" && bracket && (
            <div className="mx-auto max-w-[90vw] rounded-3xl bg-ink-950/85 p-[2vw] backdrop-blur [&_.w-60]:w-[17vw]">
              <BracketView bracket={bracket} />
            </div>
          )}
        </div>
      </div>

      {/* Lower third */}
      {e.lowerThird && scene !== "blank" && (
        <div className="absolute bottom-[6vh] left-[6vw] flex animate-rise items-center gap-4 rounded-xl bg-ink-950/90 py-3 pl-3 pr-8 shadow-2xl ring-1 ring-white/10">
          <span className="h-12 w-1.5 rounded-full bg-spot-500" />
          <span className="font-display text-[1.6vw] font-medium text-white">{e.lowerThird}</span>
        </div>
      )}

      {/* Join-in QR */}
      {origin && scene !== "blank" && (
        <div className="absolute bottom-[6vh] right-[4vw] flex items-center gap-4 rounded-2xl bg-ink-950/90 p-3 pr-5 ring-1 ring-white/10">
          <div className="rounded-lg bg-white p-2">
            <QRCodeSVG text={`${origin}/e/${e.slug}`} size={92} />
          </div>
          <p className="text-[1vw] leading-tight text-ink-200">
            Scan to vote,
            <br />
            ask &amp; react live
          </p>
        </div>
      )}

      {/* Reactions */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-[18vw] h-full w-40">
        {reactions.map((r) => (
          <span key={r.id} className="absolute bottom-24 left-1/2 animate-floatup text-6xl" style={{ ["--drift" as string]: `${r.drift * 2}px`, filter: `drop-shadow(0 0 14px ${r.color})` }}>
            {r.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
