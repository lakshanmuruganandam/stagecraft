import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { initials } from "@/lib/format";

type Variant = "primary" | "ghost" | "outline" | "danger" | "subtle";
const variants: Record<Variant, string> = {
  primary: "bg-spot-500 text-ink-950 hover:bg-spot-400 shadow-[0_6px_24px_-8px_rgb(255_169_40/0.6)]",
  ghost: "text-ink-200 hover:bg-white/6 hover:text-white",
  outline: "border border-white/12 text-ink-100 hover:border-white/25 hover:bg-white/4",
  danger: "bg-onair/90 text-white hover:bg-onair",
  subtle: "bg-white/6 text-ink-100 hover:bg-white/10",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" | "lg" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background,color,border,transform] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 select-none",
    size === "sm" && "h-8 px-3 text-[0.8rem]",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-[0.95rem]",
    variants[variant],
  );
}

export function Button({ variant, size, className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button {...rest} className={clsx(buttonClass(variant, size), className)} />;
}

export function Badge({ children, className, tone = "neutral" }: { children: ReactNode; className?: string; tone?: "neutral" | "live" | "spot" | "ok" | "muted" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[0.68rem] font-medium uppercase tracking-[0.12em]",
        tone === "neutral" && "bg-white/7 text-ink-200",
        tone === "live" && "bg-onair/15 text-[#ff7a7a] ring-1 ring-onair/40",
        tone === "spot" && "bg-spot-500/15 text-spot-300 ring-1 ring-spot-500/30",
        tone === "ok" && "bg-ok/12 text-ok ring-1 ring-ok/30",
        tone === "muted" && "bg-white/4 text-ink-400",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OnAir({ label = "On air" }: { label?: string }) {
  return (
    <Badge tone="live">
      <span aria-hidden className="size-1.5 rounded-full bg-onair animate-tally" />
      {label}
    </Badge>
  );
}

export function Avatar({ name, color, size = 28 }: { name: string; color?: string | null; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-display font-semibold text-ink-950"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color ?? "var(--color-ink-400)" }}
    >
      {initials(name)}
    </span>
  );
}

export function HouseChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-300">
      <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-ink-500">{icon}</div>}
      <p className="font-display text-base text-ink-200">{title}</p>
      {children && <p className="max-w-xs text-sm text-ink-400">{children}</p>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.8rem] font-medium text-ink-200">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-ink-900/80 px-3 text-sm text-white placeholder:text-ink-500 outline-none transition focus:border-spot-500/60 focus:ring-2 focus:ring-spot-500/20";
