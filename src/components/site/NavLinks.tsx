"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, Home, LayoutDashboard, Menu, Search, ShieldCheck, Sparkles, Trophy, Users, X } from "lucide-react";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" || path.startsWith("/e/") : path.startsWith(href));

export function NavLinks({ isManager }: { isManager: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/", label: "Events", icon: Home, hint: "Live now and coming up" },
    { href: "/houses", label: "Houses", icon: Users, hint: "Every house's home" },
    { href: "/calendar", label: "Radar", icon: CalendarDays, hint: "Calendar of every event" },
    { href: "/quests", label: "Quests", icon: Sparkles, hint: "Badges, levels and lore" },
    { href: "/leaderboard", label: "Cup", icon: Trophy, hint: "House cup standings" },
    { href: "/verify", label: "Verify", icon: ShieldCheck, hint: "Check any certificate" },
    ...(isManager ? [{ href: "/admin", label: "Control", icon: LayoutDashboard, hint: "Run your events" }] : []),
  ];

  // Close the sheet on navigation and on Escape; lock page scroll while open.
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <nav aria-label="Main" className="-mx-1 hidden min-w-0 items-center gap-0.5 md:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(path, l.href) ? "page" : undefined}
            className={clsx("whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition", isActive(path, l.href) ? "bg-white/8 text-white" : "text-ink-300 hover:text-white")}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile */}
      <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu" className="order-last grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-ink-200 md:hidden">
        <Menu size={17} />
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[70] md:hidden">
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 animate-[fadein_.2s_both] bg-ink-950/60 backdrop-blur-sm" />
          <div className="absolute inset-x-3 top-3 animate-[castin_.35s_cubic-bezier(.2,.8,.2,1)_both] rounded-3xl border border-white/10 bg-ink-850 p-3 shadow-2xl">
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="eyebrow">Go to</span>
              <button autoFocus onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-full text-ink-300 hover:bg-white/6">
                <X size={18} />
              </button>
            </div>
            <ul className="grid gap-1">
              {links.map((l, i) => (
                <li key={l.href} className="animate-[castin_.4s_both]" style={{ animationDelay: `${60 + i * 40}ms` }}>
                  <Link href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined} className={clsx("flex items-center gap-3 rounded-2xl px-3 py-3", isActive(path, l.href) ? "bg-spot-500/12 text-white" : "text-ink-200 active:bg-white/6")}>
                    <span className={clsx("grid size-10 place-items-center rounded-xl", isActive(path, l.href) ? "bg-spot-500 text-on-spot" : "bg-white/6 text-ink-300")}>
                      <l.icon size={18} />
                    </span>
                    <span>
                      <span className="block font-medium">{l.label}</span>
                      <span className="block text-xs text-ink-400">{l.hint}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                setTimeout(() => dispatchEvent(new Event("sc:palette")), 50);
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-ink-300"
            >
              <Search size={15} /> Search events and pages…
            </button>
          </div>
        </div>
      )}
    </>
  );
}
