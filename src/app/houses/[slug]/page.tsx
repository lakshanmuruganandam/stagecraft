import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Crown, Medal, Radio, Sofa, Sparkles, Trophy, Users } from "lucide-react";
import { houseHome, houseStandings } from "@/server/hub";
import { houseArt } from "@/components/hub/art";
import { CountUp } from "@/components/hub/CountUp";
import { ParallaxBanner } from "@/components/hub/ParallaxBanner";
import { Sparkline } from "@/components/hub/Sparkline";
import { EventCard } from "@/components/events/EventCard";
import { Avatar, Badge, buttonClass, OnAir } from "@/components/ui/primitives";
import { listHouses } from "@/server/queries";
import { fmtDate, fmtTime } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/houses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const h = (await houseStandings()).find((x) => x.slug === slug);
  if (!h) return { title: "House not found" };
  const art = houseArt(h.slug);
  return {
    title: `${h.name} House`,
    description: `${h.name} House: ${h.motto ?? ""}. Rank #${h.rank} with ${h.points} points.`,
    openGraph: art ? { images: [art] } : undefined,
  };
}

export default function HousePage({ params }: PageProps<"/houses/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/houses" className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-white">
        <ArrowLeft size={15} /> All houses
      </Link>
      <Suspense fallback={<div className="h-[34rem] animate-pulse rounded-[1.75rem] bg-white/4" />}>
        <House params={params} />
      </Suspense>
    </div>
  );
}

async function House({ params }: { params: PageProps<"/houses/[slug]">["params"] }) {
  const { slug } = await params;
  const [home, houses] = await Promise.all([houseHome(slug), listHouses()]);
  if (!home) notFound();
  const { house } = home;
  const art = houseArt(house.slug);
  const now = home.live[0] ?? null;

  return (
    <div className="grid gap-8">
      {/* Front door */}
      <ParallaxBanner src={art} color={house.color} alt={`${house.name} landscape`} priority>
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="spot">{house.rank === 1 ? "Leading the house cup" : `Rank #${house.rank} of 12`}</Badge>
            {home.live.length > 0 && <OnAir label={`${home.live.length} live now`} />}
          </div>
          <div>
            <h1 className="animate-rise font-display text-5xl font-semibold tracking-[-0.03em] text-white sm:text-6xl xl:text-7xl">
              {house.name}
              <span className="text-ink-500"> House</span>
            </h1>
            {house.motto && <p className="mt-2 animate-rise text-lg italic text-ink-300 [animation-delay:80ms] sm:text-xl">“{house.motto}”</p>}
          </div>
          <dl className="grid max-w-xl animate-rise grid-cols-3 gap-3 [animation-delay:160ms]">
            {[
              { label: "Points", node: <CountUp value={house.points} /> },
              { label: "Rank", node: <span>#{house.rank}</span> },
              { label: "Members", node: <CountUp value={house.members} duration={900} /> },
            ].map((x) => (
              <div key={x.label} className="rounded-2xl border border-white/8 bg-ink-800/70 px-4 py-3">
                <dt className="eyebrow">{x.label}</dt>
                <dd className="timecode mt-1 text-2xl font-semibold text-white sm:text-3xl" style={x.label === "Points" ? { color: house.color } : undefined}>
                  {x.node}
                </dd>
              </div>
            ))}
          </dl>
        </>
      </ParallaxBanner>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          {/* Living room */}
          <section aria-labelledby="common-h" className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
              <h2 id="common-h" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Sofa size={18} className="text-spot-400" /> Common room
              </h2>
              <span className="text-xs text-ink-400">{home.live.length ? "Doors open" : "Quiet right now"}</span>
            </div>
            {now ? (
              <Link href={`/e/${now.slug}`} className="group flex flex-wrap items-center gap-4 p-5 transition hover:bg-white/3">
                <span className="grid size-12 place-items-center rounded-2xl bg-onair/15 text-onair ring-1 ring-onair/30">
                  <Radio size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-danger">On air now</p>
                  <p className="truncate font-display text-xl font-semibold text-white">{now.title}</p>
                  {now.lowerThird && <p className="truncate text-sm text-ink-300">{now.lowerThird}</p>}
                </div>
                <span className={buttonClass("primary", "sm")}>Join the room</span>
              </Link>
            ) : (
              <div className="p-5 text-sm text-ink-300">
                Nothing is live. {home.upcoming[0] ? (
                  <>
                    Next up: <Link href={`/e/${home.upcoming[0].slug}`} className="text-spot-300 underline-offset-4 hover:underline">{home.upcoming[0].title}</Link> on {fmtDate(home.upcoming[0].startsAt)} at {fmtTime(home.upcoming[0].startsAt)} IST.
                  </>
                ) : (
                  "Check the event radar for what's coming."
                )}
              </div>
            )}
            {home.live.length > 1 && (
              <ul className="divide-y divide-white/6 border-t border-white/6">
                {home.live.slice(1).map((e) => (
                  <li key={e.id}>
                    <Link href={`/e/${e.slug}`} className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-white/3">
                      <span className="size-1.5 animate-tally rounded-full bg-onair" />
                      <span className="flex-1 truncate text-ink-100">{e.title}</span>
                      <span className="text-ink-400">Join →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(home.live.length > 0 || home.upcoming.length > 0) && (
            <section aria-labelledby="events-h">
              <div className="mb-4 flex items-end justify-between">
                <h2 id="events-h" className="font-display text-2xl font-semibold text-white">
                  Hosted by {house.name}
                </h2>
                <Link href="/calendar" className={buttonClass("ghost", "sm")}>
                  <CalendarDays size={14} /> Event radar
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {[...home.live, ...home.upcoming].map((e) => (
                  <EventCard key={e.id} event={e} houses={houses} />
                ))}
              </div>
            </section>
          )}

          {home.past.length > 0 && (
            <section aria-labelledby="past-h">
              <h2 id="past-h" className="mb-4 font-display text-xl font-semibold text-white">
                Past shows
              </h2>
              <ul className="card divide-y divide-white/6">
                {home.past.map((e) => (
                  <li key={e.id}>
                    <Link href={`/e/${e.slug}`} className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-white/3">
                      <span className="timecode w-24 shrink-0 text-ink-500">{fmtDate(e.startsAt, { day: "numeric", month: "short" })}</span>
                      <span className="flex-1 truncate text-ink-100">{e.title}</span>
                      <span className="text-ink-400">Results →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="trend-h" className="card p-5">
            <h2 id="trend-h" className="eyebrow mb-3">
              Points this term
            </h2>
            <p className="timecode mb-2 text-3xl font-semibold text-white">
              <CountUp value={home.total} />
              <span className="ml-1 text-sm text-ink-400">pts</span>
            </p>
            <Sparkline points={home.history} color={house.color} label={`${house.name} cumulative points, now ${home.total}`} />
          </section>

          <section aria-labelledby="mvp-h" className="card p-5">
            <h2 id="mvp-h" className="eyebrow mb-4 flex items-center gap-2">
              <Sparkles size={12} /> Carrying the house
            </h2>
            {home.contributors.length === 0 ? (
              <p className="text-sm text-ink-400">Take part in an event to get on this board.</p>
            ) : (
              <ol className="space-y-3">
                {home.contributors.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="timecode w-5 text-center text-sm text-ink-500">{i === 0 ? <Crown size={15} className="mx-auto text-spot-400" /> : i + 1}</span>
                    <Avatar name={c.name} color={house.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{c.name}</p>
                      <p className="text-xs text-ink-400">
                        {c.podiums > 0 && (
                          <span className="mr-2 inline-flex items-center gap-1">
                            <Medal size={11} /> {c.podiums} podium{c.podiums === 1 ? "" : "s"}
                          </span>
                        )}
                        {c.credentials} credential{c.credentials === 1 ? "" : "s"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="awards-h" className="card p-5">
            <h2 id="awards-h" className="eyebrow mb-4 flex items-center gap-2">
              <Trophy size={12} /> Recent awards
            </h2>
            {home.awards.length === 0 ? (
              <p className="text-sm text-ink-400">No event awards yet this term.</p>
            ) : (
              <ul className="space-y-3">
                {home.awards.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="timecode h-fit shrink-0 rounded-md px-1.5 font-semibold text-paper" style={{ background: house.color }}>
                      +{a.points}
                    </span>
                    <span className="text-ink-200">{a.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex items-center gap-2 px-1 text-xs text-ink-500">
            <Users size={12} /> {house.members} members · points come only from event results
          </p>
        </aside>
      </div>
    </div>
  );
}
