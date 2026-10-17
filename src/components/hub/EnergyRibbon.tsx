import type { HouseStanding } from "@/server/hub";

/**
 * The House Energy Ribbon: one bar, twelve segments sized by points. Each
 * segment grows in from zero with a slight spring overshoot (flex-grow is
 * animatable), staggered left to right. Exposed to assistive tech as an
 * ordered list of houses and points.
 */
export function EnergyRibbon({ houses }: { houses: HouseStanding[] }) {
  const total = houses.reduce((a, h) => a + h.points, 0) || 1;
  return (
    <figure className="relative">
      <style>{`
        @keyframes sc-ribbon-grow { 0% { flex-grow: 0.0001; } 70% { flex-grow: calc(var(--g) * 1.06); } 100% { flex-grow: var(--g); } }
        @keyframes sc-ribbon-sheen { from { transform: translateX(-120%); } to { transform: translateX(420%); } }
        @media (prefers-reduced-motion: reduce) { .sc-seg { animation: none !important; } .sc-sheen { display: none; } }
      `}</style>
      <ol aria-label="House points share" className="card relative flex h-16 w-full overflow-hidden p-1 sm:h-20">
        {houses.map((h, i) => (
          <li
            key={h.id}
            tabIndex={0}
            className="sc-seg group relative min-w-[6px] outline-none first:rounded-l-xl last:rounded-r-xl focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-spot-400"
            style={{ ["--g" as string]: h.points, flexGrow: h.points, flexBasis: 0, background: `linear-gradient(180deg, ${h.color}, ${h.color}aa)`, animation: `sc-ribbon-grow 1.4s cubic-bezier(.2,.8,.2,1) ${i * 70}ms both`, marginRight: i < houses.length - 1 ? 2 : 0 }}
          >
            <span className="sr-only">
              {h.name}: {h.points} points, {((h.points / total) * 100).toFixed(1)}%
            </span>
            <span aria-hidden className="absolute inset-x-1 bottom-1.5 truncate text-[0.65rem] font-semibold uppercase tracking-wider text-paper [text-shadow:0_1px_2px_rgb(0_0_0/0.4)] sm:text-xs">
              {h.points / total > 0.07 ? h.name : ""}
            </span>
            <span aria-hidden className="pointer-events-none absolute -top-11 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink-850 px-2.5 py-1 text-xs text-white shadow-xl group-hover:block group-focus-visible:block">
              {h.name} · <span className="timecode">{h.points}</span>
            </span>
          </li>
        ))}
        <span aria-hidden className="sc-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-paper/35 to-transparent" style={{ animation: "sc-ribbon-sheen 3.2s ease-in-out 1.4s infinite" }} />
      </ol>
      <figcaption className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-ink-400">
        <span>Share of all house points this term</span>
        <span className="timecode">{total.toLocaleString("en-IN")} pts awarded</span>
      </figcaption>
    </figure>
  );
}
