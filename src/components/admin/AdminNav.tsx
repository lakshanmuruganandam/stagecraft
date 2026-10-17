"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarRange, LayoutDashboard, ScrollText, Users } from "lucide-react";

/** Sub-navigation shared by every /admin page. */
export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
    { href: "/admin#events", label: "Events", icon: CalendarRange, match: (p: string) => p.startsWith("/admin/events") },
    ...(isAdmin
      ? [
          { href: "/admin/users", label: "Users", icon: Users, match: (p: string) => p.startsWith("/admin/users") },
          { href: "/admin/audit", label: "Audit log", icon: ScrollText, match: (p: string) => p.startsWith("/admin/audit") },
        ]
      : []),
  ];
  return (
    <nav aria-label="Admin" className="border-b border-white/6 bg-ink-950/60">
      <div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {links.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] transition",
                active ? "bg-spot-500/15 text-spot-300 ring-1 ring-spot-500/30" : "text-ink-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={14} /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
