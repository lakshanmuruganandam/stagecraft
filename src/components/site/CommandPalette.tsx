"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Command, Home, LayoutDashboard, Radio, Search, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";

type Item = { id: string; label: string; hint: string; href: string; icon: typeof Home; group: string };

const PAGES: Item[] = [
  { id: "home", label: "Events", hint: "Live now and coming up", href: "/", icon: Home, group: "Go to" },
  { id: "houses", label: "Houses", hint: "Every house's home", href: "/houses", icon: Users, group: "Go to" },
  { id: "calendar", label: "Event radar", hint: "Calendar of every event", href: "/calendar", icon: CalendarDays, group: "Go to" },
  { id: "quests", label: "Quests", hint: "Badges, levels and lore", href: "/quests", icon: Sparkles, group: "Go to" },
  { id: "leaderboard", label: "Leaderboard", hint: "House cup standings", href: "/leaderboard", icon: Trophy, group: "Go to" },
  { id: "verify", label: "Verify a certificate", hint: "Check any credential", href: "/verify", icon: ShieldCheck, group: "Go to" },
  { id: "me", label: "My credentials", hint: "Your certificates", href: "/me", icon: Sparkles, group: "You" },
  { id: "account", label: "Account & security", hint: "Password and sessions", href: "/account", icon: ShieldCheck, group: "You" },
  { id: "admin", label: "Control room", hint: "Run your events", href: "/admin", icon: LayoutDashboard, group: "Organizers" },
];

/** ⌘K / Ctrl+K palette: fuzzy jump to any page or event. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [events, setEvents] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    addEventListener("keydown", onKey);
    addEventListener("sc:palette", onOpen);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("sc:palette", onOpen);
    };
  }, []);

  const returnFocus = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) {
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
      return;
    }
    returnFocus.current = document.activeElement;
    setTimeout(() => input.current?.focus(), 10);
    if (events.length) return;
    fetch("/api/events")
      .then((r) => r.json())
      .then((list: { slug: string; title: string; status: string }[]) =>
        setEvents(list.map((e) => ({ id: e.slug, label: e.title, hint: e.status === "live" ? "On air now" : e.status === "ended" ? "Results & recap" : "Upcoming", href: `/e/${e.slug}`, icon: Radio, group: "Events" }))),
      )
      .catch(() => {});
  }, [open, events.length]);

  const results = useMemo(() => {
    const all = [...events, ...PAGES];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    // Subsequence match ranked by how early and tight the match is.
    const score = (s: string) => {
      let i = 0, first = -1, last = 0;
      for (let j = 0; j < s.length && i < needle.length; j++) {
        if (s[j] === needle[i]) {
          if (first < 0) first = j;
          last = j;
          i++;
        }
      }
      return i === needle.length ? first + (last - first) * 0.5 : Infinity;
    };
    return all
      .map((it) => ({ it, s: Math.min(score(it.label.toLowerCase()), score(it.hint.toLowerCase()) + 20) }))
      .filter((x) => x.s < Infinity)
      .sort((a, b) => a.s - b.s)
      .map((x) => x.it);
  }, [q, events]);

  if (!open) return null;
  const go = (it: Item) => {
    setOpen(false);
    setQ("");
    router.push(it.href);
  };
  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  return (
    <div className="fixed inset-0 z-[75] grid place-items-start bg-ink-950/70 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} className="mx-auto w-full max-w-xl animate-[castin_.25s_cubic-bezier(.2,.8,.2,1)_both] overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/8 px-4" onKeyDown={(e) => e.key === "Tab" && e.preventDefault()}>
          <Search size={17} className="text-ink-400" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
              if (e.key === "Enter" && results[safeActive]) go(results[safeActive]);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[safeActive] ? `pal-opt-${safeActive}` : undefined}
            placeholder="Jump to an event, house or page…"
            className="h-14 flex-1 bg-transparent text-[0.95rem] text-white outline-none placeholder:text-ink-500"
          />
          <kbd className="timecode rounded-md border border-white/10 px-1.5 py-0.5 text-[0.65rem] text-ink-400">esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-400">No matches.</li>}
          {results.map((it, i) => (
            <li key={`${it.group}-${it.id}`} id={`pal-opt-${i}`} role="option" aria-selected={i === safeActive} onMouseEnter={() => setActive(i)} onClick={() => go(it)} className="cursor-pointer">
              <div className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === safeActive ? "bg-white/8" : ""}`}>
                <span className={`grid size-8 place-items-center rounded-lg ${i === safeActive ? "bg-spot-500/20 text-spot-300" : "bg-white/5 text-ink-300"}`}>
                  <it.icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{it.label}</span>
                  <span className="block truncate text-xs text-ink-400">{it.hint}</span>
                </span>
                <span className="eyebrow text-[0.6rem]">{it.group}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 border-t border-white/8 px-4 py-2 text-[0.7rem] text-ink-500">
          <Command size={12} /> K to toggle · ↑↓ to move · ↵ to open
        </div>
      </div>
    </div>
  );
}

export function PaletteButton() {
  return (
    <button
      onClick={() => dispatchEvent(new Event("sc:palette"))}
      aria-label="Search (Command K)"
      className="hidden h-8 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-ink-400 transition hover:border-white/20 hover:text-white md:inline-flex"
    >
      <Search size={13} /> Search <kbd className="timecode rounded border border-white/10 px-1 text-[0.6rem]">⌘K</kbd>
    </button>
  );
}
