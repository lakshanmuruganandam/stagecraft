"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ListOrdered, MessageSquare, MessagesSquare, MonitorPlay, Swords, Trophy, Vote, Wifi, WifiOff } from "lucide-react";
import { useLive } from "./LiveProvider";
import { Player, ReactionBar } from "./Stage";
import { ChatPanel } from "./ChatPanel";
import { QAPanel } from "./QAPanel";
import { PollsPanel } from "./PollsPanel";
import { BracketsPanel } from "./BracketView";
import { ContestsPanel } from "./ContestPanel";
import { RunOfShow } from "./RunOfShow";
import { Badge, buttonClass, OnAir } from "@/components/ui/primitives";
import { fmtDate, fmtTime, KIND_LABEL } from "@/lib/format";
import type { CertificateDTO } from "@/lib/types";

type Side = "chat" | "qa" | "polls" | "schedule";

export function EventRoom({ myCerts }: { myCerts: CertificateDTO[] }) {
  const { state, houseColor, houseName } = useLive();
  const e = state.event;
  const openPolls = state.polls.filter((p) => p.status === "open").length;
  const [side, setSide] = useState<Side>(e.kind === "talk" ? "qa" : "chat");
  const tabs: { id: Side; label: string; icon: typeof MessageSquare; badge?: number }[] = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "qa", label: "Q&A", icon: MessagesSquare, badge: state.questions.filter((q) => q.status === "live").length },
    { id: "polls", label: "Polls", icon: Vote, badge: openPolls || undefined },
    { id: "schedule", label: "Schedule", icon: ListOrdered },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      {/* Title row */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {e.status === "live" ? <OnAir /> : e.status === "ended" ? <Badge tone="muted">Ended</Badge> : <Badge tone="spot">Upcoming · {fmtDate(e.startsAt)} {fmtTime(e.startsAt)}</Badge>}
            <Badge>{KIND_LABEL[e.kind]}</Badge>
            {e.hostHouseIds.slice(0, 4).map((h) => (
              <span key={h} className="inline-flex items-center gap-1 text-xs text-ink-300">
                <span className="size-2 rounded-full" style={{ background: houseColor(h) }} />
                {houseName(h)}
              </span>
            ))}
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">{e.title}</h1>
          {e.tagline && <p className="mt-1 text-ink-300">{e.tagline}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-ink-300" title={state.connected ? "Live connection active" : "Reconnecting…"}>
            {state.connected ? <Wifi size={13} className="text-ok" /> : <WifiOff size={13} className="text-warn" />}
            <Eye size={13} /> <span className="timecode">{state.presence}</span> watching
          </span>
          <Link href={`/e/${e.slug}/stage`} target="_blank" className={buttonClass("outline", "sm")}>
            <MonitorPlay size={14} /> Stage view
          </Link>
          {state.canManage && (
            <Link href={`/admin/events/${e.id}`} className={buttonClass("primary", "sm")}>
              Control room
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <Player />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReactionBar />
            {state.event.status === "ended" && myCerts.length > 0 && (
              <Link href={`/c/${myCerts[0].id}`} className={buttonClass("primary", "sm")}>
                <Trophy size={14} /> View your certificate
              </Link>
            )}
          </div>

          {state.brackets.length > 0 && (
            <section className="card p-5">
              <h2 className="eyebrow mb-4 flex items-center gap-2">
                <Swords size={13} /> Esports arena
              </h2>
              <BracketsPanel />
            </section>
          )}
          {state.contests.length > 0 && (
            <section className="card p-5">
              <h2 className="eyebrow mb-4 flex items-center gap-2">
                <Trophy size={13} /> Audience vote
              </h2>
              <ContestsPanel />
            </section>
          )}
          <section className="card p-5">
            <h2 className="eyebrow mb-2">About this event</h2>
            <p className="max-w-3xl leading-relaxed text-ink-200">{e.description}</p>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="card flex h-[min(78vh,760px)] min-h-[520px] flex-col overflow-hidden lg:sticky lg:top-20">
          <div role="tablist" aria-label="Interact" className="grid grid-cols-4 border-b border-white/6 p-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={side === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setSide(t.id)}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[0.72rem] transition ${side === t.id ? "bg-white/8 text-white" : "text-ink-400 hover:text-white"}`}
              >
                <t.icon size={16} />
                {t.label}
                {!!t.badge && <span className="timecode absolute right-2 top-1 rounded-full bg-spot-500 px-1.5 text-[0.6rem] font-semibold text-ink-950">{t.badge}</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${side}`} aria-labelledby={`tab-${side}`} className="min-h-0 flex-1 overflow-hidden">
            {side === "chat" && <ChatPanel />}
            {side === "qa" && <QAPanel />}
            {side === "polls" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <PollsPanel />
              </div>
            )}
            {side === "schedule" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <RunOfShow />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
