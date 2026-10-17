import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { COVER, KIND_LABEL, fmtDate } from "@/lib/format";
import type { EventDTO, EventStatus, HouseDTO } from "@/lib/types";
import { TiltFrame } from "./TiltFrame";

const tc = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

const STATE: Record<EventStatus, { tag: string; screen: string; action: string; primary: boolean }> = {
  live: { tag: "REC", screen: "On air", action: "Enter control room", primary: true },
  scheduled: { tag: "CUE", screen: "Standby", action: "Enter control room", primary: true },
  draft: { tag: "BARS", screen: "Off air · draft", action: "Finish setup", primary: false },
  ended: { tag: "VTR", screen: "Off air · ended", action: "Results & certificates", primary: false },
};

/** Audio-level bars: [animation duration, delay] — staggered so they never sync up. */
const LEVELS = [
  [0.62, 0],
  [0.94, 0.12],
  [0.48, 0.3],
  [0.81, 0.05],
  [0.57, 0.22],
  [1.05, 0.4],
] as const;

export function MonitorTile({
  event: e,
  houses,
  participants,
  certs,
  maxParticipants,
  channel,
  order,
}: {
  event: EventDTO;
  houses: HouseDTO[];
  participants: number;
  certs: number;
  maxParticipants: number;
  channel: number;
  order: number;
}) {
  const st = STATE[e.status];
  const hosts = e.hostHouseIds.map((h) => houses.find((x) => x.id === h)).filter((h): h is HouseDTO => Boolean(h));
  const pct = maxParticipants > 0 ? Math.max(participants > 0 ? 4 : 0, Math.round((participants / maxParticipants) * 100)) : 0;
  const ch = `CH ${String(channel).padStart(2, "0")}`;
  const live = e.status === "live";
  const titleId = `tile-${e.id}`;

  return (
    <li className="min-w-0 animate-rise" style={{ animationDelay: `${Math.min(order, 8) * 60}ms` }}>
      <TiltFrame>
        <article
          aria-labelledby={titleId}
          className="group card relative p-2.5 transition-shadow has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-spot-400 hover:shadow-[0_24px_50px_-24px_rgb(80_50_10/0.45)] sm:p-3"
        >
          {/* ── The monitor ─────────────────────────────── */}
          <div data-theme="stage" className="wall-bezel rounded-[0.95rem] p-1.5 sm:p-2">
            <div className="wall-glass relative aspect-video overflow-hidden rounded-[0.6rem] bg-black text-white">
              {e.status === "draft" ? (
                <TestPattern />
              ) : (
                <Image
                  src={COVER[e.kind]}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                  className={clsx(
                    "object-cover transition-[filter,transform] duration-500 group-hover:scale-[1.03]",
                    e.status === "ended"
                      ? "brightness-[0.6] contrast-125 grayscale group-hover:brightness-75"
                      : "brightness-[0.78] group-hover:brightness-100 group-hover:saturate-125",
                  )}
                />
              )}
              <div aria-hidden className="absolute inset-0 mix-blend-soft-light" style={{ background: `linear-gradient(140deg, hsl(${e.hue} 90% 55% / 0.55), transparent 60%)` }} />
              <div aria-hidden className="wall-scan absolute inset-0" />
              <div aria-hidden className="wall-roll pointer-events-none absolute inset-x-0 top-0" />
              <div aria-hidden className="wall-vignette absolute inset-0" />
              <div aria-hidden className="wall-glare absolute inset-0" />

              {/* top row: channel + tally */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-3">
                <span aria-hidden className="timecode rounded bg-black/55 px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-[0.14em] text-white ring-1 ring-white/15 backdrop-blur-sm">
                  {ch}
                </span>
                <span
                  className={clsx(
                    "timecode inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] backdrop-blur-sm",
                    live ? "bg-onair text-white shadow-[0_0_18px_rgb(255_59_59/0.6)]" : "bg-black/55 text-ink-200 ring-1 ring-white/15",
                  )}
                >
                  <span aria-hidden className={clsx("size-1.5 rounded-full", live ? "animate-tally bg-white" : e.status === "scheduled" ? "bg-spot-400" : "bg-ink-500")} />
                  {st.screen}
                </span>
              </div>

              {e.status === "ended" && (
                <span aria-hidden className="wall-stamp absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
                  <span className="block -rotate-12 rounded-md border-2 border-white/70 px-3 py-1 font-display text-xl font-bold uppercase tracking-[0.2em] text-white/85 sm:text-2xl">
                    Off air
                  </span>
                </span>
              )}

              {/* lower third */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                <div className="mb-1.5 flex items-end justify-between gap-2">
                  <span aria-hidden className="timecode inline-flex items-center gap-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[0.62rem] tracking-[0.1em] text-ink-100 backdrop-blur-sm">
                    <span className={clsx("font-bold", live ? "text-onair" : "text-spot-400")}>
                      {live ? "● " : ""}
                      {st.tag}
                    </span>
                    {tc.format(e.startsAt)}:00
                  </span>
                  {live && <LevelMeter />}
                </div>
                <div className="flex items-stretch overflow-hidden rounded-md bg-black/70 ring-1 ring-white/10 backdrop-blur-md">
                  <span aria-hidden className="w-1.5 shrink-0" style={{ background: `hsl(${e.hue} 85% 58%)` }} />
                  <div className="min-w-0 px-2.5 py-1.5">
                    <h3 id={titleId} className="truncate font-display text-[0.95rem] font-semibold leading-tight text-white sm:text-base">
                      {e.title}
                    </h3>
                    <p className="timecode truncate text-[0.62rem] uppercase tracking-[0.14em] text-ink-300">
                      {fmtDate(e.startsAt)} · IST
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Console strip ───────────────────────────── */}
          <div className="px-1.5 pb-1 pt-3 sm:px-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="flex min-w-0 items-center gap-2 text-ink-300">
                <span aria-hidden className="flex shrink-0 -space-x-1">
                  {hosts.map((h) => (
                    <span key={h.id} className="size-3 rounded-full ring-2 ring-[var(--ink-900)]" style={{ background: h.color }} />
                  ))}
                </span>
                <span className="truncate">{hosts.map((h) => h.name).join(" × ") || "No host house"}</span>
              </p>
              <p className="eyebrow shrink-0 !text-[0.6rem]">{KIND_LABEL[e.kind]}</p>
            </div>

            <dl className="mt-3 grid grid-cols-[1fr_auto] items-end gap-x-4 gap-y-1">
              <div className="min-w-0">
                <dt className="sr-only">Took part</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="timecode text-lg font-semibold text-white">{participants}</span>
                  <span className="text-xs text-ink-400">took part</span>
                </dd>
                <dd aria-hidden className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <span
                    className="wall-fill absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, var(--ok), var(--spot-500) 70%, var(--onair))",
                      backgroundSize: `${pct > 0 ? 10000 / pct : 100}% 100%`,
                      ["--delay" as string]: `${200 + Math.min(order, 8) * 80}ms`,
                    }}
                  />
                  <span className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, transparent 0 9px, var(--ink-900) 9px 11px)" }} />
                </dd>
              </div>
              <div className="text-right">
                <dt className="sr-only">Certificates</dt>
                <dd className="flex items-baseline justify-end gap-1.5">
                  <span className="timecode text-lg font-semibold text-white">{certs}</span>
                  <span className="text-xs text-ink-400">{certs === 1 ? "certificate" : "certificates"}</span>
                </dd>
              </div>
            </dl>

            <Link
              href={`/admin/events/${e.id}`}
              className="mt-3.5 block outline-none after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
            >
              <span
                className={clsx(
                  "wall-key flex h-10 items-center justify-between gap-2 rounded-lg px-3.5 text-sm font-semibold",
                  st.primary ? "text-on-spot" : "text-white",
                )}
                style={
                  st.primary
                    ? { ["--key-top" as string]: "#ffb24d", ["--key-bot" as string]: "#ff9416", ["--key-edge" as string]: "#b35f00" }
                    : { ["--key-top" as string]: "var(--ink-850)", ["--key-bot" as string]: "var(--ink-800)", ["--key-edge" as string]: "var(--ink-600)" }
                }
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className={clsx("size-1.5 rounded-full", live ? "animate-tally bg-onair" : st.primary ? "bg-on-spot/50" : "bg-ink-500")} />
                  {st.action}
                  <span className="sr-only">: {e.title}</span>
                </span>
                <ArrowRight aria-hidden size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </article>
      </TiltFrame>
    </li>
  );
}

function LevelMeter() {
  return (
    <span aria-hidden className="flex h-5 items-end gap-[2px] rounded bg-black/55 px-1 py-0.5 backdrop-blur-sm">
      {LEVELS.map(([d, delay], i) => (
        <span
          key={i}
          className="wall-bar block h-full w-[3px] rounded-[1px]"
          style={{
            background: "linear-gradient(0deg, #3ddc97 0 55%, #ffcc4d 55% 80%, #ff3b3b 80%)",
            ["--d" as string]: `${d}s`,
            ["--delay" as string]: `${delay}s`,
          }}
        />
      ))}
    </span>
  );
}

/** SMPTE-style colour bars for drafts — nothing broadcast yet. */
function TestPattern() {
  const top = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
  const mid = ["#0000c0", "#131313", "#c000c0", "#131313", "#00c0c0", "#131313", "#c0c0c0"];
  return (
    <div aria-hidden className="absolute inset-0 grid grid-rows-[67fr_8fr_25fr] brightness-[0.82] transition-[filter] duration-500 group-hover:brightness-100">
      <div className="flex">{top.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}</div>
      <div className="flex">{mid.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}</div>
      <div className="flex">
        <span className="flex-[5]" style={{ background: "#00214c" }} />
        <span className="flex-[5]" style={{ background: "#ffffff" }} />
        <span className="flex-[5]" style={{ background: "#32006a" }} />
        <span className="flex-[9]" style={{ background: "#131313" }} />
        <span className="flex-[2]" style={{ background: "#090909" }} />
        <span className="flex-[2]" style={{ background: "#1d1d1d" }} />
      </div>
    </div>
  );
}
