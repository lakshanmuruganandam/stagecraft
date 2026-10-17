/**
 * Keyframes + effect classes for the broadcast monitor wall. Rendered as a
 * hoisted, de-duplicated <style> (React 19 `href` + `precedence`), so the wall
 * ships its own effects without touching the global stylesheet.
 */
const css = String.raw`
.wall-scan {
  background-image: repeating-linear-gradient(180deg, rgb(0 0 0 / 0.28) 0 1px, transparent 1px 4px);
  background-size: 100% 4px;
  animation: wall-scan-drift 9s linear infinite;
  mix-blend-mode: multiply;
}
@keyframes wall-scan-drift { from { background-position: 0 0; } to { background-position: 0 96px; } }
.wall-roll {
  background: linear-gradient(180deg, transparent, rgb(255 255 255 / 0.07) 45%, rgb(255 255 255 / 0.12) 50%, transparent);
  height: 30%;
  animation: wall-roll 7s linear infinite;
}
@keyframes wall-roll { from { transform: translateY(-110%); } to { transform: translateY(380%); } }
.wall-vignette { background: radial-gradient(ellipse 120% 90% at 50% 45%, transparent 55%, rgb(0 0 0 / 0.55) 100%); }
.wall-bezel {
  background: linear-gradient(160deg, #2a2a33, #111116 55%, #1c1c23);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.12) inset, 0 -1px 0 rgb(0 0 0 / 0.6) inset, 0 18px 40px -22px rgb(20 10 0 / 0.55);
}
.wall-glass { box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.7), inset 0 0 28px rgb(0 0 0 / 0.65), inset 0 2px 10px rgb(0 0 0 / 0.6); }
.wall-glare { background: linear-gradient(115deg, rgb(255 255 255 / 0.10), transparent 32%); }

.wall-bar { transform-origin: bottom; animation: wall-level var(--d, 0.9s) ease-in-out infinite alternate; animation-delay: var(--delay, 0s); }
@keyframes wall-level { 0% { transform: scaleY(0.18); } 40% { transform: scaleY(0.85); } 70% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }

.wall-fill { transform-origin: left; animation: wall-fill 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: var(--delay, 0s); }
@keyframes wall-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.wall-signal {
  background: linear-gradient(90deg, transparent, var(--sig, var(--spot-500)) 50%, transparent) no-repeat, linear-gradient(90deg, color-mix(in oklab, var(--sig, var(--spot-500)) 35%, transparent), transparent);
  background-size: 22% 100%, 100% 100%;
  animation: wall-signal 3.6s linear infinite;
}
@keyframes wall-signal { from { background-position: -30% 0, 0 0; } to { background-position: 130% 0, 0 0; } }

.wall-stamp { animation: wall-stamp 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
@keyframes wall-stamp { from { opacity: 0; transform: rotate(-12deg) scale(2); } to { opacity: 1; transform: rotate(-12deg) scale(1); } }

.wall-tilt { transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); transform-style: preserve-3d; will-change: transform; }
.wall-tilt[data-tilting] { transition-duration: 0.08s; }

.wall-key {
  background: linear-gradient(180deg, var(--key-top), var(--key-bot));
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.5) inset, 0 -2px 0 rgb(0 0 0 / 0.18) inset, 0 3px 0 var(--key-edge), 0 6px 14px -6px rgb(40 20 0 / 0.5);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.2s ease;
}
.group:hover .wall-key { filter: brightness(1.06); transform: translateY(-1px); box-shadow: 0 1px 0 rgb(255 255 255 / 0.5) inset, 0 -2px 0 rgb(0 0 0 / 0.18) inset, 0 4px 0 var(--key-edge), 0 9px 18px -6px rgb(40 20 0 / 0.55); }
.group:active .wall-key { transform: translateY(3px); box-shadow: 0 1px 0 rgb(255 255 255 / 0.3) inset, 0 1px 4px rgb(0 0 0 / 0.25) inset, 0 0 0 var(--key-edge); }

.wall-spark { transform-origin: bottom; animation: wall-spark 2.4s ease-in-out infinite alternate; animation-delay: var(--delay, 0s); }
@keyframes wall-spark { from { transform: scaleY(0.55); } to { transform: scaleY(1); } }

@media (prefers-reduced-motion: reduce) {
  .wall-scan, .wall-roll, .wall-bar, .wall-fill, .wall-signal, .wall-stamp, .wall-spark { animation: none !important; }
  .wall-roll { display: none; }
  .wall-tilt { transform: none !important; transition: none; }
}
`;

export function WallStyles() {
  return (
    <style href="stagecraft-monitor-wall" precedence="default">
      {css}
    </style>
  );
}
