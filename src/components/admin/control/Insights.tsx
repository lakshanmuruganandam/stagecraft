import Link from "next/link";
import { auditFor, certificatesFor, engagement } from "@/server/queries";
import { Badge } from "@/components/ui/primitives";
import { fmtTime } from "@/lib/format";
import { Panel } from "./Panel";
import { RefreshButton, RevokeButton } from "./InsightControls";

const KIND_TONE = { winner: "spot", "runner-up": "spot", third: "spot", participant: "muted", speaker: "neutral", organizer: "neutral" } as const;

/** Server-rendered numbers that don't need per-message realtime. */
export async function Insights({ eventId }: { eventId: string }) {
  const [eng, certs, audit] = await Promise.all([engagement(eventId), certificatesFor({ eventId }), auditFor(eventId, 30)]);
  const stats = [
    ["Took part", eng.participants],
    ["Chat messages", eng.chat],
    ["Questions", eng.questions],
    ["Upvotes", eng.questionVotes],
    ["Poll votes", eng.pollVotes],
    ["Act votes", eng.actVotes],
    ["Predictions", eng.predictions],
  ] as const;

  return (
    <>
      <Panel title="Engagement" action={<RefreshButton />}>
        <dl className="grid grid-cols-2 gap-px bg-white/6">
          {stats.map(([label, n]) => (
            <div key={label} className="bg-ink-900 px-4 py-3">
              <dt className="text-[0.7rem] text-ink-400">{label}</dt>
              <dd className="timecode text-xl font-semibold text-white">{n}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title={`Certificates · ${certs.length}`} subtitle="Signed with Ed25519 · verifiable at /verify" action={<RefreshButton />}>
        {certs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-400">None yet. Press “Wrap up” when the show ends.</p>
        ) : (
          <ul className="scrollbar-thin max-h-80 divide-y divide-white/6 overflow-y-auto">
            {certs.map((c) => (
              <li key={c.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 ${c.revokedAt ? "opacity-55" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{c.recipientName}</p>
                  <p className="truncate text-[0.7rem] text-ink-400">{c.achievement}</p>
                </div>
                <Badge tone={c.revokedAt ? "live" : KIND_TONE[c.kind]}>{c.revokedAt ? "revoked" : c.kind}</Badge>
                <Link href={`/c/${c.id}`} target="_blank" className="timecode text-xs text-spot-400 hover:underline">
                  {c.id}
                </Link>
                {!c.revokedAt && <RevokeButton certificateId={c.id} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Audit log" action={<RefreshButton />}>
        {audit.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-400">No organizer actions yet.</p>
        ) : (
          <ol className="scrollbar-thin max-h-72 space-y-0.5 overflow-y-auto p-2">
            {audit.map((a) => (
              <li key={a.id} className="grid grid-cols-[3.6rem_1fr] gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/3">
                <span className="timecode text-ink-500">{fmtTime(a.createdAt)}</span>
                <span className="min-w-0 text-ink-300">
                  <span className="text-ink-100">{a.actor ?? "System"}</span> · <code className="text-spot-300">{a.action}</code>
                  {a.detail && <span className="block truncate text-ink-500">{a.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/4" />
      ))}
    </div>
  );
}
