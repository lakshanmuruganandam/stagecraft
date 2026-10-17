"use client";

import { Button } from "@/components/ui/primitives";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-28 text-center">
      <p className="timecode text-sm text-onair">Technical difficulties</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white">Please stand by</h1>
      <p className="mt-3 text-ink-300">Something went wrong backstage. It&apos;s been logged.</p>
      <Button size="lg" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
