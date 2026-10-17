"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock, Sparkle } from "lucide-react";
import type { Quest } from "@/lib/achievements";
import { buttonClass } from "@/components/ui/primitives";

type Props = {
  quests: Quest[];
  color: string;
  /** event kind → slug of a live/upcoming event that helps with the quest */
  eventFor: Partial<Record<NonNullable<Quest["eventKind"]>, { slug: string; title: string }>>;
  preview?: boolean;
};

/**
 * The quest map as a star chart. Done stars glow and pulse in the house
 * colour, available ones twinkle, locked ones stay dim. Every star is a
 * real button (keyboard + screen reader), and the SVG is decorative.
 */
/** Chart is drawn in a 150×95 space; quest x (0–100) is stretched to fit. */
const W = 150;
const H = 95;
const X = (x: number) => (x / 100) * W;

export function Constellation({ quests, color, eventFor, preview }: Props) {
  const firstOpen = quests.find((q) => q.state === "available") ?? quests[0];
  const [sel, setSel] = useState(firstOpen.id);
  const q = quests.find((x) => x.id === sel)!;
  const byId = Object.fromEntries(quests.map((x) => [x.id, x]));
  const done = quests.filter((x) => x.state === "done").length;
  const ev = q.eventKind ? eventFor[q.eventKind] : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <style>{`
        @keyframes sc-twinkle { 0%,100% { opacity: .55; transform: scale(.9) } 50% { opacity: 1; transform: scale(1.15) } }
        @keyframes sc-pulse { 0% { r: 2.2; opacity: .7 } 100% { r: 6.5; opacity: 0 } }
        @keyframes sc-dash { to { stroke-dashoffset: -8 } }
        .sc-twinkle { animation: sc-twinkle 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
        .sc-pulse { animation: sc-pulse 2.2s ease-out infinite }
        .sc-flow { animation: sc-dash 1.6s linear infinite }
        @media (prefers-reduced-motion: reduce) { .sc-twinkle, .sc-pulse, .sc-flow { animation: none } }
      `}</style>

      <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[radial-gradient(120%_90%_at_50%_100%,rgb(255_169_40/0.08),transparent_60%),#08080c]">
        {/* Star dust */}
        <svg aria-hidden className="absolute inset-0 size-full opacity-60">
          {Array.from({ length: 70 }, (_, i) => (
            <circle key={i} cx={`${(i * 37.7) % 100}%`} cy={`${(i * 61.3) % 100}%`} r={(i % 3) * 0.4 + 0.3} fill="#fff" opacity={((i * 13) % 7) / 10 + 0.1} />
          ))}
        </svg>
        <div className="relative aspect-[150/95] w-full">
          <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="sc-glow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="1.1" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {quests.flatMap((child) =>
              child.requires.map((pid) => {
                const parent = byId[pid];
                const lit = parent.state === "done" && child.state !== "locked";
                return (
                  <line
                    key={`${pid}-${child.id}`}
                    x1={X(parent.x)}
                    y1={parent.y}
                    x2={X(child.x)}
                    y2={child.y}
                    stroke={lit ? color : "rgb(255 255 255 / .14)"}
                    strokeWidth={lit ? 0.45 : 0.3}
                    strokeDasharray={child.state === "available" ? "1.2 1.2" : undefined}
                    className={child.state === "available" ? "sc-flow" : undefined}
                    opacity={lit ? 0.9 : 1}
                  />
                );
              }),
            )}
            {quests.map((n, i) => (
              <g key={n.id} filter={n.state !== "locked" ? "url(#sc-glow)" : undefined}>
                {n.state === "done" && <circle cx={X(n.x)} cy={n.y} r="2.2" fill="none" stroke={color} strokeWidth="0.4" className="sc-pulse" style={{ animationDelay: `${i * 0.18}s` }} />}
                <circle
                  cx={X(n.x)}
                  cy={n.y}
                  r={n.id === sel ? 2.6 : n.state === "locked" ? 1.3 : 2}
                  fill={n.state === "done" ? color : n.state === "available" ? "#ffd28a" : "#3a3a48"}
                  className={n.state === "available" ? "sc-twinkle" : undefined}
                  style={{ animationDelay: `${i * 0.3}s`, transition: "r .3s" }}
                />
                {n.id === sel && <circle cx={X(n.x)} cy={n.y} r="4" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="0.3" />}
              </g>
            ))}
          </svg>
          {/* Accessible hit targets laid over the stars */}
          {quests.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setSel(n.id)}
              onFocus={() => setSel(n.id)}
              aria-pressed={n.id === sel}
              aria-label={`${n.title}: ${n.state === "done" ? "complete" : n.state === "available" ? "available" : "locked"}`}
              className="group absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-spot-400"
              style={{ left: `${n.x}%`, top: `${(n.y / H) * 100}%` }}
            >
              <span className={`pointer-events-none absolute left-1/2 top-full mt-0.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-950/90 px-2 py-0.5 text-[0.68rem] text-ink-100 ring-1 ring-white/10 sm:block ${n.id === sel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {n.title}
              </span>
            </button>
          ))}
        </div>
        <div className="absolute left-4 top-4 rounded-full bg-ink-950/80 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-200 ring-1 ring-white/10">
          {done}/{quests.length} stars lit
        </div>
      </div>

      {/* Detail card */}
      <aside aria-live="polite" className="card flex flex-col p-6">
        <p className="eyebrow flex items-center gap-1.5">
          {q.state === "done" ? <Check size={12} className="text-ok" /> : q.state === "available" ? <Sparkle size={12} className="text-spot-400" /> : <Lock size={12} />}
          {q.state === "done" ? "Completed" : q.state === "available" ? "Available now" : "Locked"} · +{q.xp} XP
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-white">{q.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{q.hint}</p>
        <div className="mt-5">
          <div className="flex justify-between font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ink-400">
            <span>Progress</span>
            <span>
              {Math.min(q.value, q.target)}/{q.target}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${q.progress * 100}%`, background: q.state === "done" ? color : "var(--color-spot-500)" }} />
          </div>
        </div>
        {q.state === "locked" && (
          <p className="mt-4 text-xs text-ink-400">
            Unlocks after: {q.requires.map((r) => byId[r].title).join(" and ")}
          </p>
        )}
        <div className="mt-auto pt-6">
          {preview ? (
            <Link href="/login?next=/quests" className={`${buttonClass("primary")} w-full`}>
              Sign in to start your odyssey
            </Link>
          ) : ev && q.state !== "done" ? (
            <Link href={`/e/${ev.slug}`} className={`${buttonClass("primary")} w-full`}>
              Go to {ev.title.length > 26 ? `${ev.title.slice(0, 24)}…` : ev.title} <ArrowRight size={15} />
            </Link>
          ) : (
            <Link href="/#live" className={`${buttonClass("outline")} w-full`}>
              See live events
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
