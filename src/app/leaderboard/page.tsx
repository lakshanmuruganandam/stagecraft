import { Suspense } from "react";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { leaderboard, recentAwards } from "@/server/queries";
import { fmtRelative } from "@/lib/format";
import { connection } from "next/server";

export const metadata: Metadata = { title: "House leaderboard" };

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow">House cup · this term</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Leaderboard</h1>
      <p className="mt-2 max-w-xl text-ink-300">Points come straight from event results. Podium finishes and every member who takes part add to their house&apos;s total the moment an event wraps.</p>
      <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-3xl bg-white/4" />}>
        <Board />
      </Suspense>
    </div>
  );
}

async function Board() {
  await connection();
  const [rows, awards] = await Promise.all([leaderboard(), recentAwards(10)]);
  const max = Math.max(1, ...rows.map((r) => r.points));
  const now = requestTime();
  const podium = rows.slice(0, 3);
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-6 grid grid-cols-3 items-end gap-3">
          {[podium[1], podium[0], podium[2]].map((r, i) =>
            r ? (
              <div key={r.id} className="text-center">
                <p className="font-display text-lg font-semibold text-white">{r.name}</p>
                <p className="timecode text-sm text-ink-300">{r.points} pts</p>
                <div className="mt-2 grid place-items-center rounded-t-2xl" style={{ height: [120, 168, 96][i], background: `linear-gradient(180deg, ${r.color}, ${r.color}33)` }}>
                  <span className="font-display text-4xl font-bold text-on-spot/70">{[2, 1, 3][i]}</span>
                </div>
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
        <ol className="card divide-y divide-white/6">
          {rows.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[2rem_8rem_1fr_4rem] items-center gap-4 px-5 py-3.5">
              <span className="timecode text-ink-400">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex items-center gap-2 font-medium text-white">
                <span className="size-2.5 rounded-full" style={{ background: r.color }} />
                {r.name}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-white/6">
                <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.points / max) * 100}%`, background: r.color }} />
              </span>
              <span className="timecode text-right text-white">{r.points}</span>
            </li>
          ))}
        </ol>
      </div>
      <aside>
        <h2 className="eyebrow mb-3 flex items-center gap-2">
          <Trophy size={12} /> Latest awards
        </h2>
        <ul className="card divide-y divide-white/6">
          {awards.length === 0 && <li className="p-5 text-sm text-ink-400">No event awards yet.</li>}
          {awards.map((a) => (
            <li key={a.id} className="flex gap-3 px-4 py-3">
              <span className="timecode mt-0.5 shrink-0 rounded-md px-1.5 text-sm font-semibold text-on-spot" style={{ background: a.color }}>
                +{a.points}
              </span>
              <div className="min-w-0 text-sm">
                <p className="text-ink-100">{a.reason}</p>
                <p className="text-xs text-ink-500">
                  {a.house} · {fmtRelative(a.createdAt, now)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

/** Wall-clock time for this request (server component; read after connection()). */
function requestTime() {
  return Date.now();
}
