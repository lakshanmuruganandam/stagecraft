import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Deterministic pseudo-random bar heights from the label, so meters differ but never jump between renders. */
function bars(seed: string, n = 14) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: n }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    return 28 + (Math.abs(h) % 72);
  });
}

export function MeterStat({
  icon: Icon,
  label,
  value,
  note,
  href,
  hot,
  order,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note?: string;
  href?: string;
  hot?: boolean;
  order: number;
}) {
  const levels = bars(label);
  return (
    <div className="card group relative flex flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <dt className="eyebrow flex min-w-0 items-center gap-1.5 !text-[0.6rem] !tracking-[0.14em]">
          <Icon aria-hidden size={13} className={hot ? "shrink-0 text-onair" : "shrink-0 text-spot-400"} />
          <span className="min-w-0">{label}</span>
        </dt>
        <span aria-hidden className="timecode shrink-0 text-[0.58rem] tracking-[0.14em] text-ink-500">
          M{String(order + 1).padStart(2, "0")}
        </span>
      </div>
      <dd className="timecode mt-3 text-4xl font-semibold leading-none tracking-tight text-white sm:text-[2.6rem]">{value}</dd>
      {note && (
        <dd className="mt-1.5 text-[0.7rem] text-ink-400">
          {href ? (
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-white">
              {note}
            </Link>
          ) : (
            note
          )}
        </dd>
      )}
      <div aria-hidden className="mt-auto flex h-11 items-end gap-[3px] pt-4">
        {levels.map((l, i) => (
          <span
            key={i}
            className="wall-spark block flex-1 rounded-[2px]"
            style={{
              height: `${l}%`,
              background: i >= levels.length - 3 ? (hot ? "var(--onair)" : "var(--spot-500)") : "color-mix(in oklab, var(--fg) 14%, transparent)",
              ["--delay" as string]: `${(i * 0.17 + order * 0.3) % 2.4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
