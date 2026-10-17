"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

/** Tips Spot offers, by page. The first one shows on arrival; a click cycles. */
const TIPS: { match: (p: string) => boolean; lines: string[] }[] = [
  { match: (p) => p === "/", lines: ["Psst, three shows are on air right now! 🎬", "Press ⌘K to jump anywhere.", "Those mountains? That's the House Cup, live. 🏔️", "Scroll down: I'll walk you through a show."] },
  { match: (p) => p.startsWith("/e/"), lines: ["Upvote questions you want answered! ▲", "Tap a reaction and watch it float up. 🔥", "Predictions lock when a match goes live."] },
  { match: (p) => p.startsWith("/houses"), lines: ["Every point here came from a real event.", "Peek at a house's common room. 🏡"] },
  { match: (p) => p.startsWith("/quests"), lines: ["Light up the constellation, star by star. ✨", "Cross-house events earn bonus XP!"] },
  { match: (p) => p.startsWith("/admin"), lines: ["You're the director now. 🎬", "Wrap up issues signed certificates in one click."] },
  { match: (p) => p.startsWith("/c/") || p.startsWith("/verify"), lines: ["Edit one character of a cert and watch it fail. 🔐", "Anyone can verify, even offline."] },
  { match: () => true, lines: ["Hi! I'm Spot, the house stage light. 💡", "Press ⌘K to find anything."] },
];

/**
 * Spot: StageCraft's guide. A hand-drawn SVG stage light whose eyes follow
 * the cursor, who blinks, bobs, beams on hover and offers page-aware tips.
 * Dismissible (remembered), keyboard-operable, still for reduced motion.
 */
export function Spot() {
  const path = usePathname();
  const tips = (TIPS.find((t) => t.match(path)) ?? TIPS[TIPS.length - 1]).lines;
  const [i, setI] = useState(0);
  const [hidden, setHidden] = useState(true);
  const [talk, setTalk] = useState(false);
  const eyes = useRef<SVGGElement>(null);
  const body = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let off = false;
    try {
      off = localStorage.getItem("sc-spot") === "off";
    } catch {
      /* private mode */
    }
    const t1 = setTimeout(() => setHidden(off), 0);
    return () => clearTimeout(t1);
  }, []);

  // New page: first tip, spoken briefly.
  useEffect(() => {
    const a = setTimeout(() => {
      setI(0);
      setTalk(true);
    }, 1200);
    const b = setTimeout(() => setTalk(false), 10000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [path]);

  // Eyes track the pointer.
  useEffect(() => {
    if (hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = body.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.4);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 300);
      target.x = (dx / d) * 4.2 * k;
      target.y = (dy / d) * 3.4 * k;
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.15;
      cur.y += (target.y - cur.y) * 0.15;
      eyes.current?.setAttribute("transform", `translate(${cur.x.toFixed(2)} ${cur.y.toFixed(2)})`);
      raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [hidden]);

  if (hidden) return null;
  const say = () => {
    setTalk(true);
    setI((x) => (x + 1) % tips.length);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-end gap-2 print:hidden">
      {talk && (
        <div role="status" className="relative mb-12 max-w-[15rem] animate-[castin_.45s_cubic-bezier(.2,.8,.2,1)_both] rounded-2xl rounded-br-sm border border-white/10 bg-ink-850 px-4 py-3 text-sm leading-snug text-ink-100 shadow-[0_18px_40px_-18px_rgb(60_35_5/0.45)]">
          {tips[i % tips.length]}
          <button
            onClick={() => {
              setHidden(true);
              try {
                localStorage.setItem("sc-spot", "off");
              } catch {
                /* ignore */
              }
            }}
            aria-label="Hide Spot"
            className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-white/10 bg-ink-850 text-ink-400 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <button ref={body} onClick={say} aria-label="Spot, your StageCraft guide. Show a tip" className="group relative size-20 animate-[bob_3.2s_ease-in-out_infinite] motion-reduce:animate-none">
        {/* Beam on hover / focus */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-[70%] h-28 w-24 -translate-x-1/2 origin-top scale-y-0 bg-[linear-gradient(180deg,rgb(255_211_110/0.55),transparent)] opacity-0 transition duration-300 [clip-path:polygon(35%_0,65%_0,100%_100%,0_100%)] group-hover:scale-y-100 group-hover:opacity-100 group-focus-visible:scale-y-100 group-focus-visible:opacity-100" />
        <svg viewBox="0 0 80 80" className="relative drop-shadow-[0_10px_14px_rgb(60_35_5/0.35)]">
          <path d="M14 40 Q14 18 40 16 Q66 18 66 40" fill="none" stroke="#3a2c1a" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 66 L27 76 M50 66 L53 76" stroke="#3a2c1a" strokeWidth="4" strokeLinecap="round" />
          <rect x="16" y="22" width="48" height="46" rx="18" fill="#ff9a1f" />
          <rect x="16" y="22" width="48" height="16" rx="8" fill="#ffb24d" />
          <circle cx="58" cy="30" r="3" fill="#fff3c4" opacity=".8" />
          <circle cx="40" cy="47" r="17" fill="#fff7e2" />
          <circle cx="40" cy="47" r="17" fill="none" stroke="#e07f00" strokeWidth="2.5" />
          <g ref={eyes}>
            <g className="spot-blink">
              <ellipse cx="34" cy="45" rx="3.2" ry="4.2" fill="#2a1d10" />
              <ellipse cx="46" cy="45" rx="3.2" ry="4.2" fill="#2a1d10" />
              <circle cx="35.2" cy="43.6" r="1.1" fill="#fff" />
              <circle cx="47.2" cy="43.6" r="1.1" fill="#fff" />
            </g>
          </g>
          <ellipse cx="29" cy="53" rx="3" ry="1.8" fill="#ff8fa3" opacity=".6" />
          <ellipse cx="51" cy="53" rx="3" ry="1.8" fill="#ff8fa3" opacity=".6" />
          <path d="M36 55 Q40 58.5 44 55" fill="none" stroke="#2a1d10" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
