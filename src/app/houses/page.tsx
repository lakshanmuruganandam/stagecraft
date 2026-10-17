import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { houseStandings } from "@/server/hub";
import { houseArt } from "@/components/hub/art";
import { EnergyRibbon } from "@/components/hub/EnergyRibbon";
import { HouseCard } from "@/components/hub/HouseCard";
import { buttonClass } from "@/components/ui/primitives";
import { ArenaLoader } from "@/components/three/ArenaLoader";

export const metadata: Metadata = {
  title: "Houses",
  description: "All twelve IITM BS houses: live standings, members and what each house is hosting next.",
};

export default function HousesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow animate-rise">House cup · twelve forests</p>
          <h1 className="mt-2 animate-rise font-display text-4xl font-semibold tracking-tight text-white [animation-delay:60ms] sm:text-6xl">Every house, one stage.</h1>
          <p className="mt-3 max-w-xl animate-rise text-ink-300 [animation-delay:120ms]">Points flow in from every event the moment it wraps. Pick a house to see its front door: what it&apos;s hosting, who&apos;s carrying it, and how the term is going.</p>
        </div>
        <Link href="/calendar" className={`${buttonClass("outline")} animate-rise [animation-delay:160ms]`}>
          <CalendarDays size={16} /> Event radar
        </Link>
      </div>
      <section aria-label="House cup arena" className="mt-10 animate-rise [animation-delay:200ms]">
        <ArenaLoader className="h-[min(70vh,640px)] min-h-[420px]" />
      </section>
      <Suspense fallback={<div className="mt-10 h-[40rem] animate-pulse rounded-3xl bg-white/4" />}>
        <Standings />
      </Suspense>
    </div>
  );
}

async function Standings() {
  const houses = await houseStandings();
  return (
    <>
      <section aria-labelledby="ribbon-h" className="mt-10">
        <h2 id="ribbon-h" className="sr-only">
          Points share
        </h2>
        <EnergyRibbon houses={houses} />
      </section>
      <section aria-labelledby="grid-h" className="mt-12">
        <h2 id="grid-h" className="sr-only">
          All houses
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {houses.map((h, i) => (
            <li key={h.id}>
              <HouseCard house={h} art={houseArt(h.slug)} index={i} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
