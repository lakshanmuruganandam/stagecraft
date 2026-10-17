"use client";

import { useLive } from "./LiveProvider";
import { Button } from "@/components/ui/primitives";

export function RunOfShow() {
  const { state, run } = useLive();
  const segs = state.segments;
  if (!segs.length) return <p className="p-6 text-center text-sm text-ink-400">No run of show published.</p>;
  const currentIdx = segs.findIndex((s) => s.id === state.event.currentSegmentId);
  const starts = segs.map((_, i) => state.event.startsAt + segs.slice(0, i).reduce((m, x) => m + x.durationMin * 60_000, 0));
  return (
    <ol className="relative space-y-1 p-3">
      {segs.map((s, i) => {
        const start = starts[i];
        const state_ = i < currentIdx ? "done" : i === currentIdx ? "now" : "next";
        return (
          <li key={s.id} className={`flex items-start gap-3 rounded-xl p-3 ${state_ === "now" ? "bg-spot-500/10 ring-1 ring-spot-500/30" : ""}`}>
            <span className={`mt-1 size-2.5 shrink-0 rounded-full ${state_ === "now" ? "animate-tally bg-onair" : state_ === "done" ? "bg-ink-500" : "border border-ink-400"}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${state_ === "done" ? "text-ink-400 line-through decoration-ink-600" : "text-white"}`}>{s.title}</p>
              <p className="timecode text-xs text-ink-400">
                {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(start)} · {s.durationMin} min{s.speaker ? ` · ${s.speaker}` : ""}
              </p>
            </div>
            {state.canManage && state_ !== "now" && (
              <Button size="sm" variant="ghost" className="h-7" onClick={() => run("event.segment", { segmentId: s.id })}>
                Go
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
