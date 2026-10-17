import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import type { EventDTO, HouseDTO } from "@/lib/types";
import { fmtDate, fmtTime, KIND_LABEL } from "@/lib/format";
import { Badge, OnAir } from "@/components/ui/primitives";

export function EventCard({ event, houses, size = "md" }: { event: EventDTO; houses: HouseDTO[]; size?: "md" | "lg" }) {
  const hosts = event.hostHouseIds.map((id) => houses.find((h) => h.id === id)).filter(Boolean) as HouseDTO[];
  const live = event.status === "live";
  return (
    <Link
      href={`/e/${event.slug}`}
      className="group relative block overflow-hidden rounded-[1.25rem] border border-white/8 bg-ink-900 transition hover:-translate-y-0.5 hover:border-white/18"
      style={{ ["--h" as string]: event.hue }}
    >
      {/* Stage: a lit backdrop in the event's hue */}
      <div className={`relative overflow-hidden ${size === "lg" ? "h-44 sm:h-52" : "h-32"}`}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 0%, hsl(${event.hue} 85% 55% / .55), transparent 65%), linear-gradient(180deg, hsl(${event.hue} 40% 14%), #0d0d12)` }} />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
        <div aria-hidden className="absolute left-1/2 top-0 h-full w-2/3 -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_160deg,rgb(255_255_255/0.12)_180deg,transparent_200deg)] opacity-70 transition group-hover:opacity-100" />
        <div className="absolute left-4 top-4 flex gap-2">
          {live ? <OnAir /> : event.status === "ended" ? <Badge tone="muted">Ended</Badge> : <Badge tone="spot">Upcoming</Badge>}
          <Badge>{KIND_LABEL[event.kind]}</Badge>
        </div>
        <div className="absolute bottom-3 left-4 flex -space-x-1.5">
          {hosts.slice(0, 6).map((h) => (
            <span key={h.id} title={h.name} className="size-5 rounded-full ring-2 ring-ink-900" style={{ background: h.color }} />
          ))}
          {hosts.length > 6 && <span className="ml-3 text-xs text-ink-300">+{hosts.length - 6}</span>}
        </div>
      </div>
      {/* Ticket stub */}
      <div className="relative border-t border-dashed border-white/12 p-4">
        <h3 className={`font-display font-semibold leading-snug tracking-tight text-white ${size === "lg" ? "text-xl" : "text-[1.05rem]"}`}>{event.title}</h3>
        {event.tagline && <p className="mt-1 line-clamp-1 text-sm text-ink-300">{event.tagline}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
          <span className="timecode inline-flex items-center gap-1.5">
            <CalendarDays size={13} /> {fmtDate(event.startsAt)}
          </span>
          <span className="timecode inline-flex items-center gap-1.5">
            <Clock size={13} /> {fmtTime(event.startsAt)} IST
          </span>
          <span>{hosts.map((h) => h.name).slice(0, 3).join(" × ")}{hosts.length > 3 ? " …" : ""}</span>
        </div>
      </div>
    </Link>
  );
}
