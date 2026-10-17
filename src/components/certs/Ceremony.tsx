"use client";

import { Burst } from "@/components/site/Burst";

/** Plays once when a recipient opens a freshly issued certificate (?claim=1). */
export function Ceremony({ color }: { color: string }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl">
        <div className="absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 animate-[foil_1.6s_.4s_ease-in-out_both] bg-gradient-to-r from-transparent via-[#fff3c4]/70 to-transparent mix-blend-overlay" />
      </div>
      <div className="pointer-events-none absolute -inset-x-10 -top-24 bottom-0 z-30">
        <Burst color={color} count={180} />
      </div>
    </>
  );
}
