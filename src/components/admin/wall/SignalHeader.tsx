import type { EventStatus } from "@/lib/types";

const SIGNAL: Record<EventStatus, { label: string; note: (n: number) => string; color: string }> = {
  live: { label: "Live", note: (n) => `${n} ${n === 1 ? "channel" : "channels"} on air`, color: "var(--onair)" },
  scheduled: { label: "Upcoming", note: (n) => `schedule · ${n} queued`, color: "var(--spot-500)" },
  draft: { label: "Drafts", note: (n) => `off air · ${n} in prep`, color: "var(--ink-500)" },
  ended: { label: "Ended", note: (n) => `archive · ${n} recorded`, color: "var(--ink-400)" },
};

export function SignalHeader({ status, count, id }: { status: EventStatus; count: number; id: string }) {
  const s = SIGNAL[status];
  return (
    <div className="mb-5">
      <h2 id={id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 font-display text-2xl font-semibold uppercase tracking-tight text-white sm:text-[1.7rem]">
          <span
            aria-hidden
            className={`size-2.5 rounded-full ${status === "live" ? "animate-tally" : ""}`}
            style={{ background: s.color, boxShadow: status === "live" ? undefined : "inset 0 0 0 1px rgb(0 0 0 / 0.15)" }}
          />
          {s.label}
        </span>
        <span className="eyebrow rounded-full bg-ink-900/75 px-2.5 py-1 backdrop-blur-sm">
          <span className="sr-only">, </span>
          {s.note(count)}
        </span>
      </h2>
      <div aria-hidden className="wall-signal mt-3 h-px w-full rounded-full" style={{ ["--sig" as string]: s.color }} />
    </div>
  );
}
