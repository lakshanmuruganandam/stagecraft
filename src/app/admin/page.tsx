import { isDemo } from "@/lib/env";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Award, CalendarPlus, Radio, ShieldCheck, Trophy, Users } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { certificatesFor, engagement, leaderboard, listAllEventsForAdmin, listHouses } from "@/server/queries";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";
import { ResetDemo } from "@/components/admin/ResetDemo";
import { BroadcastComposer } from "@/components/admin/BroadcastComposer";
import { buttonClass } from "@/components/ui/primitives";
import { MeterStat } from "@/components/admin/wall/MeterStat";
import { MonitorTile } from "@/components/admin/wall/MonitorTile";
import { SignalHeader } from "@/components/admin/wall/SignalHeader";
import { WallStyles } from "@/components/admin/wall/WallStyles";
import type { EventStatus } from "@/lib/types";
import { securityStats } from "./_lib/users";

/** Signal type for each entry of `groups`, in order. */
const SIGNALS: EventStatus[] = ["live", "scheduled", "draft", "ended"];

export const metadata: Metadata = { title: "Control room" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const v = await getViewer();
  if (!v) return <Gate kind="signin" />;
  if (v.role !== "admin" && v.role !== "organizer") return <Gate kind="forbidden" />;
  const { reset } = await searchParams;

  const [events, houses, board] = await Promise.all([listAllEventsForAdmin(v), listHouses(), leaderboard()]);
  const [eng, certs, security] = await Promise.all([
    Promise.all(events.map((e) => engagement(e.id))),
    Promise.all(events.map((e) => certificatesFor({ eventId: e.id }))),
    v.role === "admin" ? securityStats() : Promise.resolve(null),
  ]);
  const myHouse = board.find((h) => h.id === v.houseId);
  const rank = myHouse ? board.indexOf(myHouse) + 1 : null;
  const groups: { title: string; eyebrow: string; items: typeof events }[] = [
    { title: "Live now", eyebrow: "On air", items: events.filter((e) => e.status === "live") },
    { title: "Upcoming", eyebrow: "Scheduled", items: events.filter((e) => e.status === "scheduled").reverse() },
    { title: "Drafts", eyebrow: "Not published", items: events.filter((e) => e.status === "draft") },
    { title: "Ended", eyebrow: "Archive", items: events.filter((e) => e.status === "ended") },
  ];

  const stats: { icon: typeof Radio; label: string; value: string | number; href?: string; note?: string }[] = [
    { icon: Radio, label: "Live events", value: groups[0].items.length },
    { icon: Users, label: "People who took part", value: eng.reduce((a, b) => a + b.participants, 0) },
    { icon: Award, label: "Certificates issued", value: certs.reduce((a, b) => a + b.length, 0) },
    { icon: Trophy, label: myHouse ? `${myHouse.name} points · #${rank}` : "House points", value: myHouse?.points ?? "–" },
    ...(security
      ? [{ icon: ShieldCheck, label: "Security", value: security.activeSessions24h, note: `active sessions (24h) · ${security.suspended} suspended`, href: "/admin/users?status=suspended" }]
      : []),
  ];

  const maxParticipants = Math.max(0, ...eng.map((x) => x.participants));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {v.role === "admin" ? "Admin · all houses" : `Organizer · ${v.house?.name ?? "no house"}`}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Control room</h1>
          <p className="mt-1 text-ink-300">Every event you can run, in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.role === "admin" && isDemo() && <ResetDemo />}
          <Link href="/admin/events/new" className={buttonClass("primary")}>
            <CalendarPlus size={16} /> New event
          </Link>
        </div>
      </div>

      {reset && <p className="mb-6 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-success">Demo data was reset to a fresh state.</p>}

      <WallStyles />
      <dl className={`mb-12 grid grid-cols-2 gap-3 ${stats.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {stats.map(({ icon, label, value, note, href }, i) => (
          <MeterStat key={label} icon={icon} label={label} value={value} note={note} href={href} hot={i === 0 && Number(value) > 0} order={i} />
        ))}
      </dl>

      {v.role === "admin" && (
        <div className="mb-12">
          <BroadcastComposer />
        </div>
      )}

      <div id="events" className="scroll-mt-28 space-y-10">
        {groups.map((g, gi) =>
          g.items.length ? (
            <section key={g.title} aria-labelledby={`wall-${SIGNALS[gi]}`}>
              <SignalHeader id={`wall-${SIGNALS[gi]}`} status={SIGNALS[gi]} count={g.items.length} />
              <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((e, i) => (
                  <MonitorTile
                    key={e.id}
                    event={e}
                    houses={houses}
                    participants={eng[events.indexOf(e)].participants}
                    certs={certs[events.indexOf(e)].length}
                    maxParticipants={maxParticipants}
                    channel={events.indexOf(e) + 1}
                    order={i}
                  />
                ))}
              </ul>
            </section>
          ) : null,
        )}
        {!events.length && (
          <div className="card p-10 text-center">
            <p className="font-display text-lg text-white">No events yet</p>
            <p className="mt-1 text-sm text-ink-400">Create your house&apos;s first event. It takes about a minute.</p>
          </div>
        )}
      </div>
    </div>
  );
}
