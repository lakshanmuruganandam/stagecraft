"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

/**
 * "Living Forest Sky": the scenery behind every page.
 *
 *   sky (real IST time of day)  →  sun/moon on its true arc + god rays
 *   →  drifting clouds  →  far ridges  →  mist  →  the House Range (12 peaks
 *   whose heights are the live house standings, each flying its pennant)
 *   →  forested hills  →  canvas: elephant grass + petals / fireflies
 *   →  a paper veil that rises as you scroll, so long reads stay crisp.
 *
 * Mouse and scroll drive parallax through CSS variables (no React renders
 * per frame). Stage theme turns the scene to a starry night. Reduced motion
 * renders one still frame. Admin broadcasts fire a gust + pollen burst.
 */

type Phase = "dawn" | "day" | "golden" | "dusk" | "night";
type Standing = { slug: string; name: string; color: string; points: number };

const W = 1600;
const H = 600;

/** IST hour → phase. Never dark by day; night only in Stage theme. */
function phaseFor(date: Date): Phase {
  const ist = (date.getUTCHours() + 5.5 + date.getUTCMinutes() / 60) % 24;
  if (ist >= 5 && ist < 8) return "dawn";
  if (ist >= 8 && ist < 16) return "day";
  if (ist >= 16 && ist < 18.75) return "golden";
  return "dusk";
}

/** 0..1 progress of the sun across the daylight sky (6:00 → 19:00 IST). */
function sunProgress(date: Date) {
  const ist = (date.getUTCHours() + 5.5 + date.getUTCMinutes() / 60) % 24;
  return Math.min(1, Math.max(0, (ist - 6) / 13));
}

// Deterministic pseudo-noise so server and client draw identical ridges.
const wave = (x: number, seed: number, amp: number, freqs: number[]) =>
  freqs.reduce((y, f, i) => y + Math.sin(x * f + seed * (i + 1) * 1.37) * (amp / (i + 1)), 0);

function ridgePath(base: number, seed: number, amp: number, freqs: number[]) {
  // Rounded so server (Node) and browser floating point always agree.
  let d = `M0 ${H} L0 ${(base + wave(0, seed, amp, freqs)).toFixed(1)}`;
  for (let x = 0; x <= W; x += 20) d += ` L${x} ${(base + wave(x, seed, amp, freqs)).toFixed(1)}`;
  return `${d} L${W} ${H} Z`;
}

/** The House Range: 12 smooth peaks, heights from the live standings. */
function houseRange(standings: Standing[]) {
  const n = 12;
  const pts = standings.length ? standings.map((s) => s.points) : Array.from({ length: n }, (_, i) => 300 - i * 15);
  const min = Math.min(...pts), max = Math.max(...pts, min + 1);
  // Leader stands in the middle; ranks alternate outward like a crown.
  const order = [11, 9, 7, 5, 3, 1, 0, 2, 4, 6, 8, 10];
  const peaks = order.map((rank, slot) => {
    const p = pts[rank] ?? min;
    const h = 70 + ((p - min) / (max - min)) * 110;
    return { x: Math.round(60 + slot * ((W - 120) / (n - 1))), y: Math.round(430 - h), rank, s: standings[rank] };
  });
  let d = `M0 ${H} L0 440`;
  let prev = { x: 0, y: 440 };
  for (const pk of peaks) {
    const mid = { x: Math.round((prev.x + pk.x) / 2), y: Math.round(Math.max(prev.y, pk.y) + 45) };
    d += ` Q${mid.x - 30} ${mid.y} ${mid.x} ${mid.y} T${pk.x} ${pk.y}`;
    prev = pk;
  }
  d += ` Q${W - 40} 450 ${W} 440 L${W} ${H} Z`;
  return { d, peaks };
}

function trees(seed: number, base: number, count: number) {
  const out: { x: number; y: number; s: number; kind: 0 | 1; o: number }[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const x = (i / count) * W + r * 18;
    const y = base + wave(x, seed, base > 500 ? 18 : 26, base > 500 ? [0.006, 0.017] : [0.004, 0.011]) + 6;
    const round = (v: number, p = 1) => Math.round(v * 10 ** p) / 10 ** p;
    out.push({ x: round(x), y: round(y), s: round(0.6 + r * 0.9, 2), kind: r > 0.45 ? 0 : 1, o: round(0.75 + r * 0.25, 2) });
  }
  return out;
}

const subscribeTheme = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const subscribeNone = () => () => {};

export function Scenery() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const stage = useSyncExternalStore(subscribeTheme, () => document.documentElement.dataset.theme === "stage", () => false);
  // ?sky=dawn|day|golden|dusk previews any time of day.
  const forced = useSyncExternalStore(subscribeNone, () => new URLSearchParams(location.search).get("sky") as Phase | null, () => null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    fetch("/api/houses/standings")
      .then((r) => r.json())
      .then(setStandings)
      .catch(() => {});
  }, []);

  const phase: Phase = stage ? "night" : forced ?? (now ? phaseFor(now) : "day");
  const forcedSun: Partial<Record<Phase, number>> = { dawn: 0.06, day: 0.42, golden: 0.86, dusk: 0.97 };
  const sun = forced ? forcedSun[forced] ?? 0.42 : now ? sunProgress(now) : 0.42;
  const sunX = 8 + sun * 84; // vw
  const sunY = phase === "night" ? 16 : 58 - Math.sin(sun * Math.PI) * 44; // vh

  const ridges = useMemo(
    () => ({
      far: ridgePath(300, 3, 40, [0.003, 0.009, 0.021]),
      far2: ridgePath(345, 7, 32, [0.0045, 0.012, 0.03]),
      hills: ridgePath(470, 11, 26, [0.004, 0.011]),
      front: ridgePath(530, 17, 18, [0.006, 0.017]),
      forest: trees(11, 470, 90),
      forest2: trees(17, 530, 70),
    }),
    [],
  );
  const range = useMemo(() => houseRange(standings), [standings]);

  // Parallax + scroll veil: CSS variables only, one rAF loop.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const veil = () => el.style.setProperty("--veil", Math.min(0.6, scrollY / 900).toFixed(3));
    if (reduce) {
      addEventListener("scroll", veil, { passive: true });
      veil();
      return () => removeEventListener("scroll", veil);
    }
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      m.tx = e.clientX / innerWidth - 0.5;
      m.ty = e.clientY / innerHeight - 0.5;
    };
    const frame = () => {
      m.x += (m.tx - m.x) * 0.05;
      m.y += (m.ty - m.y) * 0.05;
      el.style.setProperty("--mx", m.x.toFixed(4));
      el.style.setProperty("--my", m.y.toFixed(4));
      el.style.setProperty("--sy", String(Math.min(scrollY, 2000)));
      veil();
      raf = requestAnimationFrame(frame);
    };
    addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Canvas: elephant grass (wind + cursor) and petals / fireflies / pollen gusts.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0;
    let wind = 1, gust = 0;
    const mouse = { x: -9999, y: -9999 };
    const night = phase === "night" || phase === "dusk";
    const grassCols =
      phase === "night" ? ["#1f3a33", "#284a40", "#173028"] : phase === "dusk" ? ["#5b7a5e", "#6d8c6a", "#4b6a52"] : phase === "golden" ? ["#c99a3a", "#b8862b", "#d9ad52", "#9c7a2a"] : ["#6fa34a", "#8bbd57", "#5d8f3d", "#a3c96a"];

    type Blade = { x: number; h: number; c: string; ph: number; wdt: number };
    type Mote = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; c: string; life: number; kind: "petal" | "fly" | "pollen" };
    let blades: Blade[] = [];
    let motes: Mote[] = [];

    const resize = () => {
      w = cv.width = Math.round(innerWidth * dpr);
      h = cv.height = Math.round(innerHeight * 0.28 * dpr);
      blades = [];
      const n = Math.round(innerWidth / 5);
      for (let i = 0; i < n; i++) {
        const r = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
        blades.push({ x: (i / n) * w + r * 6 * dpr, h: (26 + r * 64) * dpr * (0.55 + 0.45 * Math.sin(i * 0.05) ** 2), c: grassCols[i % grassCols.length], ph: r * 6.28, wdt: (1.4 + r * 1.8) * dpr });
      }
    };
    const spawn = (kind: Mote["kind"]) => {
      if (kind === "fly") motes.push({ x: Math.random() * w, y: h * (0.15 + Math.random() * 0.7), vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3, r: (1.5 + Math.random() * 1.8) * dpr, rot: Math.random() * 6, vr: 0.05, c: "#fff3b0", life: 1, kind });
      else if (kind === "petal") motes.push({ x: -20, y: Math.random() * h * 0.6, vx: (0.6 + Math.random() * 0.9) * dpr, vy: (0.1 + Math.random() * 0.35) * dpr, r: (3 + Math.random() * 3) * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.06, c: ["#ff9fb4", "#ffb86b", "#ffd36e", "#f78fb3"][(Math.random() * 4) | 0], life: 1, kind });
      else motes.push({ x: Math.random() * w, y: h, vx: (Math.random() - 0.5) * 1.5 * dpr, vy: -(1.5 + Math.random() * 2.5) * dpr, r: (1.5 + Math.random() * 2.5) * dpr, rot: 0, vr: 0, c: ["#ffd36e", "#ffb347", "#fff1a8"][(Math.random() * 3) | 0], life: 1, kind });
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      gust *= 0.985;
      wind = 1 + Math.sin(t * 0.0006) * 0.35 + gust * 3;
      for (const b of blades) {
        const sway = Math.sin(t * 0.0016 + b.ph + b.x * 0.002) * 7 * dpr * wind;
        let push = 0;
        const dx = b.x - mouse.x;
        if (Math.abs(dx) < 120 * dpr && mouse.y > h * 0.25) push = (1 - Math.abs(dx) / (120 * dpr)) * Math.sign(dx || 1) * 26 * dpr;
        const tipX = b.x + sway + push, tipY = h - b.h;
        ctx.beginPath();
        ctx.moveTo(b.x - b.wdt, h);
        ctx.quadraticCurveTo(b.x + (sway + push) * 0.3, h - b.h * 0.55, tipX, tipY);
        ctx.quadraticCurveTo(b.x + (sway + push) * 0.3 + b.wdt * 0.5, h - b.h * 0.5, b.x + b.wdt, h);
        ctx.fillStyle = b.c;
        ctx.fill();
      }
      if (!reduce) {
        if (night && motes.filter((m) => m.kind === "fly").length < 26 && Math.random() < 0.08) spawn("fly");
        if (!night && motes.filter((m) => m.kind === "petal").length < 14 && Math.random() < 0.03) spawn("petal");
      }
      motes = motes.filter((m) => m.life > 0 && m.x < w + 40 && m.y > -40);
      for (const m of motes) {
        if (m.kind === "fly") {
          m.vx += (Math.random() - 0.5) * 0.05;
          m.vy += (Math.random() - 0.5) * 0.05;
          m.x += m.vx * dpr;
          m.y += m.vy * dpr;
          const a = 0.5 + Math.sin(t * 0.004 + m.rot) * 0.5;
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5);
          g.addColorStop(0, `rgba(255,243,176,${0.9 * a})`);
          g.addColorStop(1, "rgba(255,243,176,0)");
          ctx.fillStyle = g;
          ctx.fillRect(m.x - m.r * 5, m.y - m.r * 5, m.r * 10, m.r * 10);
        } else {
          m.x += m.vx * wind;
          m.y += m.vy + (m.kind === "pollen" ? 0 : Math.sin(t * 0.002 + m.rot) * 0.3);
          if (m.kind === "pollen") {
            m.vy *= 0.99;
            m.life -= 0.006;
          }
          m.rot += m.vr;
          ctx.save();
          ctx.globalAlpha = Math.max(0, m.life) * 0.9;
          ctx.translate(m.x, m.y);
          ctx.rotate(m.rot);
          ctx.fillStyle = m.c;
          ctx.beginPath();
          ctx.ellipse(0, 0, m.r, m.r * (m.kind === "petal" ? 0.55 : 1), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX * dpr;
      mouse.y = (e.clientY - innerHeight * 0.72) * dpr;
    };
    const onGust = () => {
      gust = 1;
      for (let i = 0; i < 70; i++) spawn("pollen");
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };

    resize();
    draw(0);
    addEventListener("resize", resize);
    addEventListener("sc:gust", onGust);
    if (!reduce) {
      addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("visibilitychange", onVis);
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("sc:gust", onGust);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase]);

  const P = (depth: number) => ({
    transform: `translate3d(calc(var(--mx, 0) * ${-depth * 40}px), calc(var(--sy, 0) * ${depth * 0.12}px + var(--my, 0) * ${-depth * 14}px), 0)`,
  });

  return (
    <div ref={root} aria-hidden data-phase={phase} className="scenery pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="scenery-sky absolute inset-0" />
      {phase === "night" && <div className="scenery-stars absolute inset-0" />}

      {/* Sun / moon on its real arc, with god rays */}
      <div className="absolute size-0" style={{ left: `${sunX}vw`, top: `${sunY}vh`, ...P(0.15) }}>
        <div className="scenery-rays absolute left-1/2 top-1/2 size-[110vmax] -translate-x-1/2 -translate-y-1/2" />
        <div className="scenery-sun absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Clouds */}
      {[
        { top: "9%", s: 1.1, d: 140, delay: -20, o: 0.95 },
        { top: "19%", s: 0.7, d: 190, delay: -90, o: 0.8 },
        { top: "5%", s: 0.55, d: 230, delay: -150, o: 0.7 },
        { top: "27%", s: 0.9, d: 170, delay: -50, o: 0.85 },
        { top: "14%", s: 1.35, d: 260, delay: -200, o: 0.6 },
      ].map((c, i) => (
        <div key={i} className="absolute left-0 w-full" style={{ top: c.top, ...P(0.25 + i * 0.05) }}>
          <svg viewBox="0 0 220 90" className="scenery-cloud absolute" style={{ width: `${220 * c.s}px`, opacity: c.o, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s` }}>
            <path d="M30 70 Q8 70 10 52 Q12 36 32 38 Q36 16 62 18 Q80 4 104 14 Q126 2 146 20 Q176 16 180 42 Q206 44 204 62 Q202 76 180 74 Z" fill="var(--cloud)" />
            <path d="M30 70 Q60 80 100 74 Q150 82 180 74 Q160 68 120 70 Q70 66 30 70Z" fill="var(--cloud-shade)" />
          </svg>
        </div>
      ))}

      {/* Mountains, mist, the House Range, forested hills */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[46vh] w-full">
        <defs>
          {/* Soft-edged mist without CSS blur filters (cheap to composite). */}
          <radialGradient id="mistfade">
            <stop offset="0" stopColor="var(--mist)" />
            <stop offset="1" stopColor="var(--mist)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g style={P(0.2)}>
          <path d={ridges.far} fill="var(--ridge-1)" />
        </g>
        <g style={P(0.3)}>
          <path d={ridges.far2} fill="var(--ridge-2)" />
        </g>
        <g className="scenery-mist" style={P(0.35)}>
          <ellipse cx="400" cy="345" rx="560" ry="60" fill="url(#mistfade)" />
          <ellipse cx="1250" cy="360" rx="520" ry="56" fill="url(#mistfade)" />
        </g>
        <g style={P(0.45)}>
          <path d={range.d} fill="var(--ridge-3)" />
          {range.peaks.map((pk) =>
            pk.s ? (
              <g key={pk.s.slug} transform={`translate(${pk.x} ${pk.y})`}>
                <line x1="0" y1="0" x2="0" y2="-34" stroke="var(--pole)" strokeWidth="2" />
                <path className="scenery-flag" d="M0 -34 L26 -28 L0 -21 Z" fill={pk.s.color} style={{ animationDelay: `${-pk.rank * 0.3}s` }} />
                {pk.rank === 0 && <circle cx="0" cy="-38" r="4" fill="#ffd36e" />}
              </g>
            ) : null,
          )}
        </g>
        <g className="scenery-mist scenery-mist-2" style={P(0.55)}>
          <ellipse cx="800" cy="452" rx="950" ry="50" fill="url(#mistfade)" />
        </g>
        <g style={P(0.7)}>
          <path d={ridges.hills} fill="var(--hill-1)" />
          {ridges.forest.map((t, i) => (
            <Tree key={i} {...t} fill="var(--tree-1)" />
          ))}
        </g>
        <g style={P(0.9)}>
          <path d={ridges.front} fill="var(--hill-2)" />
          {ridges.forest2.map((t, i) => (
            <Tree key={i} {...t} s={t.s * 1.25} fill="var(--tree-2)" />
          ))}
        </g>
      </svg>

      {/* Grass + motes */}
      <canvas ref={canvas} className="absolute inset-x-0 bottom-0 h-[28vh] w-full" />

      {/* Reading veil: rises as you scroll */}
      <div className="absolute inset-0 bg-ink-950" style={{ opacity: "var(--veil, 0)" }} />
    </div>
  );
}

function Tree({ x, y, s, kind, o, fill }: { x: number; y: number; s: number; kind: 0 | 1; o: number; fill: string }) {
  return kind === 0 ? (
    // Sal / conifer silhouette
    <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -46 L11 -20 L6 -20 L15 0 L-15 0 L-6 -20 L-11 -20 Z M-1.5 0 L1.5 0 L1.5 6 L-1.5 6Z" fill={fill} opacity={o} />
  ) : (
    // Broad-leaf canopy
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <rect x="-1.6" y="-10" width="3.2" height="16" fill={fill} />
      <circle cx="0" cy="-22" r="13" fill={fill} />
      <circle cx="-9" cy="-14" r="9" fill={fill} />
      <circle cx="9" cy="-15" r="9.5" fill={fill} />
    </g>
  );
}
