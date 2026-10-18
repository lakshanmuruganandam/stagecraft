"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
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
const css = /* css */ `
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
  z-index: 2;
  overflow-y: auto;
  overscroll-behavior: contain;
  clip-path: inset(0 0 0 0 round 0);
  transition: clip-path 900ms cubic-bezier(0.76, 0, 0.24, 1), transform 900ms cubic-bezier(0.76, 0, 0.24, 1), opacity 500ms ease, visibility 0s linear 0s;
}
/* Upcoming slides wait below and wipe up over the current one; past slides sink back like a stacked card. */
.pitch-slide[data-state="after"] { clip-path: inset(100% 0 0 0 round 48px 48px 0 0); z-index: 3; visibility: hidden; pointer-events: none;
  transition: clip-path 900ms cubic-bezier(0.76, 0, 0.24, 1), visibility 0s linear 900ms; }
.pitch-slide[data-state="before"] { transform: scale(0.92) translateY(-4%); opacity: 0; z-index: 1; visibility: hidden; pointer-events: none;
  transition: transform 900ms cubic-bezier(0.76, 0, 0.24, 1), opacity 700ms ease 200ms, visibility 0s linear 900ms; }
/* Going backwards: the past slide is now the one returning, so let it wipe down from the top instead. */
.pitch-root[data-dir="back"] .pitch-slide[data-state="current"] { z-index: 3; }
.pitch-root[data-dir="back"] .pitch-slide[data-state="after"] { clip-path: inset(0 0 0 0); transform: scale(0.92) translateY(4%); opacity: 0; z-index: 1;
  transition: transform 900ms cubic-bezier(0.76, 0, 0.24, 1), opacity 700ms ease 200ms, visibility 0s linear 900ms; }
.pitch-root[data-dir="back"] .pitch-slide[data-state="before"] { clip-path: inset(0 0 100% 0 round 0 0 48px 48px); transform: none; opacity: 1; }
.pitch-root[data-dir="back"] .pitch-slide[data-state="current"] { animation: pitch-wipe-down 900ms cubic-bezier(0.76, 0, 0.24, 1) both; }
@keyframes pitch-wipe-down { from { clip-path: inset(0 0 100% 0 round 0 0 48px 48px); } to { clip-path: inset(0 0 0 0 round 0); } }

/* Staggered reveals: the heading block, then every card, figure and chip inside it. */
.pitch-slide[data-state="current"] .pitch-rise > * { animation: pitch-rise 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: 380ms; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(2) { animation-delay: 480ms; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(3) { animation-delay: 580ms; }
.pitch-slide[data-state="current"] .pitch-rise > :nth-child(n + 4) { animation-delay: 680ms; }
.pitch-slide[data-state="current"] .pitch-rise .grid > *,
.pitch-slide[data-state="current"] .pitch-rise .flex-wrap > * { animation: pitch-pop 700ms cubic-bezier(0.2, 0.9, 0.25, 1.15) both; animation-delay: calc(520ms + var(--i, 0) * 55ms); }
${Array.from({ length: 14 }, (_, i) => `.pitch-rise .grid > :nth-child(${i + 1}), .pitch-rise .flex-wrap > :nth-child(${i + 1}) { --i: ${i}; }`).join("\n")}
.pitch-slide[data-state="current"] h2 { animation: pitch-title 1000ms cubic-bezier(0.2, 0.8, 0.2, 1) 420ms both; }
@keyframes pitch-rise { from { opacity: 0; transform: translateY(34px); } to { opacity: 1; transform: none; } }
@keyframes pitch-pop { from { opacity: 0; transform: translateY(26px) scale(0.94); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes pitch-title { from { opacity: 0; transform: translateY(0.4em); clip-path: inset(0 0 100% 0); } to { opacity: 1; transform: none; clip-path: inset(0 0 -20% 0); } }

/* Living backdrop: drifting light pools, a dot grid and a giant outlined slide number. */
.pitch-decor { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.pitch-orb { position: absolute; width: 46vmax; height: 46vmax; border-radius: 50%; filter: blur(10px); opacity: 0.55; will-change: transform; }
.pitch-slide[data-state="current"] .pitch-orb { animation: pitch-drift 18s ease-in-out infinite alternate; }
.pitch-slide[data-state="current"] .pitch-orb + .pitch-orb { animation-duration: 23s; animation-direction: alternate-reverse; }
@keyframes pitch-drift { 0% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(6vmax, -4vmax, 0) scale(1.12); } 100% { transform: translate3d(-5vmax, 3vmax, 0) scale(0.94); } }
.pitch-grid { position: absolute; inset: 0; background-image: radial-gradient(currentColor 1px, transparent 1.4px); background-size: 28px 28px; color: rgb(120 80 20 / 0.13);
  mask-image: radial-gradient(70% 60% at 70% 30%, #000, transparent 75%); }
[data-theme="stage"] .pitch-grid { color: rgb(255 210 140 / 0.10); }
.pitch-spot { position: absolute; inset: 0; background: radial-gradient(520px circle at var(--mx, 70%) var(--my, 20%), rgb(255 190 90 / 0.16), transparent 60%); }
.pitch-num { position: absolute; right: -0.04em; bottom: -0.2em; font-family: var(--font-display); font-weight: 700; font-size: clamp(14rem, 34vw, 30rem); line-height: 1;
  letter-spacing: -0.06em; color: transparent; -webkit-text-stroke: 2px rgb(200 120 20 / 0.16); }
[data-theme="stage"] .pitch-num { -webkit-text-stroke-color: rgb(255 190 90 / 0.14); }
.pitch-slide[data-state="current"] .pitch-num { animation: pitch-num 1400ms cubic-bezier(0.2, 0.8, 0.2, 1) 200ms both; }
@keyframes pitch-num { from { opacity: 0; transform: translateX(12%) rotate(4deg); } to { opacity: 1; transform: none; } }

/* Scroll hint on the title slide. */
.pitch-mouse { width: 22px; height: 34px; border: 2px solid currentColor; border-radius: 12px; position: relative; }
.pitch-mouse::after { content: ""; position: absolute; left: 50%; top: 6px; width: 3px; height: 7px; margin-left: -1.5px; border-radius: 2px; background: currentColor; animation: pitch-wheel 1.6s ease-in-out infinite; }
@keyframes pitch-wheel { 0% { opacity: 0; transform: translateY(-3px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(9px); } }

@media (prefers-reduced-motion: reduce) {
  .pitch-slide, .pitch-slide[data-state] { transition: none !important; transform: none !important; animation: none !important; }
  .pitch-slide *, .pitch-mouse::after { animation: none !important; }
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
  .pitch-slide, .pitch-slide[data-state] { clip-path: none !important; animation: none !important; }
  .pitch-slide * { animation: none !important; }
  .pitch-spot { display: none !important; }
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
  const root = useRef<HTMLDivElement>(null);
  const prev = useRef(index);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  // Remember travel direction so the wipe runs the right way.
  useEffect(() => {
    if (index === prev.current) return;
    const d = index > prev.current ? "fwd" : "back";
    prev.current = index;
    const t = setTimeout(() => setDir(d), 0);
    return () => clearTimeout(t);
  }, [index]);

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
        case "ArrowDown":
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
        case "ArrowUp":
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

  // Wheel / trackpad: scroll inside a tall slide first, then step one slide per gesture.
  // Trackpad inertia keeps firing for a second or more, so a step locks until the stream goes quiet.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let acc = 0, last = 0, stepAt = 0, locked = false;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom
      const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!dy) return;
      const now = performance.now();
      const gap = now - last;
      last = now;
      const cur = indexFromHash(total);
      const slide = document.getElementById(`slide-${cur + 1}`);
      if (!locked && slide) {
        const room = dy > 0 ? slide.scrollHeight - slide.clientHeight - slide.scrollTop : slide.scrollTop;
        if (room > 2 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return;
      }
      e.preventDefault();
      if (locked) {
        if ((now - stepAt > 700 && gap > 160) || now - stepAt > 1600) locked = false;
        else return;
      }
      if (gap > 250) acc = 0;
      acc += dy;
      if (Math.abs(acc) < 40) return;
      const next = cur + (acc > 0 ? 1 : -1);
      acc = 0;
      if (next < 0 || next >= total) return;
      locked = true;
      stepAt = now;
      go(next);
    };
    const onMove = (e: PointerEvent) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointermove", onMove);
    };
  }, [go, total]);

  const current = slides[index];
  const progress = ((index + 1) / total) * 100;

  return (
    <div
      ref={root}
      data-dir={dir}
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
            className="pitch-slide scrollbar-thin bg-ink-950 text-ink-100"
          >
            <div aria-hidden className="pitch-decor">
              {s.stage && (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(60% 55% at 50% -10%, rgb(255 169 40 / 0.30), transparent 70%), radial-gradient(40% 40% at 90% 110%, rgb(255 120 90 / 0.18), transparent 70%)",
                  }}
                />
              )}
              <span
                className="pitch-orb"
                style={{
                  left: `${[62, -12, 48, 70, -8, 55, 20, 66, -10, 58, 30, 64, 40][i % 13]}%`,
                  top: `${[-30, -20, 40, -35, 30, -25, -40, 25, -30, 35, -28, 20, -20][i % 13]}%`,
                  background: `radial-gradient(closest-side, ${["rgb(255 176 60 / .45)", "rgb(255 140 160 / .35)", "rgb(120 196 255 / .35)"][i % 3]}, transparent)`,
                }}
              />
              <span
                className="pitch-orb"
                style={{
                  left: `${[-15, 60, -10, 10, 65, -18, 58, 0, 62, -12, 55, -5, 60][i % 13]}%`,
                  top: `${[45, 50, -30, 55, 45, 50, 40, -35, 55, -25, 50, 55, 45][i % 13]}%`,
                  background: `radial-gradient(closest-side, ${["rgb(120 210 170 / .30)", "rgb(255 190 90 / .40)", "rgb(255 150 120 / .32)"][i % 3]}, transparent)`,
                }}
              />
              <div className="pitch-grid" />
              <div className="pitch-spot" />
              <span className="pitch-num">{String(i + 1).padStart(2, "0")}</span>
            </div>
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
      <div className="pitch-chrome">
        <div className="fixed inset-x-0 top-0 z-10 h-1 bg-white/8" aria-hidden>
          <div className="h-full bg-[linear-gradient(90deg,#ffb347,var(--color-spot-500),#ff7a59)] shadow-[0_0_12px_rgb(255_160_40/0.7)] transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
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
        <nav aria-label="Slides" className="fixed right-3 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-1 lg:flex">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index ? "step" : undefined}
              className="group relative flex h-5 items-center justify-end"
            >
              <span className="pointer-events-none absolute right-6 whitespace-nowrap rounded-full border border-white/10 bg-ink-900/90 px-2.5 py-1 text-xs text-ink-100 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
                {s.title}
              </span>
              <span
                className={`block h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-6 bg-spot-500" : "w-1.5 bg-ink-400/50 group-hover:w-3 group-hover:bg-ink-200"}`}
              />
            </button>
          ))}
        </nav>
        <div
          aria-hidden
          className={`fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-ink-900/70 px-4 py-2 text-xs text-ink-200 backdrop-blur-md transition duration-700 ${index === 0 ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
        >
          <span className="pitch-mouse text-spot-400" />
          Scroll, swipe or use the arrow keys
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {current ? `Slide ${index + 1} of ${total}: ${current.title}` : ""}
        </p>
      </div>
    </div>
  );
}
