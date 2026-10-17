"use client";

import { useLive } from "@/components/live/LiveProvider";
import { Panel } from "./Panel";

/** Live audience controls; each toggle applies instantly via the command bus. */
export function AudienceSettings() {
  const { state, run } = useLive();
  const s = state.event.settings;
  const toggles = [
    { key: "chatEnabled", label: "Chat open", on: s.chatEnabled },
    { key: "qaModeration", label: "Review questions first", on: s.qaModeration },
    { key: "allowAnonymousQa", label: "Allow anonymous questions", on: s.allowAnonymousQa },
  ] as const;

  return (
    <Panel title="Audience controls">
      <div className="divide-y divide-white/6">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span id={`set-${t.key}`} className="text-sm text-ink-200">
              {t.label}
            </span>
            <button
              role="switch"
              aria-checked={t.on}
              aria-labelledby={`set-${t.key}`}
              onClick={() => run("event.settings", { [t.key]: !t.on })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${t.on ? "bg-spot-500" : "bg-white/12"}`}
            >
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] ${t.on ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        ))}
        <label className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink-200">
          Slow mode
          <select
            value={s.slowModeSec}
            onChange={(e) => run("event.settings", { slowModeSec: Number(e.target.value) })}
            className="h-8 rounded-lg border border-white/10 bg-ink-850 px-2 text-sm"
          >
            <option value={0}>Off</option>
            <option value={3}>3 s</option>
            <option value={10}>10 s</option>
            <option value={30}>30 s</option>
          </select>
        </label>
      </div>
    </Panel>
  );
}
