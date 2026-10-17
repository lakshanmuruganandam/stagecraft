"use client";

import { useRef } from "react";
import { initials } from "@/lib/format";

export type HoloCardProps = {
  name: string;
  houseName: string | null;
  houseColor: string;
  role: string;
  level: number;
  title: string;
  xp: number;
  nextXp: number;
  progress: number;
  badges: number;
  memberSince: string;
  epithet?: string;
};

/**
 * Holographic member card. Pointer position drives a 3D tilt, a moving
 * glare and a foil sheen through CSS variables, so the whole effect is
 * GPU-composited with no re-renders. Static under prefers-reduced-motion.
 */
export function HoloCard(p: HoloCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 16}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 20}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
    el.style.setProperty("--foil", `${(x + y) * 120}deg`);
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--gx", "50%");
    el.style.setProperty("--gy", "30%");
  }

  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <div className="[perspective:1100px]">
      <div
        ref={ref}
        onPointerMove={move}
        onPointerLeave={reset}
        tabIndex={0}
        role="img"
        aria-label={`${p.name}, ${p.houseName ?? "no"} house, level ${p.level} ${p.title}, ${p.xp} XP, ${p.badges} badges`}
        className="group relative aspect-[1.586] w-full max-w-md overflow-hidden rounded-[1.4rem] border border-white/15 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9)] transition-transform duration-200 ease-out will-change-transform [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-spot-400 motion-reduce:transform-none"
        style={{
          background: `radial-gradient(120% 90% at 0% 0%, ${p.houseColor}55, transparent 55%), radial-gradient(90% 80% at 100% 100%, ${p.houseColor}33, transparent 60%), linear-gradient(160deg, #15151d, #0a0a0f)`,
        }}
      >
        {/* Foil: a conic rainbow that only shows through the brightest areas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay transition-opacity duration-500 group-hover:opacity-40 group-focus-visible:opacity-40 motion-reduce:hidden"
          style={{
            background: "conic-gradient(from var(--foil, 0deg) at 50% 50%, #ff6b6b, #ffd93d, #6bff95, #4dd8ff, #b06bff, #ff6b6b)",
            // Fine foil lines, only near the light source.
            maskImage: "repeating-linear-gradient(115deg, #000 0 1px, transparent 1px 6px), radial-gradient(55% 65% at var(--gx,50%) var(--gy,30%), #000, transparent 75%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
        {/* Glare that follows the pointer */}
        <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay motion-reduce:hidden" style={{ background: "radial-gradient(40% 50% at var(--gx,50%) var(--gy,30%), rgb(255 255 255 / .55), transparent 70%)" }} />
        {/* Topographic forest contour pattern */}
        <svg aria-hidden className="absolute -right-10 -top-10 h-[130%] w-[70%] opacity-[0.10]" viewBox="0 0 200 200" fill="none" stroke={p.houseColor} strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M ${20 + i * 6} 100 C ${40 + i * 4} ${30 - i * 3}, ${160 - i * 4} ${30 - i * 3}, ${180 - i * 6} 100 S ${40 + i * 4} ${170 + i * 3}, ${20 + i * 6} 100`} />
          ))}
        </svg>

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6 [transform:translateZ(40px)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/60">StageCraft · Member</p>
              <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.3em]" style={{ color: p.houseColor }}>
                {p.houseName ? `${p.houseName} House` : "Unhoused traveller"}
              </p>
              {p.epithet && <p className="mt-1 text-[0.7rem] italic text-white/50">{p.epithet}</p>}
            </div>
            {/* Level ring */}
            <div className="relative grid size-[74px] shrink-0 place-items-center">
              <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
                <circle cx="36" cy="36" r={R} stroke="rgb(255 255 255 / .12)" strokeWidth="5" fill="none" />
                <circle cx="36" cy="36" r={R} stroke={p.houseColor} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p.progress)} className="transition-[stroke-dashoffset] duration-1000" />
              </svg>
              <div className="text-center leading-none">
                <p className="font-display text-2xl font-bold text-white">{p.level}</p>
                <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-widest text-white/60">level</p>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold text-on-spot shadow-lg sm:size-16 sm:text-2xl" style={{ background: `linear-gradient(135deg, #fff8, ${p.houseColor})` }}>
              {initials(p.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">{p.name}</p>
              <p className="text-sm text-white/70">
                {p.title} · <span className="capitalize">{p.role}</span>
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-white/60">
            <span>
              <span className="text-base font-semibold tracking-normal text-white">{p.xp.toLocaleString("en-IN")}</span> xp · {p.nextXp - p.xp} to next
            </span>
            <span>{p.badges} badges</span>
            <span className="hidden sm:inline">since {p.memberSince}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
