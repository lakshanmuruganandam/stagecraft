/** Cumulative points over time as an area sparkline (server-rendered SVG). */
export function Sparkline({ points, color, label }: { points: { t: number; points: number }[]; color: string; label: string }) {
  const W = 320;
  const H = 96;
  const pad = 6;
  if (points.length < 2) {
    return <p className="text-sm text-ink-400">Points history appears after the first awards.</p>;
  }
  // Evenly spaced awards read better than wall-clock time: most points land
  // in bursts at the end of events, which would pile up on the right edge.
  const pts = points.map((p, i) => ({ t: i, points: p.points }));
  const t0 = 0;
  const t1 = pts.length - 1;
  const max = Math.max(...pts.map((p) => p.points));
  // Baseline just under the lowest value so award jumps read clearly.
  const lo = Math.min(...pts.map((p) => p.points));
  const min = Math.max(0, lo - (max - lo) * 0.6 - 1);
  const x = (t: number) => pad + ((t - t0) / (t1 - t0 || 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  // Step line: points jump when an award lands, they don't drift between awards.
  let d = `M ${x(pts[0].t)} ${y(pts[0].points)}`;
  for (let i = 1; i < pts.length; i++) d += ` H ${x(pts[i].t)} V ${y(pts[i].points)}`;
  const area = `${d} V ${H - pad} H ${x(t0)} Z`;
  const last = pts.at(-1)!;
  const id = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-24 w-full overflow-visible text-white">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad} x2={W - pad} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} stroke="currentColor" strokeOpacity={0.08} />
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" pathLength={1} strokeDasharray="1" className="[animation:sc-draw_1.6s_ease-out_both] motion-reduce:[animation:none]" />
      <circle cx={x(last.t)} cy={y(last.points)} r="4" fill={color} />
      <circle cx={x(last.t)} cy={y(last.points)} r="9" fill={color} opacity="0.25" className="animate-ping [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none" />
      <style>{`@keyframes sc-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}
