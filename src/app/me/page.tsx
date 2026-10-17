import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Award, Crown, Medal, Mic, Sparkles, Users } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { certificatesFor } from "@/server/queries";
import { Avatar, Badge, buttonClass, Empty } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import type { CertKind } from "@/lib/types";

export const metadata: Metadata = { title: "My credentials" };

const ICON: Record<CertKind, typeof Award> = { winner: Crown, "runner-up": Medal, third: Medal, participant: Users, speaker: Mic, organizer: Sparkles };

export default function MePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-white/4" />}>
        <Portfolio />
      </Suspense>
    </div>
  );
}

async function Portfolio() {
  const v = await getViewer();
  if (!v) {
    return (
      <Empty title="Sign in to see your credentials" icon={<Award size={32} />}>
        <Link href="/login?next=/me" className={`${buttonClass("primary")} mt-3`}>
          Sign in
        </Link>
      </Empty>
    );
  }
  const certs = await certificatesFor({ userId: v.id });
  const wins = certs.filter((c) => ["winner", "runner-up", "third"].includes(c.kind)).length;
  return (
    <>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={v.name} color={v.house?.color} size={72} />
        <div>
          <p className="eyebrow">{v.house?.name ?? "No"} House · {v.role}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">{v.name}</h1>
          <p className="mt-1 text-sm text-ink-300">
            {certs.length} credential{certs.length === 1 ? "" : "s"} · {wins} podium finish{wins === 1 ? "" : "es"}
          </p>
        </div>
      </div>
      <h2 className="eyebrow mb-4 mt-12">Verified credentials</h2>
      {certs.length === 0 ? (
        <div className="card">
          <Empty title="Nothing here yet" icon={<Award size={28} />}>
            Join a live event and take part. Your certificate lands here the moment the show wraps.
          </Empty>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {certs.map((c) => {
            const Icon = ICON[c.kind];
            return (
              <li key={c.id}>
                <Link href={`/c/${c.id}`} className="card group flex gap-4 p-5 transition hover:border-white/20">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${c.kind === "winner" ? "bg-spot-500/15 text-spot-400" : "bg-white/6 text-ink-200"}`}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug text-white">{c.achievement}</p>
                    <p className="mt-1 text-sm text-ink-400">
                      {c.eventTitle} · {fmtDate(c.issuedAt, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="mt-2 flex items-center gap-2">
                      <span className="timecode text-xs text-ink-500">{c.id}</span>
                      {c.revokedAt ? <Badge tone="live">revoked</Badge> : <Badge tone="ok">verified</Badge>}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
