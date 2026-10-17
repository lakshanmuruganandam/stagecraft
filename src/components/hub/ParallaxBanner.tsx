"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";

/**
 * House "front door": a light caption panel beside a framed landscape that
 * drifts slightly against the pointer. The art never sits behind body text,
 * so it reads in both the Daylight and Stage themes.
 */
export function ParallaxBanner({ src, color, alt, children, priority }: { src: string | null; color: string; alt: string; children: ReactNode; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="card relative isolate grid overflow-hidden p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 -z-10 size-72 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
      <div className="order-2 flex flex-col justify-end gap-6 p-5 sm:p-8 lg:order-1">{children}</div>
      <div
        ref={ref}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          el.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5) * -16}px`);
          el.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5) * -10}px`);
        }}
        onPointerLeave={() => {
          ref.current?.style.setProperty("--px", "0px");
          ref.current?.style.setProperty("--py", "0px");
        }}
        className="relative order-1 aspect-[16/9] overflow-hidden rounded-[1.1rem] lg:order-2 lg:aspect-auto lg:min-h-[24rem]"
        style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 35%, var(--ink-800)))` }}
      >
        {src && (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out motion-reduce:transition-none"
            style={{ transform: "translate3d(var(--px, 0px), var(--py, 0px), 0) scale(1.08)" }}
          />
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: color }} />
      </div>
    </div>
  );
}
