"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import { toast } from "@/components/site/Toaster";

/** Admin tool: spotlight an announcement onto every connected screen. */
export function BroadcastComposer() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, message, href: href || undefined }) }).then((r) => r.json());
    setBusy(false);
    if (res.ok) {
      toast("Broadcast sent to every connected screen.", { tone: "ok" });
      setTitle("");
      setMessage("");
    } else toast(res.error, { tone: "error" });
  }

  return (
    <form onSubmit={send} className="card grid gap-3 p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-spot-500/15 text-spot-400">
          <Megaphone size={17} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Spotlight broadcast</h2>
          <p className="text-xs text-ink-400">Dims every open StageCraft screen and spotlights your message for 12 seconds. One a minute.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
        <Field label="Headline">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required className={inputClass} placeholder="Grand final starts now!" />
        </Field>
        <Field label="Message">
          <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={180} required className={inputClass} placeholder="Sentinels vs Rhinos. Predictions lock in 2 minutes." />
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="Link (optional)">
            <input value={href} onChange={(e) => setHref(e.target.value)} className={inputClass} placeholder="/e/inter-house-valorant-cup" />
          </Field>
        </div>
        <Button disabled={busy || !title || !message}>{busy ? "Sending…" : "Broadcast to everyone"}</Button>
      </div>
    </form>
  );
}
