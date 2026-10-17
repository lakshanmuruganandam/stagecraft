import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { EMPTY_ACTIVITY, evaluateQuests, summarize } from "@/lib/achievements";
import { activityFor, xpLeaderboard } from "@/server/odyssey";
import { listEvents, listHouses } from "@/server/queries";
import { Constellation } from "@/components/odyssey/Constellation";
import { LORE } from "@/components/odyssey/lore";
import { Avatar } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "House Odyssey",
  description: "Quests, badges and levels for every IITM BS house member. Light up the constellation by taking part in live events.",
};

export default function QuestsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow">House Odyssey · quests &amp; badges</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Light up your constellation</h1>
        <p className="mt-3 text-ink-300">Every star is a small quest you complete by taking part in house events. Finish one and the next ones unlock. Your badges, XP and level appear on your member card.</p>
      </header>
      <Suspense fallback={<div className="aspect-[1.6] animate-pulse rounded-3xl bg-white/4" />}>
        <QuestMap />
      </Suspense>
      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white/4" />}>
          <Leaders />
        </Suspense>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white/4" />}>
          <Lore />
        </Suspense>
      </div>
    </div>
  );
}

async function QuestMap() {
  const viewer = await getViewer();
  const [events, activity] = await Promise.all([listEvents(), viewer ? activityFor(viewer.id) : Promise.resolve(EMPTY_ACTIVITY)]);
  const pick = (kind: "talk" | "esports" | "cultural" | "hackathon") => {
    const e = events.find((x) => x.kind === kind && x.status === "live") ?? events.find((x) => x.kind === kind && x.status === "scheduled");
    return e ? { slug: e.slug, title: e.title } : undefined;
  };
  const eventFor = { talk: pick("talk"), esports: pick("esports"), cultural: pick("cultural"), hackathon: pick("hackathon") };
  const o = viewer ? summarize(activity) : null;
  return (
    <section aria-label="Quest constellation">
      {o && (
        <p className="mb-4 text-sm text-ink-300">
          <Link href={`/u/${viewer!.id}`} className="font-medium text-white underline-offset-4 hover:underline">
            {viewer!.name}
          </Link>{" "}
          · Level {o.level.level} {o.level.title} · {o.xp.toLocaleString("en-IN")} XP · {o.earned} badges
        </p>
      )}
      <Constellation quests={evaluateQuests(activity)} color={viewer?.house?.color ?? "#ffa928"} eventFor={eventFor} preview={!viewer} />
    </section>
  );
}

async function Leaders() {
  const [leaders, houses] = await Promise.all([xpLeaderboard(10), listHouses()]);
  const house = (id: string | null) => houses.find((h) => h.id === id);
  return (
    <section>
      <h2 className="eyebrow mb-3 flex items-center gap-2">
        <Trophy size={12} /> Top members this term
      </h2>
      <ol className="card divide-y divide-white/6">
        {leaders.length === 0 && <li className="p-5 text-sm text-ink-400">No XP earned yet.</li>}
        {leaders.map((m, i) => (
          <li key={m.id}>
            <Link href={`/u/${m.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/3">
              <span className={`timecode w-5 text-sm ${i < 3 ? "text-spot-400" : "text-ink-500"}`}>{i + 1}</span>
              <Avatar name={m.name} color={house(m.houseId)?.color} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{m.name}</span>
                <span className="block text-xs text-ink-400">
                  Lv {m.level} {m.title} · {house(m.houseId)?.name ?? "No house"}
                </span>
              </span>
              <span className="timecode text-sm text-ink-200">{m.xp}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function Lore() {
  const houses = await listHouses();
  return (
    <section>
      <h2 className="eyebrow mb-3">House lore · the twelve forests</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {houses.map((h, i) => {
          const l = LORE[h.slug];
          return (
            <li key={h.id} className="card group relative animate-rise overflow-hidden p-5" style={{ animationDelay: `${i * 35}ms` }}>
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: h.color }} />
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <span className="size-2.5 rounded-full" style={{ background: h.color }} />
                {h.name}
              </p>
              {l && (
                <>
                  <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.18em]" style={{ color: h.color }}>
                    {l.epithet}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{l.story}</p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
