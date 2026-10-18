"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

export type DeckSlide = {
  title: string;
  /** Rubric weight + criterion, e.g. "30% · Technical Architecture". */
  rubric?: string;
  /** Dark broadcast look for title / closing slides. */
  stage?: boolean;
  content: ReactNode;
};

/*
 * Deck chrome is scoped to `.pitch-root` so the rest of the site is untouched.
 * :has() hides the site header, footer and scenery while the deck is mounted.
 */
const css = `
body:has(.pitch-root) > header,
body:has(.pitch-root) > footer,
body:has(.pitch-root) > .scroll-beam,
body:has(.pitch-root) .scenery,
body:has(.pitch-root) > div:has(> button[aria-label^="Spot,"]) { display: none !important; }
body:has(.pitch-root)::before { display: none !important; }
html:has(.pitch-root), body:has(.pitch-root) { overflow: hidden; }

.pitch-slide {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  transition: opacity 600ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 0s;
}
.pitch-slide[data-state="before"],
.pitch-slide[data-state="after"] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 500ms ease, transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 700ms;
}
.pitch-slide[data-state="before"] { transform: translateX(-6%) scale(0.98); }
.pitch-slide[data-state="after"] { transform: translateX(6%) scale(0.98); }
.pitch-slide[data-state="current"] .pitch-rise > * { animation: pitch-rise 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(2) { animation-delay: 80ms; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(3) { animation-delay: 160ms; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(4) { animation-delay: 240ms; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(n + 5) { animation-delay: 320ms; }
@keyframes pitch-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .pitch-slide, .pitch-slide[data-state] { transition: none !important; transform: none !important; }
  .pitch-slide .pitch-rise > * { animation: none !important; }
}

@media print {
  @page { size: 1600px 900px; margin: 0; }
  html:has(.pitch-root), body:has(.pitch-root) { overflow: visible !important; height: auto !important; }
  .pitch-root { position: static !important; height: auto !important; }
  .pitch-stage { position: static !important; height: auto !important; overflow: visible !important; }
  .pitch-slide, .pitch-slide[data-state] {
    position: relative !important;
    inset: auto !important;
    height: 100vh !important;
    overflow: hidden !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    break-after: page;
    page-break-after: always;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pitch-slide .pitch-rise > * { animation: none !important; }
  .pitch-chrome { display: none !important; }
}
`;

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

function indexFromHash(total: number) {
  const n = Number.parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), total) - 1 : 0;
}

export function Deck({ slides }: { slides: DeckSlide[] }) {
  const total = slides.length;
  const index = useSyncExternalStore(
    subscribeHash,
    () => indexFromHash(total),
    () => 0,
  );
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (next: number) => {
      const i = Math.min(Math.max(next, 0), total - 1);
      if (i === indexFromHash(total) && window.location.hash) return;
      window.history.replaceState(null, "", `#${i + 1}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    },
    [total],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "VIDEO" || t?.isContentEditable) return;
      const cur = indexFromHash(total);
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          go(cur + 1);
          break;
        case " ":
          if (tag === "BUTTON" || tag === "A") return;
          e.preventDefault();
          go(e.shiftKey ? cur - 1 : cur + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          go(cur - 1);
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(total - 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total, toggleFullscreen]);

  const current = slides[index];
  const progress = ((index + 1) / total) * 100;

  return (
    <div
      className="pitch-root fixed inset-0 z-[45] bg-ink-950 text-ink-100"
      data-lenis-prevent
      aria-roledescription="carousel"
      aria-label="StageCraft jury deck"
      onTouchStart={(e) => {
        const p = e.touches[0];
        touch.current = p ? { x: p.clientX, y: p.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        const p = e.changedTouches[0];
        touch.current = null;
        if (!start || !p) return;
        const dx = p.clientX - start.x;
        const dy = p.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? index + 1 : index - 1);
      }}
    >
      <style>{css}</style>

      <div className="pitch-stage relative h-dvh w-full overflow-hidden">
        {slides.map((s, i) => (
          <section
            key={s.title}
            id={`slide-${i + 1}`}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${total}: ${s.title}`}
            aria-hidden={i !== index}
            inert={i !== index}
            data-state={i < index ? "before" : i > index ? "after" : "current"}
            data-theme={s.stage ? "stage" : undefined}
            className="pitch-slide scrollbar-thin bg-ink-950 text-ink-100"
          >
            {s.stage ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 55% at 50% -10%, rgb(255 169 40 / 0.22), transparent 70%), radial-gradient(40% 40% at 90% 110%, rgb(255 169 40 / 0.10), transparent 70%)",
                }}
              />
            ) : (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(55% 45% at 100% 0%, var(--glow), transparent 70%)" }}
              />
            )}
            <div className="relative mx-auto flex min-h-full w-full max-w-[88rem] flex-col px-5 pb-24 pt-8 sm:px-10 sm:pt-10 lg:px-16">
              {s.rubric && (
                <div className="mb-4 flex sm:mb-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-spot-500/40 bg-spot-500/12 px-3.5 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-spot-400">
                    <span className="size-1.5 rounded-full bg-spot-500" aria-hidden />
                    Rubric {s.rubric}
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col">{s.content}</div>
            </div>
          </section>
        ))}
      </div>

      {/* Chrome: progress, counter, controls */}
      <div className="pitch-chrome" data-theme={current?.stage ? "stage" : undefined}>
        <div className="fixed inset-x-0 top-0 z-10 h-1 bg-white/8" aria-hidden>
          <div className="h-full bg-spot-500 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <nav
          aria-label="Slide controls"
          className="fixed bottom-3 right-3 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/85 p-1 text-white shadow-lg backdrop-blur-md sm:bottom-5 sm:right-5"
        >
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous slide"
            className="grid size-9 place-items-center rounded-full hover:bg-white/8 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <span className="timecode min-w-[4.5rem] text-center text-xs text-ink-200" aria-hidden>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
            aria-label="Next slide"
            className="grid size-9 place-items-center rounded-full hover:bg-white/8 disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen (F)"
            className="grid size-9 place-items-center rounded-full hover:bg-white/8"
          >
            <Maximize2 className="size-4" aria-hidden />
          </button>
        </nav>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {current ? `Slide ${index + 1} of ${total}: ${current.title}` : ""}
        </p>
      </div>
    </div>
  );
}
