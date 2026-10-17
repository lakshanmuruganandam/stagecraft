import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, TimerOff } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { auditGlobal, getViewer } from "@/lib/auth";
import { verifyCode } from "@/lib/checkin";
import { publish, publicChannel } from "@/lib/live";
import { getEventRow } from "@/server/queries";
import { buttonClass } from "@/components/ui/primitives";
import { Burst } from "@/components/site/Burst";

export const metadata: Metadata = { title: "Check in", robots: { index: false } };

export default function CheckinPage(props: PageProps<"/e/[slug]/checkin">) {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
      <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-3xl bg-white/4" />}>
        <Checkin {...props} />
      </Suspense>
    </div>
  );
}

async function Checkin({ params, searchParams }: PageProps<"/e/[slug]/checkin">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const code = typeof sp.c === "string" ? sp.c : "";
  const event = await getEventRow(slug);
  if (!event) notFound();
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(`/e/${slug}/checkin?c=${code}`)}`);

  if (!verifyCode(event.id, code) || event.status !== "live") {
    return (
      <div className="card w-full p-8">
        <TimerOff className="mx-auto text-warn" size={40} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-white">That code has expired</h1>
        <p className="mt-2 text-sm text-ink-300">Check-in codes rotate every 30 seconds so they only work in the room. Scan the QR on the stage screen again.</p>
        <Link href={`/e/${event.slug}`} className={`${buttonClass("outline")} mt-6`}>
          Go to the event
        </Link>
      </div>
    );
  }

  const db = await getDb();
  const existing = await db.query.registrations.findFirst({ where: and(eq(s.registrations.eventId, event.id), eq(s.registrations.userId, v.id)) });
  if (!existing) {
    await db.insert(s.registrations).values({ eventId: event.id, userId: v.id, role: "attendee" }).onConflictDoNothing();
    await auditGlobal(v.id, "event.checkin", event.id);
    await publish(publicChannel(event.id), "toast", { message: `${v.name.split(" ")[0]} from ${v.house?.name ?? "a house"} just checked in 📍` });
  }
  return (
    <div className="card relative w-full overflow-hidden p-8">
      <Burst color={v.house?.color ?? "#ffa928"} />
      <CheckCircle2 className="mx-auto text-ok" size={48} />
      <p className="eyebrow mt-4">Proof of presence</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">{existing ? "You're already checked in" : "You're in!"}</h1>
      <p className="mt-2 text-ink-300">
        Attendance at <strong className="text-white">{event.title}</strong> is recorded. You&apos;ll get a participation certificate, and{" "}
        <span style={{ color: v.house?.color }}>{v.house?.name ?? "your house"}</span> earns points when the show wraps.
      </p>
      <Link href={`/e/${event.slug}`} className={`${buttonClass("primary", "lg")} mt-6`}>
        Join the live room
      </Link>
    </div>
  );
}
