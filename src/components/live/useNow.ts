"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Ticking clock for countdowns; 0 during SSR so markup never mismatches. */
export function useNow(intervalMs = 1000) {
  return useSyncExternalStore(
    (notify) => {
      const t = setInterval(notify, intervalMs);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}

/** A browser-only value (location, etc.), null on the server. */
export function useClientValue<T>(read: () => T): T | null {
  return useSyncExternalStore(noop, read, () => null);
}
