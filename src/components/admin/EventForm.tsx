"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { EventFormState } from "@/app/admin/actions";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import type { EventDTO, HouseDTO } from "@/lib/types";

type Action = (prev: EventFormState, form: FormData) => Promise<EventFormState>;

/** ms → "YYYY-MM-DDTHH:mm" in IST for a datetime-local input. */
function toIstLocal(ms: number) {
  const d = new Date(ms + 5.5 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

export function EventForm({
  action,
  houses,
  event,
  lockedHouseId,
  submitLabel,
  defaultStartMs,
}: {
  action: Action;
  houses: HouseDTO[];
  event?: EventDTO;
  /** Organizers must keep their own house as a host. */
  lockedHouseId?: string | null;
  submitLabel: string;
  /** Suggested start for new events (computed on the server). */
  defaultStartMs?: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const fe = state?.fieldErrors ?? {};
  // After a failed submit, defaults come from what the user typed.
  const typed = state?.values;
  const str = (k: string, fallback: string | number | undefined | null) => (typed && typeof typed[k] === "string" ? (typed[k] as string) : (fallback ?? undefined));
  const checked = (k: string, fallback: boolean) => (typed ? typed[k] === "on" : fallback);
  const hosts = new Set(typed ? (typed.hostHouseIds as string[]) : (event?.hostHouseIds ?? (lockedHouseId ? [lockedHouseId] : [])));
  const defaultStart = event ? toIstLocal(event.startsAt) : toIstLocal(defaultStartMs ?? 0);
  const duration = event ? Math.round((event.endsAt - event.startsAt) / 60_000) : 90;
  const pts = event?.settings.points ?? { first: 50, second: 30, third: 20, participant: 2 };
  const err = (k: string) => fe[k] && <span className="text-xs text-[#ff8a8a]">{fe[k]}</span>;

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {state?.error && (
        <p role="alert" className="rounded-xl border border-onair/40 bg-onair/10 px-4 py-3 text-sm text-[#ffd0d0]">
          {state.error}
        </p>
      )}

      <fieldset className="card grid gap-4 p-5">
        <legend className="eyebrow px-1">Basics</legend>
        <Field label="Title">
          <input name="title" required defaultValue={str("title", event?.title)} className={inputClass} aria-invalid={!!fe.title} placeholder="Inter-House Chess Blitz" />
          {err("title")}
        </Field>
        <Field label="Tagline" hint="One line shown on event cards.">
          <input name="tagline" defaultValue={str("tagline", event?.tagline ?? "")} className={inputClass} placeholder="12 players · 5-minute games · live commentary" />
        </Field>
        <Field label="Description">
          <textarea name="description" rows={4} defaultValue={str("description", event?.description)} className={`${inputClass} h-auto py-2`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Format">
            <select name="kind" defaultValue={str("kind", event?.kind ?? "talk")} className={inputClass}>
              <option value="talk">Guest session / talk</option>
              <option value="cultural">Cultural show / talent hunt</option>
              <option value="esports">Esports tournament</option>
              <option value="hackathon">Hackathon</option>
            </select>
          </Field>
          <Field label="Stream link" hint="YouTube or Twitch URL. You can add it later.">
            <input name="streamUrl" type="url" defaultValue={str("streamUrl", event?.streamUrl ?? "")} className={inputClass} aria-invalid={!!fe.streamUrl} placeholder="https://www.youtube.com/watch?v=…" />
            {err("streamUrl")}
          </Field>
        </div>
      </fieldset>

      <fieldset className="card grid gap-4 p-5">
        <legend className="eyebrow px-1">When & who</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts (IST)">
            <input name="startsAt" type="datetime-local" required defaultValue={str("startsAt", defaultStart)} className={inputClass} aria-invalid={!!fe.startsAt} />
            {err("startsAt")}
          </Field>
          <Field label="Duration (minutes)">
            <input name="durationMin" type="number" min={10} max={1440} defaultValue={str("durationMin", duration)} className={inputClass} />
            {err("durationMin")}
          </Field>
          <Field label="Visibility">
            <select name="status" defaultValue={str("status", event?.status === "draft" ? "draft" : "scheduled")} className={inputClass} disabled={event?.status === "live" || event?.status === "ended"}>
              <option value="scheduled">Published (scheduled)</option>
              <option value="draft">Draft (hidden)</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[0.8rem] font-medium text-ink-200">Host houses</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {houses.map((h) => (
              <label key={h.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/8 px-3 py-2 text-sm has-[:checked]:border-spot-500/50 has-[:checked]:bg-spot-500/8">
                <input type="checkbox" name="hostHouseIds" value={h.id} defaultChecked={hosts.has(h.id)} className="accent-spot-500" />
                <span className="size-2 rounded-full" style={{ background: h.color }} />
                {h.name}
                {h.id === lockedHouseId && <span className="ml-auto text-[0.65rem] text-ink-400">yours</span>}
              </label>
            ))}
          </div>
          {err("hostHouseIds")}
        </div>
      </fieldset>

      <fieldset className="card grid gap-4 p-5">
        <legend className="eyebrow px-1">Audience & rewards</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input type="checkbox" name="qaModeration" defaultChecked={checked("qaModeration", event?.settings.qaModeration ?? false)} className="accent-spot-500" /> Review questions before they appear
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input type="checkbox" name="allowAnonymousQa" defaultChecked={checked("allowAnonymousQa", event?.settings.allowAnonymousQa ?? true)} className="accent-spot-500" /> Allow anonymous questions
          </label>
          <Field label="Chat slow mode">
            <select name="slowModeSec" defaultValue={str("slowModeSec", event?.settings.slowModeSec ?? 0)} className={inputClass}>
              <option value={0}>Off</option>
              <option value={3}>3 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[0.8rem] font-medium text-ink-200">House points awarded on wrap-up</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["pointsFirst", "1st place", pts.first],
                ["pointsSecond", "2nd place", pts.second],
                ["pointsThird", "3rd place", pts.third],
                ["pointsParticipant", "Per participant", pts.participant],
              ] as const
            ).map(([name, label, val]) => (
              <Field key={name} label={label}>
                <input name={name} type="number" min={0} defaultValue={str(name, val)} className={inputClass} />
              </Field>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button size="lg" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
