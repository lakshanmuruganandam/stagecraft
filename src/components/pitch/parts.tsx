import QRCode from "qrcode";
import type { ReactNode } from "react";
import { clsx } from "clsx";

/** Slide heading: eyebrow, big display title, optional lede. */
export function SlideHead({ eyebrow, title, lede }: { eyebrow?: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <header className="pitch-rise max-w-5xl">
      {eyebrow && <p className="eyebrow mb-3 text-spot-400">{eyebrow}</p>}
      <h2 className="font-display text-[2.1rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">{title}</h2>
      {lede && <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-300 sm:text-lg">{lede}</p>}
    </header>
  );
}

/* ───────── code block with a tiny, dependency-free highlighter ───────── */

const KEYWORDS = new Set([
  "async", "await", "const", "let", "return", "if", "throw", "new", "export", "function", "for", "of", "type", "import", "from", "as", "in",
]);

function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\/\/.*$|\/\*.*?\*\/)|(`[^`]*`|"[^"]*"|'[^']*')|\b([A-Za-z_$][\w$]*)\b|(\d+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [tok, comment, str, word, num] = m;
    if (comment) out.push(<span key={k++} className="text-ink-400 italic">{tok}</span>);
    else if (str) out.push(<span key={k++} className="text-[#8fd6a6]">{tok}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={k++} className="text-[#ff9ec7]">{tok}</span>);
    else if (word && line[re.lastIndex] === "(") out.push(<span key={k++} className="text-spot-300">{tok}</span>);
    else if (num) out.push(<span key={k++} className="text-[#9cc8ff]">{tok}</span>);
    else out.push(tok);
    last = re.lastIndex;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function Code({ file, code, className }: { file: string; code: string; className?: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <figure data-theme="stage" className={clsx("overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/20", className)}>
      <figcaption className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="timecode ml-2 truncate text-[0.7rem] text-ink-300">{file}</span>
      </figcaption>
      <pre className="scrollbar-thin overflow-x-auto p-4 text-[0.72rem] leading-[1.65] text-ink-100 sm:text-[0.8rem]">
        <code className="timecode">
          {lines.map((l, i) => (
            <span key={i} className="block">
              {highlight(l)}
              {l === "" ? " " : null}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

/* ───────── Lighthouse-style gauge ───────── */

export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="size-16 sm:size-20" role="img" aria-label={`${label}: ${value} out of 100`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-[#0cce6b]/15" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#0cce6b"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-ok font-mono text-[26px] font-semibold">
          {value}
        </text>
      </svg>
      <figcaption className="text-center text-xs font-medium text-ink-300">{label}</figcaption>
    </figure>
  );
}

/* ───────── QR code as crisp inline SVG (synchronous, no network) ───────── */

export function QrSvg({ text, className, label }: { text: string; className?: string; label: string }) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  const pad = 2;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}`}
      className={className}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={-pad} y={-pad} width={n + pad * 2} height={n + pad * 2} fill="#fffdf9" />
      <path d={d} fill="#1c1610" />
    </svg>
  );
}

/** Small labelled pill. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-ink-200", className)}>
      {children}
    </span>
  );
}
