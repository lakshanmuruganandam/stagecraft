"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Copy, Download, ExternalLink, MonitorPlay, Pencil, Play, Square, Wifi, WifiOff } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import { Badge, Button, buttonClass, OnAir } from "@/components/ui/primitives";
import { toast } from "@/components/site/Toaster";
import { ConfirmButton } from "../ConfirmButton";
import { fmtDate, fmtTime, KIND_LABEL } from "@/lib/format";

export function TopBar({ stageKey }: { stageKey: string }) {
  const { state, run } = useLive();
  const router = useRouter();
  const e = state.event;
  // The OBS link carries the signed stage key so that screen can show check-in QR codes.
  const obsPath = `/e/${e.slug}/stage?transparent=1&key=${stageKey}`;

  async function wrapUp() {
    const r = await run<{ certificates: number; points: number }>("event.wrapup");
    if (r) {
      toast(`Wrapped up: ${r.certificates} new certificate${r.certificates === 1 ? "" : "s"} issued, ${r.points} house points awarded.`, { tone: "ok" });
      router.refresh();
    }
  }

  return (
    <div className="border-b border-white/6 bg-ink-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {e.status === "live" ? <OnAir /> : <Badge tone={e.status === "ended" ? "muted" : e.status === "draft" ? "muted" : "spot"}>{e.status}</Badge>}
            <Badge>{KIND_LABEL[e.kind]}</Badge>
            <span className="timecode text-xs text-ink-400">
              {fmtDate(e.startsAt)} · {fmtTime(e.startsAt)} IST
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-400" title={state.connected ? "Realtime connected" : "Reconnecting"}>
              {state.connected ? <Wifi size={12} className="text-ok" /> : <WifiOff size={12} className="text-warn" />}
              <span className="timecode">{state.presence}</span> watching
            </span>
            {e.wrappedAt && <Badge tone="ok">Certificates issued</Badge>}
          </div>
          <h1 className="truncate font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">{e.title}</h1>
        </div>

        <nav aria-label="Event links" className="flex flex-wrap items-center gap-1.5">
          <Link href={`/e/${e.slug}`} target="_blank" className={buttonClass("ghost", "sm")}>
            <ExternalLink size={14} /> Public page
          </Link>
          <Link href={`/e/${e.slug}/stage`} target="_blank" className={buttonClass("ghost", "sm")}>
            <MonitorPlay size={14} /> Stage view
          </Link>
          <Button
            size="sm"
            variant="ghost"
            title={obsPath}
            onClick={async () => {
              await navigator.clipboard.writeText(location.origin + obsPath);
              toast("OBS browser-source URL copied. Add it as a 1920×1080 Browser Source.", { tone: "ok" });
            }}
          >
            <Copy size={14} /> OBS URL
          </Button>
          <a href={`/api/events/${e.id}/export`} className={buttonClass("ghost", "sm")}>
            <Download size={14} /> CSV
          </a>
          <Link href={`/admin/events/${e.id}/edit`} className={buttonClass("ghost", "sm")}>
            <Pencil size={14} /> Edit
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {e.status !== "live" && e.status !== "ended" && (
            <Button onClick={() => run("event.status", { status: "live" })}>
              <Play size={15} /> Go live
            </Button>
          )}
          {e.status === "live" && (
            <ConfirmButton variant="outline" confirmLabel="End the show?" onConfirm={() => run("event.status", { status: "ended" })}>
              <Square size={14} /> End show
            </ConfirmButton>
          )}
          {e.status === "ended" && (
            <Button variant="subtle" onClick={() => run("event.status", { status: "live" })}>
              <Play size={15} /> Back on air
            </Button>
          )}
          <ConfirmButton variant="primary" confirmLabel="Issue certificates now?" onConfirm={wrapUp}>
            <Award size={15} /> {e.wrappedAt ? "Re-run wrap up" : "Wrap up & issue certificates"}
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
