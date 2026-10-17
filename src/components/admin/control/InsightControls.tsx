"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import { Button, inputClass } from "@/components/ui/primitives";

export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button aria-label="Refresh insights" title="Refresh" onClick={() => start(() => router.refresh())} className="grid size-7 place-items-center rounded-md text-ink-400 hover:bg-white/8 hover:text-white">
      <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
    </button>
  );
}

/** Revoke flow: ask for a reason inline (no browser prompt), then confirm. */
export function RevokeButton({ certificateId }: { certificateId: string }) {
  const { run } = useLive();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-ink-400 underline-offset-2 hover:text-[#ff8a8a] hover:underline">
        Revoke
      </button>
    );
  return (
    <form
      className="mt-2 flex w-full gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run("cert.revoke", { certificateId, reason });
        if (ok) {
          setOpen(false);
          router.refresh();
        }
      }}
    >
      <label htmlFor={`rv-${certificateId}`} className="sr-only">
        Reason for revoking {certificateId}
      </label>
      <input id={`rv-${certificateId}`} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown on verify page)" className={`${inputClass} h-8 text-xs`} />
      <Button size="sm" variant="danger" className="h-8" disabled={reason.trim().length < 3}>
        Revoke
      </Button>
      <Button size="sm" variant="ghost" type="button" className="h-8" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
