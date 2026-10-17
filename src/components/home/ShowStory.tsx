"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronUp, Crown, Radio, Swords, Trophy } from "lucide-react";

const STEPS = [
  { k: "live", icon: Radio, title: "Go live in one click", body: "Organizers open the control room, paste a YouTube or Twitch link and hit Go live. The whole house gets a tally light, a lower third and a room to gather in." },
  { k: "ask", icon: ChevronUp, title: "The audience takes the mic", body: "Questions rise by upvote, polls update for everyone at once, and reactions float across the stream. Moderators approve anything first, so the stage stays classy." },
  { k: "bracket", icon: Swords, title: "Brackets that run themselves", body: "Report a score and the winner advances, the loser drops to the bronze match, and every prediction is settled. The OBS overlay follows along." },
  { k: "reveal", icon: Trophy, title: "Sealed results, dramatic reveal", body: "Judge scores and audience votes blend at the weight you choose and stay sealed until you pull the lever. Then the leaderboard reshuffles live." },
  { k: "cert", icon: BadgeCheck, title: "Certificates the moment it ends", body: "Wrap up issues Ed25519-signed certificates to winners and everyone who took part. Houses earn points, and anyone can verify a certificate, even offline." },
] as const;

/** Pinned scroll story: the copy scrolls, the stage panel morphs per step. */
export function ShowStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section aria-labelledby="story-title" className="relative">
      <p className="eyebrow" data-reveal>
        How a show runs
      </p>
      <h2 id="story-title" data-reveal className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
        From &ldquo;go live&rdquo; to signed certificates, in five moves.
      </h2>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.k}>
              <div ref={(el) => { refs.current[i] = el; }} data-step={i} className="flex min-h-[46vh] flex-col justify-center lg:min-h-[72vh]">
                <div className={`transition-all duration-500 ${active === i ? "opacity-100" : "opacity-35 lg:translate-x-0"}`}>
                  <span className={`grid size-12 place-items-center rounded-2xl transition-colors duration-500 ${active === i ? "bg-spot-500 text-on-spot shadow-[0_10px_30px_-10px_var(--spot-500)]" : "bg-white/6 text-ink-400"}`}>
                    <s.icon size={22} />
                  </span>
                  <p className="timecode mt-5 text-sm text-spot-300">0{i + 1} / 05</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">{s.title}</h3>
                  <p className="mt-3 max-w-md text-[1.02rem] leading-relaxed text-ink-300">{s.body}</p>
                </div>
                {/* Mobile: inline visual */}
                <div className="mt-6 lg:hidden">
                  <Panel step={i} />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sticky top-[14vh] h-[72vh]">
            <div className="card relative h-full overflow-hidden p-0">
              {STEPS.map((s, i) => (
                <div key={s.k} aria-hidden={active !== i} className={`absolute inset-0 grid place-items-center p-8 transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${active === i ? "scale-100 opacity-100" : i < active ? "-translate-y-8 scale-95 opacity-0" : "translate-y-8 scale-95 opacity-0"}`}>
                  {active === i && <Panel step={i} />}
                </div>
              ))}
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
                {STEPS.map((s, i) => (
                  <span key={s.k} className={`h-1.5 rounded-full transition-all duration-500 ${active === i ? "w-8 bg-spot-500" : "w-2 bg-white/15"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Control room</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-onair/12 px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-onair ring-1 ring-onair/30">
              <span className="size-1.5 animate-tally rounded-full bg-onair" /> On air
            </span>
          </div>
          <div className="mt-4 aspect-video rounded-xl bg-[linear-gradient(135deg,#1d2356,#3b2f5c)] p-3">
            <div className="flex h-full items-end">
              <div className="animate-[castin_.8s_.3s_both] rounded-md bg-ink-850 px-3 py-1.5 text-xs text-ink-100 shadow">Live now · Fireside chat</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.7rem] text-ink-300">
            {["Auto", "Question", "Poll"].map((x, i) => (
              <span key={x} className={`rounded-lg border py-1.5 ${i === 0 ? "border-spot-500/50 bg-spot-500/10 text-spot-300" : "border-white/10"}`}>{x}</span>
            ))}
          </div>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className="w-full max-w-sm space-y-3">
        {[
          ["How do you decide what NOT to merge?", 31],
          ["What does your release checklist look like?", 22],
          ["Any advice for a first OSS contribution?", 18],
        ].map(([q, v], i) => (
          <div key={i} className="flex animate-[castin_.7s_both] gap-3 rounded-2xl border border-white/10 bg-ink-900 p-3.5 shadow-lg" style={{ animationDelay: `${i * 160}ms` }}>
            <span className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-xl border py-1 ${i === 0 ? "border-spot-500/50 bg-spot-500/12 text-spot-300" : "border-white/10 text-ink-300"}`}>
              <ChevronUp size={15} />
              <span className="timecode text-sm font-semibold">{v}</span>
            </span>
            <span className="text-sm text-ink-100">{q}</span>
          </div>
        ))}
        <div className="relative h-10">
          {["🔥", "👏", "💚", "🎉"].map((e, i) => (
            <span key={i} className="absolute bottom-0 animate-[floatloop_3.6s_ease-out_infinite] text-2xl opacity-0" style={{ left: `${20 + i * 18}%`, animationDelay: `${i * 0.6}s` }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    );
  if (step === 2)
    return (
      <div className="flex w-full max-w-md items-center gap-4">
        {[
          ["Sentinels", "Prides", 0],
          ["Strikers", "Stripes", 1],
        ].map(([a, b], i) => (
          <div key={i} className="flex-1 space-y-2">
            {[a, b].map((t, j) => (
              <div key={t} className={`animate-[castin_.6s_both] rounded-xl border px-3 py-2 text-sm ${j === 0 ? "border-spot-500/40 bg-spot-500/10 font-semibold text-white" : "border-white/10 bg-ink-900 text-ink-400 line-through decoration-ink-500/60"}`} style={{ animationDelay: `${(i * 2 + j) * 120}ms` }}>
                {t} <span className="timecode float-right">{j === 0 ? 2 : 1}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="h-24 w-6 animate-[castin_.6s_.6s_both] rounded-r-xl border-y-2 border-r-2 border-spot-500/60" />
        <div className="animate-[castin_.7s_.9s_both] rounded-2xl border border-spot-500/50 bg-spot-500/12 px-4 py-3 text-center">
          <Crown className="mx-auto text-spot-400" size={22} />
          <p className="mt-1 text-sm font-semibold text-white">Sentinels</p>
          <p className="text-[0.65rem] text-ink-400">to the final</p>
        </div>
      </div>
    );
  if (step === 3)
    return (
      <div className="w-full max-w-sm space-y-2">
        {[
          ["Spoken word · Saranda", 88],
          ["Raag Yaman · Pichavaram", 81],
          ["Bharatanatyam · Kanha", 74],
          ["Beatbox loops · Wayanad", 52],
        ].map(([t, v], i) => (
          <div key={i} className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900 px-4 py-3">
            <span className="absolute inset-y-0 left-0 origin-left animate-[grow_1.1s_cubic-bezier(.2,.8,.2,1)_both] bg-spot-500/22" style={{ width: `${v}%`, animationDelay: `${300 + i * 150}ms` }} />
            <span className="relative flex justify-between text-sm text-ink-100">
              <span>
                <span className="timecode mr-2 text-ink-400">#{i + 1}</span>
                {t}
              </span>
              <span className="timecode font-semibold">{v}</span>
            </span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="relative w-full max-w-sm">
      <div className="animate-[certin_1s_both] rounded-2xl border border-[#c9a45c]/60 bg-[#fbf7ee] p-6 text-center text-[#1d1a14] shadow-2xl">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[#8a6d2f]">Certificate of excellence</p>
        <p className="mt-3 font-display text-2xl font-semibold">Ananya Iyer</p>
        <p className="mt-1 text-xs text-[#5c5240]">Winner · Data Science Quiz Night</p>
        <div className="mx-auto mt-5 grid size-16 animate-[stamp_.6s_.8s_cubic-bezier(.3,1.6,.5,1)_both] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe2a3,#c9a45c_55%,#8a6d2f)] text-[0.55rem] font-bold uppercase leading-tight text-[#3a2c0e] shadow-inner">
          Signed
          <br />
          Ed25519
        </div>
      </div>
      <p className="mt-4 flex animate-[castin_.6s_1.2s_both] items-center justify-center gap-1.5 text-sm font-medium text-ok">
        <BadgeCheck size={16} /> Verified · +50 house points
      </p>
    </div>
  );
}
