import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { googleCalendarUrl, radarEvents } from "@/server/hub";
import { listHouses } from "@/server/queries";
import { siteUrl } from "@/lib/env";
import { KIND_LABEL, fmtTime } from "@/lib/format";
import { SubscribeButton } from "@/components/hub/SubscribeButton";
import { Badge, OnAir } from "@/components/ui/primitives";
import type { EventDTO, EventKind, HouseDTO } from "@/lib/types";

export const metadata: Metadata = {
  title: "Event radar",
  description: "Every IITM BS house event in one calendar: guest sessions, cultural stages, esports and hackathons.",
};

const KIND_COLOR: Record<EventKind, string> = { talk: "#3ddc97", cultural: "#ffa928", esports: "#ff4d6d", hackathon: "#5b9dff" };
const TZ = "Asia/Kolkata";
const ymd = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-[44rem] animate-pulse rounded-3xl bg-white/4" />}>
        <Radar searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function href(sp: SP, patch: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return `/calendar${s ? `?${s}` : ""}`;
}

async function Radar({ searchParams }: { searchParams: PageProps<"/calendar">["searchParams"] }) {
  const [sp, all, houses] = await Promise.all([searchParams, radarEvents(), listHouses()]);
  const now = requestTime();
  const view = one(sp.view) === "agenda" ? "agenda" : "month";
  const kind = one(sp.kind) as EventKind | undefined;
  const houseSlug = one(sp.house);
  const house = houses.find((h) => h.slug === houseSlug);
  const monthParam = one(sp.m);
  const valid = /^(\d{4})-(0[1-9]|1[0-2])$/.test(monthParam ?? "");
  const [y, m] = valid ? monthParam!.split("-").map(Number) : ymd(now).split("-").slice(0, 2).map(Number);

  const events = all.filter((e) => (!kind || e.kind === kind) && (!house || e.hostHouseIds.includes(house.id)));
  const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
  const origin = siteUrl();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow animate-rise">Event radar · all houses · IST</p>
          <h1 className="mt-2 animate-rise font-display text-4xl font-semibold tracking-tight text-white [animation-delay:60ms] sm:text-6xl">What&apos;s on.</h1>
          <p className="mt-3 max-w-xl animate-rise text-ink-300 [animation-delay:120ms]">Guest sessions, cultural nights, esports and hackathons from every house in one place. Subscribe once and your calendar stays in sync.</p>
        </div>
        <div className="flex animate-rise flex-wrap items-center gap-2 [animation-delay:160ms]">
          <div role="tablist" aria-label="View" className="flex rounded-full bg-white/5 p-1">
            <Link role="tab" aria-selected={view === "month"} href={href(sp, { view: null })} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${view === "month" ? "bg-white/10 text-white" : "text-ink-400 hover:text-white"}`}>
              <LayoutGrid size={14} /> Month
            </Link>
            <Link role="tab" aria-selected={view === "agenda"} href={href(sp, { view: "agenda" })} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${view === "agenda" ? "bg-white/10 text-white" : "text-ink-400 hover:text-white"}`}>
              <List size={14} /> Agenda
            </Link>
          </div>
          <SubscribeButton path="/api/calendar/feed.ics" />
        </div>
      </div>

      {/* Filters */}
      <nav aria-label="Filter events" className="mt-8 grid gap-2">
        <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!kind} href={href(sp, { kind: null })}>
          All kinds
        </Chip>
        {(Object.keys(KIND_LABEL) as EventKind[]).map((k) => (
          <Chip key={k} active={kind === k} href={href(sp, { kind: kind === k ? null : k })} dot={KIND_COLOR[k]}>
            {KIND_LABEL[k]}
          </Chip>
        ))}
        </div>
        <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!house} href={href(sp, { house: null })}>
          All houses
        </Chip>
        {houses.map((h) => (
          <Chip key={h.id} active={house?.id === h.id} href={href(sp, { house: house?.id === h.id ? null : h.slug })} dot={h.color}>
            {h.name}
          </Chip>
        ))}
        </div>
      </nav>

      {view === "month" ? (
        <section aria-label={monthLabel} className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-white">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <Link href={href(sp, { m: prev })} aria-label="Previous month" className="grid size-9 place-items-center rounded-full text-ink-300 hover:bg-white/8 hover:text-white">
                <ChevronLeft size={18} />
              </Link>
              <Link href={href(sp, { m: null })} className="rounded-full px-3 py-1.5 text-sm text-ink-300 hover:bg-white/8 hover:text-white">
                Today
              </Link>
              <Link href={href(sp, { m: next })} aria-label="Next month" className="grid size-9 place-items-center rounded-full text-ink-300 hover:bg-white/8 hover:text-white">
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
          <MonthGrid y={y} m={m} events={events} houses={houses} today={ymd(now)} />
        </section>
      ) : (
        <Agenda events={events} houses={houses} now={now} origin={origin} />
      )}
    </>
  );
}

function Chip({ active, href, dot, children }: { active: boolean; href: string; dot?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-spot-500/50 bg-spot-500/12 text-white" : "border-white/10 text-ink-300 hover:border-white/25 hover:text-white"}`}
    >
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      {children}
    </Link>
  );
}

function MonthGrid({ y, m, events, houses, today }: { y: number; m: number; events: EventDTO[]; houses: HouseDTO[]; today: string }) {
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<string, EventDTO[]>();
  for (const e of events) {
    const k = ymd(e.startsAt);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const color = (id: string) => houses.find((h) => h.id === id)?.color ?? "#777";
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/6 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="eyebrow py-2.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-16 border-b border-r border-white/5 bg-white/[0.01] sm:min-h-28" />;
          const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const list = byDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <div key={i} className={`relative min-h-16 border-b border-r border-white/5 p-1 sm:min-h-28 sm:p-2 ${isToday ? "bg-spot-500/6" : ""}`}>
              <span className={`timecode inline-grid size-6 place-items-center rounded-full text-xs ${isToday ? "bg-spot-500 font-semibold text-on-spot" : "text-ink-400"}`}>{d}</span>
              <ul className="mt-1 space-y-1">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/e/${e.slug}`}
                      title={`${e.title} · ${fmtTime(e.startsAt)} IST`}
                      className="group block truncate rounded-md border-l-2 bg-white/5 px-1.5 py-1 text-[0.65rem] leading-tight text-ink-100 transition hover:bg-white/10 sm:text-xs"
                      style={{ borderColor: KIND_COLOR[e.kind] }}
                    >
                      <span className="hidden sm:inline">
                        {e.status === "live" && <span className="mr-1 inline-block size-1.5 animate-tally rounded-full bg-onair align-middle" />}
                        <span className="timecode mr-1 text-ink-400">{fmtTime(e.startsAt)}</span>
                      </span>
                      {e.title}
                      <span className="mt-1 hidden gap-0.5 sm:flex">
                        {e.hostHouseIds.slice(0, 6).map((h) => (
                          <span key={h} className="size-1.5 rounded-full" style={{ background: color(h) }} />
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({ events, houses, now, origin }: { events: EventDTO[]; houses: HouseDTO[]; now: number; origin: string }) {
  const upcoming = events.filter((e) => e.endsAt >= now || e.status === "live");
  const past = events.filter((e) => !upcoming.includes(e)).reverse();
  const groups = new Map<string, EventDTO[]>();
  for (const e of upcoming) {
    const k = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(e.startsAt);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const house = (id: string) => houses.find((h) => h.id === id);
  const Row = ({ e, i }: { e: EventDTO; i: number }) => (
    <li className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
      <div className="card flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        <div className="w-20 shrink-0">
          <p className="timecode text-lg font-semibold text-white">{fmtTime(e.startsAt)}</p>
          <p className="timecode text-xs text-ink-500">to {fmtTime(e.endsAt)}</p>
        </div>
        <span aria-hidden className="hidden h-12 w-1 shrink-0 rounded-full sm:block" style={{ background: KIND_COLOR[e.kind] }} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {e.status === "live" ? <OnAir /> : e.status === "ended" ? <Badge tone="muted">Ended</Badge> : null}
            <Badge>{KIND_LABEL[e.kind]}</Badge>
          </div>
          <Link href={`/e/${e.slug}`} className="block truncate font-display text-lg font-semibold text-white hover:text-spot-300">
            {e.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
            {e.hostHouseIds.slice(0, 4).map((h) => (
              <span key={h} className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: house(h)?.color }} />
                {house(h)?.name}
              </span>
            ))}
            {e.hostHouseIds.length > 4 && <span>+{e.hostHouseIds.length - 4} more</span>}
          </p>
        </div>
        {e.status !== "ended" && (
          <div className="flex shrink-0 gap-2">
            <a href={`/api/events/${e.id}/ics`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 px-3 text-xs text-ink-100 hover:border-white/25" aria-label={`Add ${e.title} to calendar (.ics)`}>
              <CalendarPlus size={13} /> .ics
            </a>
            <a href={googleCalendarUrl(e, origin)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-full border border-white/12 px-3 text-xs text-ink-100 hover:border-white/25" aria-label={`Add ${e.title} to Google Calendar`}>
              Google
            </a>
          </div>
        )}
      </div>
    </li>
  );
  let i = 0;
  return (
    <div className="mt-8 grid gap-10">
      {upcoming.length === 0 && <p className="card p-8 text-center text-ink-400">Nothing scheduled for this filter yet.</p>}
      {[...groups].map(([day, list]) => (
        <section key={day} aria-label={day}>
          <h2 className="eyebrow mb-3">{day}</h2>
          <ul className="space-y-3">
            {list.map((e) => (
              <Row key={e.id} e={e} i={i++} />
            ))}
          </ul>
        </section>
      ))}
      {past.length > 0 && (
        <section aria-label="Past events">
          <h2 className="eyebrow mb-3">Earlier</h2>
          <ul className="space-y-3 opacity-80">
            {past.map((e) => (
              <Row key={e.id} e={e} i={i++} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Wall-clock time for this request (data was already read, so we're past prerender). */
function requestTime() {
  return Date.now();
}
