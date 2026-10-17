import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, Award, BadgeCheck, MessagesSquare, Radio, Swords, Trophy, Vote } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { buttonClass, SectionTitle } from "@/components/ui/primitives";
import { leaderboard, listEvents, listHouses } from "@/server/queries";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-7xl space-y-16 px-4 pb-20 sm:px-6">
        <Suspense fallback={<GridSkeleton />}>
          <EventSections />
        </Suspense>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-white/3" />}>
          <HouseStrip />
        </Suspense>
        <Features />
      </div>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] lg:block">
        <Image src="/covers/hero.webp" alt="" fill priority sizes="62vw" className="object-cover object-left opacity-70 [mask-image:linear-gradient(90deg,transparent,black_35%,black_70%,transparent),linear-gradient(180deg,black_60%,transparent)] [mask-composite:intersect]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(255_169_40/0.18),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_150deg,rgb(255_210_138/0.10)_180deg,transparent_210deg)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
        <p className="eyebrow animate-rise">Live events · IITM BS houses</p>
        <h1 className="mt-4 max-w-4xl animate-rise font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-white [animation-delay:80ms] sm:text-7xl">
          The audience is <span className="relative whitespace-nowrap text-spot-400">part of the show<svg aria-hidden viewBox="0 0 300 12" className="absolute -bottom-2 left-0 w-full"><path d="M2 9c60-6 160-8 296-3" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" /></svg></span>.
        </h1>
        <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-ink-300 [animation-delay:160ms]">
          One place to run every house event, from guest talks to esports cups to talent hunts. Viewers ask, vote and predict live, and organizers run the whole show from one control room. Certificates are issued and signed the moment it ends.
        </p>
        <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
          <Link href="#live" className={buttonClass("primary", "lg")}>
            <Radio size={18} /> Watch what&apos;s live
          </Link>
          <Link href="/admin" className={buttonClass("outline", "lg")}>
            Open the control room <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

async function EventSections() {
  await connection();
  const [events, houses] = await Promise.all([listEvents(), listHouses()]);
  const live = events.filter((e) => e.status === "live");
  const upcoming = events.filter((e) => e.status === "scheduled");
  const past = events.filter((e) => e.status === "ended").reverse();
  return (
    <>
      <section id="live" className="scroll-mt-24">
        <SectionTitle eyebrow={`${live.length} on air`} title="Live now" />
        {live.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {live.map((e) => (
              <EventCard key={e.id} event={e} houses={houses} size="lg" />
            ))}
          </div>
        ) : (
          <p className="card p-8 text-center text-ink-400">Nothing is live right now. Check the schedule below.</p>
        )}
      </section>
      {upcoming.length > 0 && (
        <section>
          <SectionTitle eyebrow="Coming up" title="On the schedule" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} houses={houses} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <SectionTitle eyebrow="Recaps & results" title="Past events" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <EventCard key={e.id} event={e} houses={houses} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

async function HouseStrip() {
  await connection();
  const rows = await leaderboard();
  const max = Math.max(1, ...rows.map((r) => r.points));
  return (
    <section>
      <SectionTitle
        eyebrow="House cup"
        title="Where every house stands"
        action={
          <Link href="/leaderboard" className={buttonClass("ghost", "sm")}>
            Full standings <ArrowRight size={14} />
          </Link>
        }
      />
      <ol className="card grid gap-x-8 gap-y-3 p-5 sm:grid-cols-2 sm:p-6">
        {rows.slice(0, 8).map((r, i) => (
          <li key={r.id} className="grid grid-cols-[1.5rem_6.5rem_1fr_3.5rem] items-center gap-3 text-sm">
            <span className="timecode text-ink-400">{String(i + 1).padStart(2, "0")}</span>
            <span className="truncate font-medium text-white">{r.name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/6">
              <span className="block h-full rounded-full" style={{ width: `${(r.points / max) * 100}%`, background: r.color }} />
            </span>
            <span className="timecode text-right text-ink-200">{r.points}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Features() {
  const items = [
    { icon: MessagesSquare, title: "Guest speaker hub", body: "Questions are upvoted live and go through a moderation queue. The host can spotlight one question onto the stream." },
    { icon: Vote, title: "Real-time polls", body: "Timed polls with live or hidden results and quiz answers. They show up on stage the moment you launch them." },
    { icon: Swords, title: "Esports arena", body: "Seeded brackets with byes, a bronze match and score corrections, plus audience predictions that lock at kick-off." },
    { icon: Trophy, title: "Talent-hunt voting", body: "Audience votes and judge scores are blended with a weight you choose, and results stay sealed until the reveal." },
    { icon: Award, title: "Instant credentials", body: "One click on Wrap up issues signed certificates to winners and participants and awards house points." },
    { icon: BadgeCheck, title: "Verifiable anywhere", body: "Each certificate carries an Ed25519 signature and a QR code. Anyone can check it, even offline." },
  ];
  return (
    <section>
      <SectionTitle eyebrow="Why StageCraft" title="Everything around the stream" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-5">
            <Icon className="text-spot-400" size={22} />
            <h3 className="mt-3 font-display text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-72 animate-pulse rounded-[1.25rem] bg-white/4" />
      ))}
    </div>
  );
}
