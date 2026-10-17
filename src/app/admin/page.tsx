import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowRight, Award, CalendarPlus, Radio, Trophy, Users } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { certificatesFor, engagement, leaderboard, listAllEventsForAdmin, listHouses } from "@/server/queries";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";
import { ResetDemo } from "@/components/admin/ResetDemo";
import { Badge, buttonClass, OnAir, SectionTitle } from "@/components/ui/primitives";
import { fmtDate, fmtTime, KIND_LABEL } from "@/lib/format";
import type { EventDTO, HouseDTO } from "@/lib/types";

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
  const [eng, certs] = await Promise.all([
    Promise.all(events.map((e) => engagement(e.id))),
    Promise.all(events.map((e) => certificatesFor({ eventId: e.id }))),
  ]);
  const myHouse = board.find((h) => h.id === v.houseId);
  const rank = myHouse ? board.indexOf(myHouse) + 1 : null;
  const groups: { title: string; eyebrow: string; items: typeof events }[] = [
    { title: "Live now", eyebrow: "On air", items: events.filter((e) => e.status === "live") },
    { title: "Upcoming", eyebrow: "Scheduled", items: events.filter((e) => e.status === "scheduled").reverse() },
    { title: "Drafts", eyebrow: "Not published", items: events.filter((e) => e.status === "draft") },
    { title: "Ended", eyebrow: "Archive", items: events.filter((e) => e.status === "ended") },
  ];

  const stats = [
    { icon: Radio, label: "Live events", value: groups[0].items.length },
    { icon: Users, label: "People who took part", value: eng.reduce((a, b) => a + b.participants, 0) },
    { icon: Award, label: "Certificates issued", value: certs.reduce((a, b) => a + b.length, 0) },
    { icon: Trophy, label: myHouse ? `${myHouse.name} points · #${rank}` : "House points", value: myHouse?.points ?? "–" },
  ];

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
          {v.role === "admin" && <ResetDemo />}
          <Link href="/admin/events/new" className={buttonClass("primary")}>
            <CalendarPlus size={16} /> New event
          </Link>
        </div>
      </div>

      {reset && <p className="mb-6 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-[#c9f7e4]">Demo data was reset to a fresh state.</p>}

      <dl className="mb-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4 sm:p-5">
            <dt className="flex items-center gap-2 text-xs text-ink-400">
              <Icon size={14} className="text-spot-400" /> {label}
            </dt>
            <dd className="timecode mt-2 text-3xl font-semibold text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-10">
        {groups.map((g) =>
          g.items.length ? (
            <section key={g.title}>
              <SectionTitle eyebrow={`${g.eyebrow} · ${g.items.length}`} title={g.title} />
              <ul className="card divide-y divide-white/6">
                {g.items.map((e) => (
                  <EventRow key={e.id} event={e} houses={houses} participants={eng[events.indexOf(e)].participants} certs={certs[events.indexOf(e)].length} />
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

function EventRow({ event: e, houses, participants, certs }: { event: EventDTO; houses: HouseDTO[]; participants: number; certs: number }) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <span aria-hidden className="hidden h-12 w-1.5 shrink-0 rounded-full sm:block" style={{ background: `hsl(${e.hue} 80% 55%)` }} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {e.status === "live" ? <OnAir /> : <Badge tone={e.status === "draft" ? "muted" : e.status === "ended" ? "neutral" : "spot"}>{e.status}</Badge>}
          <Badge>{KIND_LABEL[e.kind]}</Badge>
        </div>
        <p className="truncate font-display text-lg font-semibold text-white">{e.title}</p>
        <p className="timecode text-xs text-ink-400">
          {fmtDate(e.startsAt)} · {fmtTime(e.startsAt)} IST · {e.hostHouseIds.map((h) => houses.find((x) => x.id === h)?.name).filter(Boolean).join(" × ")}
        </p>
      </div>
      <div className="flex items-center gap-5 text-xs text-ink-400">
        <span>
          <span className="timecode block text-base text-white">{participants}</span>took part
        </span>
        <span>
          <span className="timecode block text-base text-white">{certs}</span>certificates
        </span>
      </div>
      <Link href={`/admin/events/${e.id}`} className={buttonClass(e.status === "live" ? "primary" : "outline", "sm")}>
        Open control room <ArrowRight size={14} />
      </Link>
    </li>
  );
}
