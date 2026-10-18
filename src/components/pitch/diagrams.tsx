import type { ReactNode } from "react";
import { clsx } from "clsx";

/** Bidirectional connector: horizontal on wide screens, vertical when stacked. */
function Link2({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 py-1 lg:w-28 lg:py-0" aria-hidden>
      <svg viewBox="0 0 100 16" className="hidden h-4 w-full lg:block" preserveAspectRatio="none">
        <defs>
          <marker id="pa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L8 4L0 8z" fill="var(--spot-500)" />
          </marker>
        </defs>
        <line x1="4" y1="8" x2="96" y2="8" stroke="var(--spot-500)" strokeWidth="1.6" strokeDasharray="5 4" markerStart="url(#pa)" markerEnd="url(#pa)" vectorEffect="non-scaling-stroke">
          <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1.2s" repeatCount="indefinite" />
        </line>
      </svg>
      <svg viewBox="0 0 16 40" className="h-8 w-4 lg:hidden">
        <path d="M8 2v36M3 8l5-6 5 6M3 32l5 6 5-6" fill="none" stroke="var(--spot-500)" strokeWidth="1.6" />
      </svg>
      <span className="timecode text-center text-[0.62rem] uppercase tracking-wider text-ink-400">{label}</span>
    </div>
  );
}

function Node({ title, sub, children, className, accent }: { title: string; sub?: string; children?: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div
      className={clsx(
        "card flex flex-col gap-3 p-4 sm:p-5",
        accent && "ring-2 ring-spot-500/50",
        className,
      )}
    >
      <div>
        <p className="font-display text-lg font-semibold text-white sm:text-xl">{title}</p>
        {sub && <p className="timecode mt-0.5 text-[0.7rem] text-ink-400">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Sub({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-ink-800/60 px-3 py-2.5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs leading-snug text-ink-300">{sub}</p>
    </div>
  );
}

const pill = "rounded-lg border border-white/8 bg-ink-800/60 px-2.5 py-1.5 text-xs text-ink-200";

export function SystemDiagram() {
  return (
    <figure aria-label="System diagram: Browser talks to the Next.js 16 App Router, which reads and writes Turso libSQL through Drizzle" className="flex flex-col items-stretch lg:flex-row">
      <Node title="Browser" sub="any device · OBS" className="lg:w-60">
        <ul className="grid gap-1.5">
          <li className={pill}>Streamed HTML + RSC payload</li>
          <li className={pill}>EventSource (SSE) live feed</li>
          <li className={pill}>OBS browser-source overlay</li>
          <li className={pill}>QR scan → check-in</li>
        </ul>
      </Node>
      <Link2 label="HTTPS · SSE" />
      <Node title="Next.js 16 App Router" sub="React 19 · TypeScript · Vercel / Docker" accent className="flex-1">
        <div className="grid gap-2 sm:grid-cols-2">
          <Sub title="Server Components" sub="Suspense + Partial Prerendering: static shell, request data streams in" />
          <Sub title="Server Actions" sub="sign-in, sessions, users & roles, event setup" />
          <Sub title="Route Handlers" sub="command bus, SSE /api/live, CSV, cert JSON/PNG, JWKS" />
          <Sub title="proxy.ts" sub="optimistic gate: bounces signed-out visitors before render" />
        </div>
      </Node>
      <Link2 label="Drizzle ORM" />
      <Node title="Turso · libSQL" sub="SQLite at the edge · local file in dev" className="lg:w-60">
        <ul className="grid gap-1.5">
          <li className={pill}>events · polls · brackets · contests</li>
          <li className={pill}>changes (append-only log)</li>
          <li className={pill}>certificates · points</li>
          <li className={pill}>sessions · audit_log</li>
        </ul>
      </Node>
    </figure>
  );
}

const steps = [
  { k: "01", t: "Typed command", d: "POST /api/events/:id/commands — a discriminated union, one entry per feature" },
  { k: "02", t: "zod command bus", d: "schema parse · house-scoped authz · DB-backed rate limit · audit" },
  { k: "03", t: "Append-only change log", d: "INSERT INTO changes (seq) — redacted public view + full manager view" },
  { k: "04", t: "SSE stream", d: "tails seq > cursor; resumes from Last-Event-ID, gap-free across instances" },
  { k: "05", t: "Pure reducer", d: "useReducer folds each message into a snapshot — nothing to drift" },
];

export function PipelineDiagram() {
  return (
    <ol aria-label="Realtime pipeline" className="grid gap-2 sm:grid-cols-5 sm:gap-0">
      {steps.map((s, i) => (
        <li key={s.k} className="relative flex sm:block">
          <div className="card relative z-[1] flex-1 p-4 sm:mx-1.5 sm:min-h-[9.5rem]">
            <span className="timecode text-xs text-spot-400">{s.k}</span>
            <p className="mt-1 font-display text-base font-semibold leading-tight text-white sm:text-lg">{s.t}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-300">{s.d}</p>
          </div>
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute -right-2 top-1/2 z-[2] hidden size-4 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-spot-500 sm:block" />
          )}
        </li>
      ))}
    </ol>
  );
}

export function FlowSteps({ items }: { items: { t: string; d: string }[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {items.map((s, i) => (
        <li key={s.t} className="relative">
          <div className="card h-full p-4">
            <span className="grid size-8 place-items-center rounded-full bg-spot-500 font-mono text-sm font-bold text-on-spot">{i + 1}</span>
            <p className="mt-3 font-display text-base font-semibold text-white">{s.t}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-300">{s.d}</p>
          </div>
          {i < items.length - 1 && (
            <span aria-hidden className="absolute -right-2.5 top-8 hidden text-lg text-spot-500 sm:block">→</span>
          )}
        </li>
      ))}
    </ol>
  );
}
