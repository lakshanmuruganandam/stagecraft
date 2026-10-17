"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ArenaHouse } from "./ArenaScene";

function ArenaSkeleton() {
  return (
    <div aria-hidden className="absolute inset-0 flex items-end justify-center gap-2 px-[12%] pb-[16%]">
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="w-full max-w-7 animate-pulse rounded-t-xl bg-gradient-to-t from-spot-500/30 to-spot-300/5"
          style={{ height: `${30 + Math.abs(5.5 - i) * -4 + 30}%`, animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

const Arena = dynamic(() => import("./Arena"), { ssr: false, loading: () => <ArenaSkeleton /> });

/**
 * "House Cup Arena": live 3D standings. The WebGL bundle (three + r3f) only
 * loads in the browser, after hydration, so other pages never pay for it.
 */
export function ArenaLoader({ className = "h-[520px]" }: { className?: string }) {
  const [houses, setHouses] = useState<ArenaHouse[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/houses/standings")
        .then((r) => (r.ok ? (r.json() as Promise<ArenaHouse[]>) : Promise.reject(new Error(String(r.status)))))
        .then((rows) => alive && setHouses(rows))
        .catch(() => alive && setError(true));
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const ranked = houses ? [...houses].sort((a, b) => b.points - a.points) : [];
  const leader = ranked[0];

  return (
    <figure className={`arena-sky relative isolate overflow-hidden rounded-3xl border border-white/8 shadow-[0_30px_80px_-30px_rgb(120_70_20/0.35)] ${className}`}>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#fff7ea_0%,#ffe9cf_32%,#ffd9b8_58%,#ffd9b8_100%)] in-data-[theme=stage]:bg-[linear-gradient(180deg,#07081a_0%,#15122e_34%,#1b1530_58%,#1b1530_100%)]" />
      <div aria-hidden className="absolute -z-10 left-[12%] top-[14%] size-72 rounded-full bg-[radial-gradient(closest-side,rgb(255_244_214/0.95),rgb(255_196_120/0.35)_55%,transparent)] in-data-[theme=stage]:bg-[radial-gradient(closest-side,rgb(220_228_255/0.35),rgb(120_130_220/0.12)_55%,transparent)]" />

      <div aria-hidden className="absolute inset-0">
        {houses && houses.length > 0 ? <Arena houses={houses} /> : <ArenaSkeleton />}
      </div>

      {leader && (
        <div aria-hidden className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/75 px-3 py-1.5 text-xs shadow-sm backdrop-blur sm:left-5 sm:top-5">
          <span className="size-2 rounded-full" style={{ background: leader.color }} />
          <span className="text-ink-300">Leading</span>
          <span className="font-semibold text-white">{leader.name}</span>
          <span className="timecode text-ink-300">{leader.points.toLocaleString()} pts</span>
        </div>
      )}

      <figcaption className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:inset-x-5 sm:bottom-5">
        <span className="rounded-full border border-white/10 bg-ink-900/75 px-3 py-1.5 text-ink-300 backdrop-blur">
          {error ? "Standings are taking a breather. Try again in a moment." : "Live house standings · pillar height is points"}
        </span>
        <span aria-hidden className="hidden rounded-full border border-white/10 bg-ink-900/75 px-3 py-1.5 text-ink-300 backdrop-blur sm:inline">
          Drag to orbit · click a pillar to visit
        </span>
      </figcaption>

      {ranked.length > 0 && (
        <ol className="sr-only" aria-label="House cup ranking">
          {ranked.map((h, i) => (
            <li key={h.slug}>
              {i + 1}. {h.name}, {h.points} points
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
