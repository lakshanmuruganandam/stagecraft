"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "@/components/site/Toaster";
import type { LiveEvent, MyState, Snapshot } from "@/lib/types";

type State = Snapshot & { presence: number; connected: boolean };
type Action = { type: "live"; event: LiveEvent } | { type: "me"; patch: (me: MyState) => MyState } | { type: "conn"; connected: boolean };

const upsert = <T extends { id: string }>(list: T[], item: T, where: "start" | "end" = "end") => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return where === "start" ? [item, ...list] : [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
};

function reducer(state: State, action: Action): State {
  if (action.type === "conn") return { ...state, connected: action.connected };
  if (action.type === "me") return state.me ? { ...state, me: action.patch(state.me) } : state;
  const e = action.event;
  switch (e.type) {
    case "event.update":
      return { ...state, event: e.payload };
    case "segments.update":
      return { ...state, segments: e.payload };
    case "chat.new":
      return { ...state, chat: upsert(state.chat, e.payload).slice(-200) };
    case "chat.update":
      return {
        ...state,
        chat: state.chat.map((m) => (m.id === e.payload.id ? e.payload : e.payload.pinned ? { ...m, pinned: false } : m)),
      };
    case "chat.remove":
      return { ...state, chat: state.chat.filter((m) => m.id !== e.payload.id) };
    case "qa.upsert":
      return { ...state, questions: upsert(state.questions, e.payload) };
    case "qa.remove":
      // Keep your own pending question visible to you.
      return { ...state, questions: state.questions.filter((q) => q.id !== e.payload.id || (q.status === "pending" && q.author?.id === state.me?.userId)) };
    case "poll.upsert":
      return { ...state, polls: upsert(state.polls, e.payload, "start") };
    case "poll.remove":
      return { ...state, polls: state.polls.filter((p) => p.id !== e.payload.id) };
    case "bracket.upsert":
      return { ...state, brackets: upsert(state.brackets, e.payload) };
    case "contest.upsert":
      return { ...state, contests: upsert(state.contests, e.payload) };
    case "presence":
      return { ...state, presence: e.payload.count };
    default:
      return state;
  }
}

type Reaction = { id: number; emoji: string; color: string; drift: number };

type Ctx = {
  state: State;
  run: <T = unknown>(type: string, input?: Record<string, unknown>) => Promise<T | null>;
  patchMe: (patch: (me: MyState) => MyState) => void;
  reactions: Reaction[];
  houseColor: (id: string | null | undefined) => string;
  houseName: (id: string | null | undefined) => string;
};

const LiveCtx = createContext<Ctx | null>(null);

export function useLive() {
  const c = useContext(LiveCtx);
  if (!c) throw new Error("useLive must be used inside <LiveProvider>");
  return c;
}

/**
 * Holds the live state for one event. Hydrates from a server snapshot,
 * then applies a stream of change events (SSE) through a pure reducer.
 * EventSource reconnects on its own and resumes from Last-Event-ID.
 */
export function LiveProvider({ snapshot, children }: { snapshot: Snapshot; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { ...snapshot, presence: 1, connected: false });
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const seen = useRef(0);
  const eventId = snapshot.event.id;
  const houses = snapshot.houses;

  const houseColor = useCallback((id: string | null | undefined) => houses.find((h) => h.id === id)?.color ?? "#737385", [houses]);
  const houseName = useCallback((id: string | null | undefined) => houses.find((h) => h.id === id)?.name ?? "Guest", [houses]);

  useEffect(() => {
    const es = new EventSource(`/api/live?event=${encodeURIComponent(eventId)}&cursor=${snapshot.cursor}`);
    es.onopen = () => dispatch({ type: "conn", connected: true });
    es.onerror = () => dispatch({ type: "conn", connected: false });
    es.onmessage = (msg) => {
      const ev = JSON.parse(msg.data) as LiveEvent;
      if (ev.type === "reaction") {
        const id = ++seen.current;
        const r = { id, emoji: ev.payload.emoji, color: houses.find((h) => h.id === ev.payload.houseId)?.color ?? "#fff", drift: Math.round(Math.random() * 80 - 40) };
        setReactions((xs) => [...xs.slice(-40), r]);
        setTimeout(() => setReactions((xs) => xs.filter((x) => x.id !== id)), 2700);
        return;
      }
      if (ev.type === "toast") return toast(ev.payload.message);
      if (ev.type === "cert.issued") {
        return toast(`🎓 Your certificate is ready: ${ev.payload.achievement}`, { tone: "ok", href: `/c/${ev.payload.id}`, cta: "View" });
      }
      dispatch({ type: "live", event: ev });
    };
    return () => es.close();
  }, [eventId, snapshot.cursor, houses]);

  const run = useCallback(
    async <T,>(type: string, input: Record<string, unknown> = {}): Promise<T | null> => {
      try {
        const res = await fetch(`/api/events/${eventId}/commands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, ...input }),
        });
        const data = await res.json();
        if (!data.ok) {
          toast(data.error ?? "Something went wrong", { tone: "error", ...(res.status === 401 ? { href: `/login?next=${encodeURIComponent(location.pathname)}`, cta: "Sign in" } : {}) });
          return null;
        }
        return data.result as T;
      } catch {
        toast("You're offline. Retrying might help.", { tone: "error" });
        return null;
      }
    },
    [eventId],
  );

  const patchMe = useCallback((patch: (me: MyState) => MyState) => dispatch({ type: "me", patch }), []);
  const value = useMemo(() => ({ state, run, patchMe, reactions, houseColor, houseName }), [state, run, patchMe, reactions, houseColor, houseName]);
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}
