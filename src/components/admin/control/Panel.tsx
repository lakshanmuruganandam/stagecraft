import type { ReactNode } from "react";

/** Console-style module: hairline header with an eyebrow title. */
export function Panel({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`overflow-hidden rounded-2xl border border-white/7 bg-ink-900/70 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-white/6 bg-white/[0.02] px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="eyebrow text-ink-200">{title}</h2>
          {subtitle && <p className="truncate text-[0.7rem] text-ink-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
