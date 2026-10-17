"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronUp, Radio, Swords } from "lucide-react";
import type { PollDTO } from "@/lib/types";

type Scene = {
  poll: { poll: PollDTO; event: { slug: string; title: string } } | null;
  question: { body: string; votes: number; slug: string } | null;
  match: { slug: string; game: string | null; teams: { name: string; color: string }[]; scoreA: number; scoreB: number } | null;
  cert: { id: string; name: string; achievement: string } | null;
};

const EMOJI = ["👏", "🔥", "💚", "🎉", "😂", "🤯", "👏", "🔥"];

/**
 * The home hero's centrepiece: real, live product cards floating at
 * different depths in 3D. The whole rig tilts toward the pointer with a
 * damped spring; each layer parallaxes by its depth. Reactions rise from
 * the stage. Static (but still composed) for reduced motion.
 */
export function HeroScene({ scene }: { scene: Scene }) {
  const rig = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rig.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      tgt.x = (e.clientX / innerWidth - 0.5) * 2;
      tgt.y = (e.clientY / innerHeight - 0.5) * 2;
    };
    const tick = (t: number) => {
      cur.x += (tgt.x - cur.x) * 0.06;
      cur.y += (tgt.y - cur.y) * 0.06;
      const idleX = Math.sin(t / 2600) * 0.25, idleY = Math.cos(t / 3100) * 0.2;
      el.style.setProperty("--rx", `${(-(cur.y + idleY) * 7).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((cur.x + idleX) * 10).toFixed(2)}deg`);
      raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const { poll, question, match, cert } = scene;
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] [perspective:1400px] lg:block" aria-hidden={false}>
      {/* Stage light */}
      <div aria-hidden className="absolute left-1/2 top-0 h-full w-[80%] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_150deg,rgb(255_170_60/0.22)_180deg,transparent_210deg)]" />
      <div aria-hidden className="absolute bottom-[12%] left-1/2 h-24 w-[70%] -translate-x-1/2 rounded-[50%] bg-spot-500/25 blur-3xl" />

      <div ref={rig} className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]">
        {/* Q&A card */}
        {question && (
          <Layer z={140} className="left-[4%] top-[14%] w-[48%] animate-[rise_.9s_.25s_both]">
            <Link href={`/e/${question.slug}`} className="pointer-events-auto flex gap-3 rounded-2xl border border-white/10 bg-ink-850/90 p-4 shadow-[0_24px_60px_-24px_rgb(60_35_5/0.45)] backdrop-blur-xl">
              <span className="flex w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-spot-500/40 bg-spot-500/12 py-1 text-spot-300">
                <ChevronUp size={16} />
                <span className="timecode text-sm font-semibold">{question.votes}</span>
              </span>
              <span className="min-w-0">
                <span className="eyebrow text-[0.6rem]">Top question</span>
                <span className="mt-1 block text-sm leading-snug text-ink-100">{question.body}</span>
              </span>
            </Link>
          </Layer>
        )}

        {/* Live poll, the centrepiece */}
        {poll?.poll.tallies && (
          <Layer z={70} className="left-[22%] top-[34%] w-[54%] animate-[rise_.9s_.1s_both]">
            <Link href={`/e/${poll.event.slug}`} className="pointer-events-auto block rounded-3xl border border-white/10 bg-ink-850/92 p-5 shadow-[0_40px_90px_-30px_rgb(60_35_5/0.5)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-onair/12 px-2.5 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-onair ring-1 ring-onair/30">
                  <span className="size-1.5 animate-tally rounded-full bg-onair" /> Live poll
                </span>
                <span className="timecode text-xs text-ink-400">{poll.poll.total} votes</span>
              </div>
              <p className="mt-3 font-display text-lg font-semibold leading-snug text-white">{poll.poll.question}</p>
              <ul className="mt-4 space-y-2">
                {poll.poll.options.map((o, i) => {
                  const pct = poll.poll.total ? Math.round((poll.poll.tallies![i] / poll.poll.total) * 100) : 0;
                  const lead = poll.poll.tallies![i] === Math.max(...poll.poll.tallies!);
                  return (
                    <li key={i} className="relative overflow-hidden rounded-xl bg-white/5 px-3 py-2 text-sm">
                      <span className={`absolute inset-y-0 left-0 origin-left animate-[grow_1.4s_cubic-bezier(.2,.8,.2,1)_both] ${lead ? "bg-gradient-to-r from-spot-500/50 to-spot-500/25" : "bg-white/8"}`} style={{ width: `${pct}%`, animationDelay: `${700 + i * 140}ms` }} />
                      <span className="relative flex justify-between gap-3 text-ink-100">
                        <span className="truncate">{o}</span>
                        <span className="timecode font-medium">{pct}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Link>
          </Layer>
        )}

        {/* Live match */}
        {match && (
          <Layer z={20} className="bottom-[3%] left-[-2%] w-[38%] animate-[rise_.9s_.4s_both]">
            <Link href={`/e/${match.slug}`} className="pointer-events-auto block rounded-2xl border border-white/10 bg-ink-850/90 p-4 shadow-[0_24px_60px_-24px_rgb(60_35_5/0.45)] backdrop-blur-xl">
              <p className="eyebrow flex items-center gap-1.5 text-[0.6rem]">
                <Swords size={11} /> {match.game ?? "Match"} · <span className="text-onair">live</span>
              </p>
              {match.teams.map((t, i) => (
                <div key={t.name} className="mt-2 flex items-center gap-2 text-sm">
                  <span className="h-4 w-1 rounded-full" style={{ background: t.color }} />
                  <span className="min-w-0 flex-1 truncate text-ink-100">{t.name}</span>
                  <span className="timecode font-semibold text-white">{i === 0 ? match.scoreA : match.scoreB}</span>
                </div>
              ))}
            </Link>
          </Layer>
        )}

        {/* Signed certificate */}
        {cert && (
          <Layer z={110} className="right-[7%] top-[9%] w-[32%] animate-[rise_.9s_.55s_both]">
            <Link href={`/c/${cert.id}`} className="pointer-events-auto block rotate-3 rounded-2xl border border-[#c9a45c]/50 bg-[#fbf7ee] p-4 text-[#1d1a14] shadow-[0_24px_60px_-24px_rgb(60_35_5/0.5)]">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[#8a6d2f]">Certificate of excellence</p>
              <p className="mt-2 font-display text-base font-semibold leading-tight">{cert.name}</p>
              <p className="mt-1 line-clamp-2 text-[0.7rem] text-[#5c5240]">{cert.achievement}</p>
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0c9a5f]/12 px-2 py-0.5 text-[0.62rem] font-semibold text-[#0b7a4c]">
                <BadgeCheck size={11} /> Ed25519 verified
              </p>
            </Link>
          </Layer>
        )}

        {/* On-air chip */}
        <Layer z={180} className="bottom-[22%] right-[6%] animate-[rise_.9s_.7s_both]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-850/90 px-3.5 py-2 text-xs font-medium text-ink-100 shadow-lg backdrop-blur">
            <Radio size={13} className="text-onair" /> 3 shows on air
          </span>
        </Layer>

        {/* Rising reactions */}
        <div aria-hidden className="absolute bottom-[8%] right-[24%] h-[70%] w-24 [transform:translateZ(90px)]">
          {EMOJI.map((e, i) => (
            <span key={i} className="absolute bottom-0 left-1/2 animate-[floatloop_5.6s_ease-out_infinite] text-2xl opacity-0 motion-reduce:hidden" style={{ animationDelay: `${i * 0.7}s`, ["--drift" as string]: `${(i % 2 ? 1 : -1) * (10 + i * 6)}px` }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Layer({ z, className, children }: { z: number; className: string; children: React.ReactNode }) {
  return (
    <div className={`absolute [transform-style:preserve-3d] ${className}`} style={{ transform: `translateZ(${z}px)` }}>
      <div className="animate-[floaty_7s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: `${-z / 30}s` }}>
        {children}
      </div>
    </div>
  );
}
