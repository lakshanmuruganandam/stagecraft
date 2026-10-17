"use client";

import { Tv } from "lucide-react";
import { useLive } from "./LiveProvider";
import { useClientValue } from "./useNow";
import { COVER, embedUrl } from "@/lib/format";
import { REACTIONS } from "@/lib/types";

/** Stream embed + lower third + floating reactions. */
export function Player() {
  const { state, reactions } = useLive();
  const host = useClientValue(() => location.hostname);
  const src = host ? embedUrl(state.event.streamUrl, host) : null;
  const e = state.event;

  return (
    <div data-theme="stage" className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/8 bg-black">
      {src && e.status === "live" ? (
        <iframe
          src={src}
          title={`${e.title} live stream`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          className="absolute inset-0 size-full"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg, rgb(5 5 7 / .55), rgb(5 5 7 / .85)), url(${COVER[e.kind]})` }}>
          <div className="text-center">
            <Tv className="mx-auto text-ink-400" size={36} />
            <p className="mt-3 font-display text-xl text-white">{e.status === "ended" ? "This show has wrapped" : e.status === "live" ? "Stream starting soon" : "The stage is being set"}</p>
            <p className="mt-1 text-sm text-ink-400">{e.status === "ended" ? "Results and certificates are below." : "Stay on this page and it goes live on its own."}</p>
          </div>
        </div>
      )}
      {e.lowerThird && e.status === "live" && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-16 animate-rise">
          <div className="inline-flex max-w-full items-center gap-3 rounded-lg bg-ink-950/85 py-2 pl-2 pr-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
            <span className="h-7 w-1 rounded-full bg-spot-500" />
            <span className="truncate text-sm font-medium text-white">{e.lowerThird}</span>
          </div>
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-6 h-full w-24">
        {reactions.map((r) => (
          <span key={r.id} className="absolute bottom-6 left-1/2 animate-floatup text-3xl" style={{ ["--drift" as string]: `${r.drift}px`, filter: `drop-shadow(0 0 10px ${r.color})` }}>
            {r.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReactionBar() {
  const { state, run } = useLive();
  if (!state.me || state.event.status !== "live") return null;
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Send a reaction">
      {REACTIONS.map((e) => (
        <button key={e} onClick={() => run("react", { emoji: e })} aria-label={`React ${e}`} className="grid size-9 place-items-center rounded-full text-lg transition hover:scale-110 hover:bg-white/8 active:scale-95">
          {e}
        </button>
      ))}
    </div>
  );
}
