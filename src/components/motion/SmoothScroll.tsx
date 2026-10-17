"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Site-wide inertial smooth scrolling (Lenis). It animates the *native*
 * scroll position, so sticky sections, CSS scroll-driven animations and the
 * scenery parallax stay perfectly in sync. Inner scroll areas (chat, Q&A,
 * palettes, menus, horizontal rails, the 3D arena) keep native scrolling.
 * Off for reduced motion and touch-first devices, where native is best.
 */
export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(pointer: coarse)").matches) return;
    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
      anchors: { offset: -80 },
      prevent: (node: HTMLElement) =>
        !!node.closest(".scrollbar-thin, [role='dialog'], [role='log'], .overflow-x-auto, canvas, [data-lenis-prevent]"),
    });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Freeze page scroll while a modal locks it (menus set overflow: hidden on <html>).
    const mo = new MutationObserver(() => (document.documentElement.style.overflow === "hidden" ? lenis.stop() : lenis.start()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      lenis.destroy();
    };
  }, []);

  // New route: start at the top instantly (no smooth scroll across pages).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [path]);

  return null;
}
