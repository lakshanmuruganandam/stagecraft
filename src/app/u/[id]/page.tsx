import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, Award, Crown, Medal, Mic, Sparkles, Users } from "lucide-react";
import { certificatesFor } from "@/server/queries";
import { contributionsFor, memberById, odysseyFor } from "@/server/odyssey";
import { BadgeShelf, IdentityCard } from "@/components/odyssey/Identity";
import { LORE } from "@/components/odyssey/lore";
import { Badge, Empty } from "@/components/ui/primitives";
import { fmtDate, KIND_LABEL } from "@/lib/format";
import type { CertKind, EventKind } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/u/[id]">): Promise<Metadata> {
  const { id } = await params;
  const m = await memberById(id);
  if (!m) return { title: "Member not found" };
  const o = await odysseyFor(id);
  return { title: `${m.name} · Level ${o.level.level}`, description: `${m.name}${m.house ? ` of ${m.house.name} House` : ""}: ${o.earned} badges and ${o.xp} XP on StageCraft.` };
}

export default function MemberPage({ params }: PageProps<"/u/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-3xl bg-white/4" />}>
        <Portfolio params={params} />
      </Suspense>
    </div>
  );
}

const TRACKS: { label: string; kinds: EventKind[]; color: string }[] = [
  { label: "Technical", kinds: ["talk", "hackathon"], color: "#4dd8ff" },
  { label: "Cultural", kinds: ["cultural"], color: "#ffbf5c" },
  { label: "Esports & sports", kinds: ["esports"], color: "#ff6b8b" },
];

const CERT_ICON: Record<CertKind, typeof Award> = { winner: Crown, "runner-up": Medal, third: Medal, participant: Users, speaker: Mic, organizer: Sparkles };

async function Portfolio({ params }: { params: PageProps<"/u/[id]">["params"] }) {
  const { id } = await params;
  const m = await memberById(id);
  if (!m) notFound();
  const [o, contributions, certs] = await Promise.all([odysseyFor(id), contributionsFor(id), certificatesFor({ userId: id })]);
  const lore = m.house ? LORE[m.house.slug] : null;
  const trackTotals = TRACKS.map((t) => ({ ...t, value: contributions.filter((c) => t.kinds.includes(c.kind)).reduce((s, c) => s + c.actions, 0) }));
  const maxTrack = Math.max(1, ...trackTotals.map((t) => t.value));
  const validCerts = certs.filter((c) => !c.revokedAt);

  return (
    <div className="grid gap-12">
      {/* Identity */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <IdentityCard userId={id} />
        <div className="min-w-0">
          <p className="eyebrow">{m.house ? `${m.house.name} House · ${lore?.epithet ?? ""}` : "Member portfolio"}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">{m.name}</h1>
          <p className="mt-2 text-ink-300">
            Level {o.level.level} {o.level.title} · {o.xp.toLocaleString("en-IN")} XP · member since {fmtDate(m.createdAt, { month: "long", year: "numeric" })}
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Events", contributions.length],
              ["Badges", o.earned],
              ["Credentials", validCerts.length],
            ].map(([k, v]) => (
              <div key={k} className="card px-4 py-3">
                <dt className="eyebrow">{k}</dt>
                <dd className="timecode mt-1 text-2xl font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {lore && <p className="mt-6 max-w-xl border-l-2 pl-4 text-sm italic leading-relaxed text-ink-300" style={{ borderColor: m.house!.color }}>{lore.story}</p>}
        </div>
      </section>

      {/* Badges */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">Achievements</p>
            <h2 className="font-display text-2xl font-semibold text-white">Badge shelf</h2>
          </div>
          <Link href="/quests" className="inline-flex items-center gap-1 text-sm text-spot-300 hover:text-spot-400">
            Quest map <ArrowUpRight size={14} />
          </Link>
        </div>
        <BadgeShelf userId={id} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Tracks */}
        <section className="card p-6">
          <p className="eyebrow">Contributions by track</p>
          <h2 className="font-display text-xl font-semibold text-white">Where they show up</h2>
          <ul className="mt-6 grid gap-5">
            {trackTotals.map((t) => (
              <li key={t.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-100">{t.label}</span>
                  <span className="timecode text-ink-300">{t.value} actions</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/6">
                  <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${(t.value / maxTrack) * 100}%`, background: t.color }} />
                </div>
              </li>
            ))}
          </ul>
          <h3 className="eyebrow mb-3 mt-8">Recent credentials</h3>
          {validCerts.length === 0 ? (
            <p className="text-sm text-ink-400">No certificates yet.</p>
          ) : (
            <ul className="grid gap-2">
              {validCerts.slice(0, 5).map((c) => {
                const Icon = CERT_ICON[c.kind];
                return (
                  <li key={c.id}>
                    <Link href={`/c/${c.id}`} className="flex items-center gap-3 rounded-xl border border-white/6 px-3 py-2.5 transition hover:border-white/20">
                      <Icon size={16} className={c.kind === "winner" ? "text-spot-400" : "text-ink-300"} />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{c.achievement}</span>
                      <Badge tone="ok">verified</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Timeline */}
        <section className="card p-6">
          <p className="eyebrow">Activity</p>
          <h2 className="font-display text-xl font-semibold text-white">Event timeline</h2>
          {contributions.length === 0 ? (
            <Empty title="No events yet">Their journey starts at the next live show.</Empty>
          ) : (
            <ol className="relative mt-6 grid gap-5 border-l border-white/10 pl-6">
              {contributions.slice(0, 12).map((c) => (
                <li key={c.eventId} className="relative">
                  <span aria-hidden className="absolute -left-[1.85rem] top-1.5 size-3 rounded-full border-2 border-ink-950" style={{ background: TRACKS.find((t) => t.kinds.includes(c.kind))?.color }} />
                  <Link href={`/e/${c.slug}`} className="group block">
                    <p className="timecode text-xs text-ink-500">{fmtDate(c.startsAt, { day: "numeric", month: "short", year: "numeric" })} · {KIND_LABEL[c.kind]}</p>
                    <p className="font-medium text-white group-hover:text-spot-300">{c.title}</p>
                    <p className="text-sm text-ink-400">{c.actions} interaction{c.actions === 1 ? "" : "s"}</p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
