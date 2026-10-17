"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "daylight" | "stage";
const read = (): Theme => (document.documentElement.dataset.theme === "stage" ? "stage" : "daylight");
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

/** Daylight ↔ Stage. Remembered per browser; applied before paint by an inline script. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "daylight" as Theme);
  const next: Theme = theme === "stage" ? "daylight" : "stage";
  return (
    <button
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("sc-theme", next);
        } catch {
          /* private mode */
        }
      }}
      aria-label={`Switch to ${next === "stage" ? "Stage (dark)" : "Daylight"} theme`}
      title={next === "stage" ? "Stage mode" : "Daylight mode"}
      className="grid size-8 place-items-center rounded-full border border-white/10 text-ink-300 transition hover:border-white/25 hover:text-white"
    >
      {theme === "stage" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

/** Inline, render-blocking: sets the saved theme before first paint (no flash). */
export const themeScript = `try{var t=localStorage.getItem("sc-theme");if(t==="stage")document.documentElement.dataset.theme="stage"}catch(e){}`;
