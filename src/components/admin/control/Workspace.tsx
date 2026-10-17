"use client";

import { useState } from "react";
import { ChevronDown, MessagesSquare, Swords, Trophy, Vote } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import { QAPanel } from "@/components/live/QAPanel";
import { PollsPanel } from "@/components/live/PollsPanel";
import { BracketsPanel } from "@/components/live/BracketView";
import { ContestsPanel } from "@/components/live/ContestPanel";
import { BracketBuilder, ContestBuilder, PollComposer } from "./Builders";

type Tab = "qa" | "polls" | "bracket" | "talent";

/** Center column: one tab per interactive format. */
export function Workspace() {
  const { state } = useLive();
  const pending = state.questions.filter((q) => q.status === "pending").length;
  const live = state.polls.filter((p) => p.status === "open").length;
  const [tab, setTab] = useState<Tab>(() => (state.event.kind === "esports" ? "bracket" : state.event.kind === "cultural" ? "talent" : "qa"));
  const tabs = [
    { id: "qa" as const, label: "Q&A", icon: MessagesSquare, badge: pending, badgeLabel: "awaiting approval" },
    { id: "polls" as const, label: "Polls", icon: Vote, badge: live, badgeLabel: "live" },
    { id: "bracket" as const, label: "Bracket", icon: Swords, badge: 0, badgeLabel: "" },
    { id: "talent" as const, label: "Talent hunt", icon: Trophy, badge: 0, badgeLabel: "" },
  ];

  return (
    <section aria-label="Workspace" className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-white/7 bg-ink-900/70">
      <div role="tablist" aria-label="Workspace" className="flex gap-1 overflow-x-auto border-b border-white/6 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`ws-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`ws-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm transition ${tab === t.id ? "bg-white/8 text-white" : "text-ink-400 hover:text-white"}`}
          >
            <t.icon size={15} /> {t.label}
            {t.badge > 0 && (
              <span className="timecode rounded-full bg-spot-500 px-1.5 text-[0.65rem] font-semibold text-ink-950" aria-label={`${t.badge} ${t.badgeLabel}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`ws-panel-${tab}`} aria-labelledby={`ws-tab-${tab}`} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {tab === "qa" && (
          <div className="h-[640px]">
            <QAPanel />
          </div>
        )}
        {tab === "polls" && (
          <div className="space-y-4 p-4">
            <PollComposer />
            <PollsPanel compact />
          </div>
        )}
        {tab === "bracket" && (
          <div className="space-y-6 p-4">
            <Collapsible title="New bracket" defaultOpen={state.brackets.length === 0}>
              <BracketBuilder />
            </Collapsible>
            <BracketsPanel />
          </div>
        )}
        {tab === "talent" && (
          <div className="space-y-6 p-4">
            <Collapsible title="New talent-hunt contest" defaultOpen={state.contests.length === 0}>
              <ContestBuilder />
            </Collapsible>
            <ContestsPanel />
          </div>
        )}
      </div>
    </section>
  );
}

function Collapsible({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink-200 [&::-webkit-details-marker]:hidden">
        <ChevronDown size={15} className="-rotate-90 transition group-open:rotate-0" /> {title}
      </summary>
      {children}
    </details>
  );
}
