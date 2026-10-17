"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import { Player } from "@/components/live/Stage";
import { RunOfShow } from "@/components/live/RunOfShow";
import { Button, inputClass } from "@/components/ui/primitives";
import type { StageScene } from "@/lib/types";
import { Panel } from "./Panel";

const SCENES: { id: StageScene; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Shows whatever is happening" },
  { id: "question", label: "Question", hint: "Spotlighted Q&A" },
  { id: "poll", label: "Poll", hint: "Latest live poll" },
  { id: "bracket", label: "Bracket", hint: "Live match & tree" },
  { id: "contest", label: "Talent", hint: "Acts & results" },
  { id: "lower-third", label: "Lower third", hint: "Caption only" },
  { id: "blank", label: "Blank", hint: "Clear the overlay" },
];

/** Program monitor, stage scene switcher, lower third and run of show. */
export function StageDesk() {
  const { state, run } = useLive();
  const e = state.event;
  const [caption, setCaption] = useState(e.lowerThird ?? "");
  // Follow remote changes (e.g. a segment switch) without an effect.
  const [synced, setSynced] = useState(e.lowerThird);
  if (synced !== e.lowerThird) {
    setSynced(e.lowerThird);
    setCaption(e.lowerThird ?? "");
  }

  return (
    <div className="space-y-4">
      <Panel title="Program monitor">
        <div className="p-3">
          <Player />
        </div>
      </Panel>

      <Panel title="Stage scene" subtitle="What the stage view and OBS overlay show">
        <div role="radiogroup" aria-label="Stage scene" className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {SCENES.map((s) => {
            const on = e.stageScene === s.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                title={s.hint}
                onClick={() => run("event.scene", { scene: s.id })}
                className={`rounded-lg border px-2 py-2 text-left text-xs transition ${on ? "border-onair/60 bg-onair/12 text-white shadow-[inset_0_0_0_1px_rgb(255_59_59/0.25)]" : "border-white/8 text-ink-300 hover:border-white/20 hover:text-white"}`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {on && <span className="size-1.5 animate-tally rounded-full bg-onair" />}
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
        <form
          className="flex gap-2 border-t border-white/6 p-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            run("event.lowerThird", { text: caption || null });
          }}
        >
          <label htmlFor="lower-third" className="sr-only">
            Lower third caption
          </label>
          <input id="lower-third" value={caption} onChange={(ev) => setCaption(ev.target.value)} maxLength={120} placeholder="Lower third, e.g. Now speaking · Dr. Rao" className={`${inputClass} h-9`} />
          <Button size="sm" className="h-9">
            Set
          </Button>
          {e.lowerThird && (
            <Button size="sm" variant="ghost" type="button" className="h-9" onClick={() => run("event.lowerThird", { text: null })}>
              Clear
            </Button>
          )}
        </form>
      </Panel>

      <Panel title="Run of show">
        <RunOfShow />
        <SegmentsEditor />
      </Panel>
    </div>
  );
}

type Row = { title: string; speaker: string; durationMin: number };

function SegmentsEditor() {
  const { state, run } = useLive();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const start = () => {
    setRows(state.segments.map((s) => ({ title: s.title, speaker: s.speaker ?? "", durationMin: s.durationMin })));
    setOpen(true);
  };
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = r.slice();
      const j = i + d;
      if (j < 0 || j >= n.length) return r;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  if (!open)
    return (
      <div className="border-t border-white/6 p-3">
        <Button size="sm" variant="subtle" onClick={start}>
          Edit run of show
        </Button>
      </div>
    );

  return (
    <form
      className="space-y-2 border-t border-white/6 p-3"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const ok = await run("event.segments", { segments: rows.filter((r) => r.title.trim()).map((r) => ({ title: r.title, speaker: r.speaker || null, durationMin: Number(r.durationMin) || 5 })) });
        if (ok) setOpen(false);
      }}
    >
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-1.5 rounded-lg border border-white/6 p-2">
          <div className="grid gap-1.5 sm:grid-cols-[1fr_8rem_4.5rem]">
            <input aria-label={`Segment ${i + 1} title`} value={r.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Segment title" className={`${inputClass} h-8`} />
            <input aria-label={`Segment ${i + 1} speaker`} value={r.speaker} onChange={(e) => set(i, { speaker: e.target.value })} placeholder="Speaker" className={`${inputClass} h-8`} />
            <input aria-label={`Segment ${i + 1} minutes`} type="number" min={1} value={r.durationMin} onChange={(e) => set(i, { durationMin: Number(e.target.value) })} className={`${inputClass} h-8`} />
          </div>
          <div className="flex items-start gap-0.5">
            <IconB label="Move up" onClick={() => move(i, -1)}>
              <ArrowUp size={13} />
            </IconB>
            <IconB label="Move down" onClick={() => move(i, 1)}>
              <ArrowDown size={13} />
            </IconB>
            <IconB label="Remove segment" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
              <Trash2 size={13} />
            </IconB>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setRows((r) => [...r, { title: "", speaker: "", durationMin: 10 }])}>
          <Plus size={13} /> Add segment
        </Button>
        <span className="flex-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm">Publish run of show</Button>
      </div>
    </form>
  );
}

function IconB({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-7 place-items-center rounded-md text-ink-400 hover:bg-white/8 hover:text-white">
      {children}
    </button>
  );
}
