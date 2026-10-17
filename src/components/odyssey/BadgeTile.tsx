import { Lock } from "lucide-react";
import type { Badge } from "@/lib/achievements";
import { BADGE_ICON, TIER_METAL } from "./icons";

/** A minted medallion: metallic tier ring, icon, progress to next tier. */
export function BadgeTile({ badge: b, index = 0 }: { badge: Badge; index?: number }) {
  const Icon = BADGE_ICON[b.icon];
  const metal = b.tier ? TIER_METAL[b.tier] : null;
  const label = b.tier ? `${b.name}, ${b.tier} tier. ${b.description}. ${b.value} so far` : `${b.name}, locked. ${b.description}. ${b.value} of ${b.next}`;
  return (
    <li
      aria-label={label}
      className={`group relative flex animate-rise flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 ${b.tier ? "border-white/10 bg-white/[0.03] hover:border-white/20" : "border-white/5 bg-transparent"}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span
        className={`relative grid size-16 place-items-center rounded-full ${b.tier ? "shadow-[0_10px_30px_-10px_rgb(0_0_0/0.8)]" : "opacity-40 grayscale"}`}
        style={{ background: metal ? `conic-gradient(from 210deg, ${metal[0]}, ${metal[1]}, ${metal[2]}, ${metal[1]}, ${metal[0]})` : "conic-gradient(#33333f, #23232f, #33333f)" }}
      >
        <span className="absolute inset-[5px] grid place-items-center rounded-full bg-ink-900">
          {b.tier ? <Icon size={24} style={{ color: metal![1] }} /> : <Lock size={18} className="text-ink-500" />}
        </span>
        {b.tier && (
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute -left-full top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-[left] duration-700 group-hover:left-[150%]" />
          </span>
        )}
      </span>
      <span className="text-sm font-medium leading-tight text-white">{b.name}</span>
      <span className="text-[0.7rem] leading-snug text-ink-400">{b.description}</span>
      <span className="mt-auto w-full">
        {b.tier === "gold" ? (
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: TIER_METAL.gold[1] }}>
            Gold · maxed
          </span>
        ) : (
          <>
            <span className="block h-1 overflow-hidden rounded-full bg-white/8">
              <span className="block h-full rounded-full bg-spot-500 transition-[width] duration-700" style={{ width: `${Math.round(b.progress * 100)}%` }} />
            </span>
            <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-ink-500">
              {b.tier ?? "locked"} · {b.value}/{b.next}
            </span>
          </>
        )}
      </span>
    </li>
  );
}
