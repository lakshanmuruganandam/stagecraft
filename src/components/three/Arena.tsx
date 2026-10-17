"use client";

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import ArenaScene, { PALETTES, type ArenaHouse } from "./ArenaScene";

type Theme = "daylight" | "stage";

const subscribeTheme = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const readTheme = (): Theme => (document.documentElement.dataset.theme === "stage" ? "stage" : "daylight");

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

let webglCache: boolean | null = null;
function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}
const noop = () => () => {};

/** Shown when WebGL is missing or the renderer throws. */
export function ArenaFallback({ houses }: { houses?: ArenaHouse[] }) {
  const top = [...(houses ?? [])].sort((a, b) => b.points - a.points);
  const max = Math.max(1, ...top.map((h) => h.points));
  return (
    <div className="flex h-full flex-col items-center justify-end gap-4 p-6">
      <div aria-hidden className="flex h-2/3 w-full max-w-xl items-end justify-center gap-1.5">
        {top.map((h) => (
          <span key={h.slug} className="w-full max-w-8 rounded-t-lg opacity-85" style={{ height: `${12 + (h.points / max) * 88}%`, background: h.color }} />
        ))}
      </div>
      <p className="text-sm text-ink-300">3D view isn&apos;t available on this device, so here&apos;s the flat version.</p>
    </div>
  );
}

class ArenaBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[arena] 3D renderer failed, showing fallback", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** The WebGL canvas. Client-only: always load through ArenaLoader (next/dynamic, ssr:false). */
export default function Arena({ houses }: { houses: ArenaHouse[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "daylight" as Theme);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const finePointer = useMedia("(pointer: fine)");
  const tabVisible = useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => document.visibilityState === "visible",
    () => true,
  );
  const webgl = useSyncExternalStore(noop, hasWebGL, () => true);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // Wake well before it scrolls into view so the first frame never lands mid-scroll.
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onSelect = useCallback((slug: string) => router.push(`/houses/${slug}`), [router]);
  const fallback = <ArenaFallback houses={houses} />;
  if (!webgl) return fallback;

  const active = inView && tabVisible;
  const frameloop = !active ? "never" : reducedMotion ? "demand" : "always";

  return (
    <div ref={wrap} className="absolute inset-0">
      <ArenaBoundary fallback={fallback}>
        <Canvas
          aria-hidden
          frameloop={frameloop}
          dpr={[1, 1.75]}
          shadows="percentage"
          camera={{ position: [0, 9.5, 21], fov: 38, near: 0.5, far: 120 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ camera }) => camera.lookAt(0, 3.3, 0)}
        >
          <ArenaScene houses={houses} palette={PALETTES[theme]} reducedMotion={reducedMotion} controls={finePointer} onSelect={onSelect} />
        </Canvas>
      </ArenaBoundary>
    </div>
  );
}
