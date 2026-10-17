"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function NavLinks({ isManager }: { isManager: boolean }) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Events" },
    { href: "/houses", label: "Houses" },
    { href: "/calendar", label: "Radar" },
    { href: "/quests", label: "Quests" },
    { href: "/leaderboard", label: "Cup" },
    { href: "/verify", label: "Verify" },
    ...(isManager ? [{ href: "/admin", label: "Control" }] : []),
  ];
  return (
    <nav aria-label="Main" className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/e/") : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition",
              active ? "bg-white/8 text-white" : "text-ink-300 hover:text-white",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
