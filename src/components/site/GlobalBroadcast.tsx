"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import { Burst } from "./Burst";
import { toast } from "./Toaster";

type Cast = { title: string; message: string; href: string | null; from: string; houseColor: string; at: number };
const SHOW_MS = 12_000;

/**
 * Listens to the site-wide channel. An admin broadcast dims the page and
 * drops a spotlight on the announcement; personal events (certificates,
 * mutes) become toasts on any page, not just the event room.
 */
export function GlobalBroadcast() {
  const [cast, setCast] = useState<Cast | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/live?scope=global");
    es.onmessage = (msg) => {
      const ev = JSON.parse(msg.data) as { type: string; payload: Record<string, unknown> };
      // Decided per message: event rooms stream the personal channel themselves.
      const personal = !location.pathname.startsWith("/e/");
      if (ev.type === "broadcast") {
        setCast(ev.payload as unknown as Cast);
        dispatchEvent(new Event("sc:gust"));
      }
      else if (personal && ev.type === "cert.issued") toast(`🎓 Your certificate is ready: ${ev.payload.achievement}`, { tone: "ok", href: `/c/${ev.payload.id}?claim=1`, cta: "Claim" });
      else if (personal && ev.type === "toast") toast(String(ev.payload.message));
    };
    return () => es.close();
  }, []);

  const [paused, setPaused] = useState(false);
  const returnFocus = useRef<Element | null>(null);

  // Remember and restore focus around the takeover (keyboard users land back where they were).
  useEffect(() => {
    if (cast) returnFocus.current = document.activeElement;
    else if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
  }, [cast]);

  useEffect(() => {
    if (!cast) return;
    // Auto-dismiss, but never while someone is hovering or focused inside (WCAG 2.2.1).
    const t = paused ? undefined : setTimeout(() => setCast(null), SHOW_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCast(null);
    addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      removeEventListener("keydown", onKey);
    };
  }, [cast, paused]);

  if (!cast) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="cast-title" aria-describedby="cast-msg" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onKeyDown={(e) => { if (e.key === "Tab") { const f = e.currentTarget.querySelectorAll<HTMLElement>("a,button"); if (f.length) { const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } } }} className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/80 px-4 backdrop-blur-sm animate-[fadein_.3s_ease-out]">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-full w-[70vw] max-w-3xl -translate-x-1/2 origin-top animate-[beam_1.1s_cubic-bezier(.2,.8,.2,1)_both] bg-[conic-gradient(from_180deg_at_50%_0%,transparent_158deg,rgb(255_210_138/0.32)_180deg,transparent_202deg)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[58%] h-24 w-[46rem] max-w-[90vw] -translate-x-1/2 rounded-[50%] bg-spot-400/20 blur-2xl" />
      <Burst color={cast.houseColor} count={110} />
      <div className="relative w-full max-w-2xl animate-[castin_.7s_.25s_cubic-bezier(.2,.8,.2,1)_both] text-center">
        <p className="eyebrow flex items-center justify-center gap-2 text-spot-300">
          <Megaphone size={13} /> Announcement · {cast.from}
        </p>
        <h2 id="cast-title" className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl" style={{ textShadow: `0 0 60px ${cast.houseColor}66` }}>
          {cast.title}
        </h2>
        <p id="cast-msg" className="mx-auto mt-4 max-w-xl text-lg text-ink-200">
          {cast.message}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {cast.href && (
            <Link href={cast.href} onClick={() => setCast(null)} className="rounded-full bg-spot-500 px-6 py-3 font-medium text-on-spot hover:bg-spot-400">
              Take me there
            </Link>
          )}
          <button autoFocus onClick={() => setCast(null)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-ink-100 hover:bg-white/5">
            <X size={16} /> Dismiss
          </button>
        </div>
        <div className="mx-auto mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-left bg-spot-400" style={{ animation: `shrink ${SHOW_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }} />
        </div>
      </div>
    </div>
  );
}
