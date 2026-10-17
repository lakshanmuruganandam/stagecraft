"use client";

import { useState } from "react";
import { Plus, Rocket, Save, Sparkles, X } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import { Button, Field, inputClass } from "@/components/ui/primitives";

/* ───────────────────────────── Polls ───────────────────────────── */

export function PollComposer() {
  const { run } = useLive();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [liveResults, setLiveResults] = useState(true);
  const [correct, setCorrect] = useState<number | null>(null);
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const filled = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim().length >= 3 && filled.length >= 2;

  async function submit(openNow: boolean) {
    if (!valid) return;
    setBusy(true);
    const kept = options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
    const correctIndex = correct === null ? null : kept.findIndex((x) => x.i === correct);
    const ok = await run("poll.create", {
      question,
      options: kept.map((x) => x.o),
      liveResults,
      correctIndex: correctIndex === -1 ? null : correctIndex,
      openNow,
      durationSec: openNow ? duration : 0,
    });
    setBusy(false);
    if (ok) {
      setQuestion("");
      setOptions(["", ""]);
      setCorrect(null);
    }
  }

  return (
    <form className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4" onSubmit={(e) => (e.preventDefault(), submit(true))}>
      <Field label="Poll question">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder="Which topic should we cover next?" className={inputClass} />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-[0.8rem] font-medium text-ink-200">Options · tick the correct one for a quiz</legend>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" aria-label={`Option ${i + 1} is the correct answer`} checked={correct === i} onChange={() => setCorrect(i)} onClick={() => correct === i && setCorrect(null)} className="accent-ok" />
            <input aria-label={`Option ${i + 1}`} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} maxLength={80} placeholder={`Option ${i + 1}`} className={`${inputClass} h-9`} />
            {options.length > 2 && (
              <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => (setOptions(options.filter((_, j) => j !== i)), setCorrect(null))} className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-white/8 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOptions([...options, ""])}>
            <Plus size={13} /> Add option
          </Button>
        )}
      </fieldset>
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-200">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={liveResults} onChange={(e) => setLiveResults(e.target.checked)} className="accent-spot-500" /> Show results live
        </label>
        <label className="flex items-center gap-2">
          Timer
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={`${inputClass} h-8 w-28`}>
            <option value={0}>No timer</option>
            <option value={30}>30 s</option>
            <option value={60}>60 s</option>
            <option value={120}>2 min</option>
            <option value={300}>5 min</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!valid || busy} onClick={() => submit(false)}>
          <Save size={13} /> Save draft
        </Button>
        <Button size="sm" disabled={!valid || busy}>
          <Rocket size={13} /> Launch now
        </Button>
      </div>
    </form>
  );
}

/* ──────────────────────────── Brackets ─────────────────────────── */

type Entrant = { name: string; houseId: string };

export function BracketBuilder() {
  const { state, run } = useLive();
  const [title, setTitle] = useState("Main bracket");
  const [game, setGame] = useState("");
  const [bestOf, setBestOf] = useState(3);
  const [bronze, setBronze] = useState(true);
  const [rows, setRows] = useState<Entrant[]>([
    { name: "", houseId: "" },
    { name: "", houseId: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const valid = rows.filter((r) => r.name.trim()).length >= 2 && title.trim().length >= 2;

  function quickFill() {
    const hosts = state.event.hostHouseIds.length >= 2 ? state.event.hostHouseIds : state.houses.map((h) => h.id).slice(0, 8);
    setRows(hosts.map((id) => ({ name: `${state.houses.find((h) => h.id === id)?.name ?? "Team"} ${game || "Squad"}`, houseId: id })));
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await run("bracket.create", { title, game: game || undefined, bestOf, thirdPlace: bronze, entrants: rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name, houseId: r.houseId || null })) });
        setBusy(false);
        if (ok) setRows([{ name: "", houseId: "" }, { name: "", houseId: "" }]);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
        <Field label="Bracket title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Game">
          <input value={game} onChange={(e) => setGame(e.target.value)} placeholder="Valorant" className={inputClass} />
        </Field>
        <Field label="Best of">
          <select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} className={inputClass}>
            {[1, 3, 5, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 flex w-full items-center justify-between text-[0.8rem] font-medium text-ink-200">
          <span>Entrants, in seed order (seed 1 first; byes go to the top seeds)</span>
        </legend>
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="timecode w-5 text-right text-xs text-ink-500">{i + 1}</span>
              <input aria-label={`Seed ${i + 1} team name`} value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Team name" className={`${inputClass} h-9`} />
              <select aria-label={`Seed ${i + 1} house`} value={r.houseId} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, houseId: e.target.value } : x)))} className={`${inputClass} h-9 w-36`}>
                <option value="">No house</option>
                {state.houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {rows.length > 2 && (
                <button type="button" aria-label={`Remove seed ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-white/8 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setRows([...rows, { name: "", houseId: "" }])} disabled={rows.length >= 64}>
            <Plus size={13} /> Add team
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={quickFill}>
            <Sparkles size={13} /> One team per host house
          </Button>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-200">
          <input type="checkbox" checked={bronze} onChange={(e) => setBronze(e.target.checked)} className="accent-spot-500" /> Play a bronze match
        </label>
        <Button size="sm" disabled={!valid || busy}>
          Generate bracket
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────────── Contests ────────────────────────── */

type Act = { performer: string; title: string; houseId: string };

export function ContestBuilder() {
  const { state, run } = useLive();
  const [title, setTitle] = useState("Audience Choice");
  const [weight, setWeight] = useState(60);
  const [votes, setVotes] = useState(1);
  const [acts, setActs] = useState<Act[]>([
    { performer: "", title: "", houseId: "" },
    { performer: "", title: "", houseId: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const valid = acts.filter((a) => a.performer.trim() && a.title.trim()).length >= 2;
  const set = (i: number, p: Partial<Act>) => setActs(acts.map((a, j) => (j === i ? { ...a, ...p } : a)));

  return (
    <form
      className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await run("contest.create", {
          title,
          judgeWeight: weight,
          votesPerUser: votes,
          acts: acts.filter((a) => a.performer.trim() && a.title.trim()).map((a) => ({ performer: a.performer, title: a.title, houseId: a.houseId || null })),
        });
        setBusy(false);
        if (ok) setActs([{ performer: "", title: "", houseId: "" }, { performer: "", title: "", houseId: "" }]);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Contest title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Votes per person">
          <select value={votes} onChange={(e) => setVotes(Number(e.target.value))} className={inputClass}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={`Scoring: judges ${weight}% · audience ${100 - weight}%`}>
        <input type="range" min={0} max={100} step={5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="accent-spot-500" />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[0.8rem] font-medium text-ink-200">Acts, in performance order</legend>
        <ol className="space-y-1.5">
          {acts.map((a, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_1fr_9rem_auto]">
              <input aria-label={`Act ${i + 1} performer`} value={a.performer} onChange={(e) => set(i, { performer: e.target.value })} placeholder="Performer" className={`${inputClass} h-9`} />
              <input aria-label={`Act ${i + 1} title`} value={a.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Act title" className={`${inputClass} h-9 max-sm:col-span-2 max-sm:row-start-2`} />
              <select aria-label={`Act ${i + 1} house`} value={a.houseId} onChange={(e) => set(i, { houseId: e.target.value })} className={`${inputClass} h-9 max-sm:row-start-3`}>
                <option value="">No house</option>
                {state.houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {acts.length > 2 ? (
                <button type="button" aria-label={`Remove act ${i + 1}`} onClick={() => setActs(acts.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-lg text-ink-400 hover:bg-white/8 hover:text-white max-sm:col-start-2 max-sm:row-start-1">
                  <X size={14} />
                </button>
              ) : (
                <span className="hidden sm:block sm:w-9" />
              )}
            </li>
          ))}
        </ol>
        <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setActs([...acts, { performer: "", title: "", houseId: "" }])}>
          <Plus size={13} /> Add act
        </Button>
      </fieldset>
      <div className="flex justify-end">
        <Button size="sm" disabled={!valid || busy}>
          Create contest
        </Button>
      </div>
    </form>
  );
}
