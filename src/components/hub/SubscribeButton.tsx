"use client";

import { useState } from "react";
import { Check, Copy, Rss } from "lucide-react";
import { buttonClass } from "@/components/ui/primitives";

/** Shows the webcal:// feed with one-click subscribe and copy. */
export function SubscribeButton({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.host;
  const webcal = `webcal://${origin}${path}`;
  const https = `${typeof window === "undefined" ? "" : window.location.origin}${path}`;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={buttonClass("primary")}>
        <Rss size={16} /> Subscribe
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-rise rounded-2xl border border-white/10 bg-ink-850/95 p-4 shadow-2xl backdrop-blur-xl">
          <p className="text-sm text-white">Every house event in your calendar app, kept up to date automatically.</p>
          <a href={webcal} className={`${buttonClass("primary", "sm")} mt-3 w-full`}>
            Open in Calendar
          </a>
          <div className="mt-3 flex items-center gap-2">
            <input readOnly value={https} aria-label="Calendar feed URL" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-900 px-2 font-mono text-xs text-ink-200" />
            <button
              type="button"
              aria-label="Copy feed URL"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(https);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* user can select the field */
                }
              }}
              className="grid size-9 place-items-center rounded-lg border border-white/10 text-ink-200 hover:text-white"
            >
              {copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-500">Google Calendar: Other calendars → From URL, then paste.</p>
        </div>
      )}
    </div>
  );
}
