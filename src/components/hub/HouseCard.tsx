import { Tilt } from "@/components/ui/Tilt";
import Image from "next/image";
import Link from "next/link";
import { Crown, Users } from "lucide-react";
import type { HouseStanding } from "@/server/hub";

export function HouseCard({ house, art, index }: { house: HouseStanding; art: string | null; index: number }) {
  return (
    <Tilt className="rounded-[1.25rem]">
    <Link
      href={`/houses/${house.slug}`}
      className="card group relative block animate-rise overflow-hidden transition duration-300 hover:border-white/20"
      style={{ animationDelay: `${120 + index * 45}ms`, boxShadow: `0 0 0 0 ${house.color}00` }}
    >
      <div className="relative h-36 overflow-hidden">
        {art ? (
          <Image src={art} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.06]" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${house.color}, color-mix(in oklab, ${house.color} 35%, var(--ink-800)))` }} />
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: house.color }} />
        <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-ink-850/90 font-display text-sm font-bold text-white shadow-md ring-1 ring-white/10 backdrop-blur">
          {house.rank === 1 ? <Crown size={16} className="text-spot-400" /> : house.rank}
        </span>
        {house.live > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-danger shadow-md ring-1 ring-onair/30">
            <span className="size-1.5 animate-tally rounded-full bg-onair" /> Live
          </span>
        )}
      </div>
      <div className="relative p-4">
                <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl font-semibold tracking-tight text-white">{house.name}</h3>
          <p className="timecode text-lg font-semibold" style={{ color: house.color }}>
            {house.points}
            <span className="ml-1 text-xs text-ink-400">pts</span>
          </p>
        </div>
        {house.motto && <p className="mt-1 line-clamp-1 text-sm italic text-ink-300">{house.motto}</p>}
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-400">
          <Users size={13} /> {house.members} member{house.members === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
    </Tilt>
  );
}
