"use client";

import type { ReactNode } from "react";
import { ChatPanel } from "@/components/live/ChatPanel";
import { TopBar } from "./TopBar";
import { StageDesk } from "./StageDesk";
import { Workspace } from "./Workspace";
import { AudienceSettings } from "./AudienceSettings";
import { Panel } from "./Panel";

/**
 * Three-column broadcast console. Collapses to a single column on
 * narrow screens in the order an organizer needs it: workspace first.
 * `insights` is a server-rendered slot (engagement, certificates, audit).
 */
export function ControlRoom({ insights }: { insights: ReactNode }) {
  return (
    <div className="pb-16">
      <TopBar />
      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] 2xl:grid-cols-[400px_minmax(0,1fr)_380px]">
        <div className="order-2 space-y-4 lg:order-1">
          <StageDesk />
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          <Workspace />
        </div>
        <div className="order-3 space-y-4 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:col-span-1 2xl:block 2xl:space-y-4">
          <Panel title="Live chat" subtitle="Hover a message to pin, hide or mute">
            <div className="h-[420px]">
              <ChatPanel />
            </div>
          </Panel>
          <div className="space-y-4">
            <AudienceSettings />
            {insights}
          </div>
        </div>
      </div>
    </div>
  );
}
