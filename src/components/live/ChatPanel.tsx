"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EyeOff, MicOff, Pin, PinOff, Send } from "lucide-react";
import { useLive } from "./LiveProvider";
import { Avatar } from "@/components/ui/primitives";
import { fmtTime } from "@/lib/format";

export function ChatPanel() {
  const { state, run, houseColor, houseName } = useLive();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const pinned = state.chat.find((m) => m.pinned);
  const ended = state.event.status === "ended";

  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [state.chat.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    const ok = await run("chat.send", { body });
    setBusy(false);
    if (ok) setBody("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {pinned && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-spot-500/25 bg-spot-500/8 p-3 text-sm">
          <Pin size={14} className="mt-0.5 shrink-0 text-spot-400" />
          <p className="min-w-0 text-ink-100">
            <span className="font-medium text-spot-300">{pinned.user.name}: </span>
            {pinned.body}
          </p>
          {state.canManage && (
            <button aria-label="Unpin" onClick={() => run("chat.pin", { messageId: pinned.id, pinned: false })} className="ml-auto text-ink-400 hover:text-white">
              <PinOff size={14} />
            </button>
          )}
        </div>
      )}
      <div
        ref={list}
        role="log"
        aria-label="Live chat"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3"
      >
        {state.chat.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-400">Say hi 👋 Be the first in chat.</p>}
        {state.chat.map((m) => (
          <div key={m.id} className="group flex gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/3">
            <Avatar name={m.user.name} color={houseColor(m.user.houseId)} size={24} />
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <span className="font-medium" style={{ color: houseColor(m.user.houseId) }}>
                {m.user.name}
              </span>
              <span className="sr-only"> from {houseName(m.user.houseId)}</span>
              <span className="timecode ml-2 text-[0.65rem] text-ink-500">{fmtTime(m.createdAt)}</span>
              <br />
              <span className="break-words text-ink-100">{m.body}</span>
            </p>
            {state.canManage && (
              <div className="flex shrink-0 items-start gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <IconBtn label="Pin message" onClick={() => run("chat.pin", { messageId: m.id, pinned: true })}>
                  <Pin size={13} />
                </IconBtn>
                <IconBtn label="Hide message" onClick={() => run("chat.hide", { messageId: m.id })}>
                  <EyeOff size={13} />
                </IconBtn>
                <IconBtn label={`Mute ${m.user.name} for 10 minutes`} onClick={() => run("user.mute", { userId: m.user.id, minutes: 10 })}>
                  <MicOff size={13} />
                </IconBtn>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-white/6 p-3">
        {ended ? (
          <p className="text-center text-sm text-ink-400">Chat is closed. Thanks for watching!</p>
        ) : state.me ? (
          <form onSubmit={send} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="chat-input">
              Chat message
            </label>
            <input
              id="chat-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={280}
              placeholder={state.event.settings.chatEnabled ? (state.event.settings.slowModeSec ? `Slow mode: one message every ${state.event.settings.slowModeSec}s` : "Send a message") : "Chat is paused"}
              disabled={!state.event.settings.chatEnabled && !state.canManage}
              className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-ink-900 px-4 text-sm outline-none placeholder:text-ink-500 focus:border-spot-500/50"
            />
            <button aria-label="Send" disabled={busy || !body.trim()} className="grid size-10 place-items-center rounded-full bg-spot-500 text-on-spot transition hover:bg-spot-400 disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        ) : (
          <SignInPrompt what="chat" />
        )}
      </div>
    </div>
  );
}

export function SignInPrompt({ what }: { what: string }) {
  return (
    <p className="text-center text-sm text-ink-300">
      <Link href={`/login?next=${typeof window === "undefined" ? "/" : encodeURIComponent(location.pathname)}`} className="font-medium text-spot-400 underline-offset-4 hover:underline">
        Sign in
      </Link>{" "}
      to {what}.
    </p>
  );
}

export function IconBtn({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md transition ${active ? "bg-spot-500/20 text-spot-300" : "text-ink-400 hover:bg-white/8 hover:text-white"}`}
    >
      {children}
    </button>
  );
}
