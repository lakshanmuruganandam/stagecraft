import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { listHouses } from "@/server/queries";
import { createEvent } from "@/app/admin/actions";
import { EventForm } from "@/components/admin/EventForm";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <NewEvent />
    </Suspense>
  );
}

/** Default start: tomorrow, rounded up to the next half hour. */
function suggestedStart() {
  return Math.ceil((Date.now() + 86_400_000) / 1_800_000) * 1_800_000;
}

async function NewEvent() {
  const v = await getViewer();
  if (!v) return <Gate kind="signin" next="/admin/events/new" />;
  if (v.role !== "admin" && v.role !== "organizer") return <Gate kind="forbidden" />;
  const houses = await listHouses();
  const defaultStartMs = suggestedStart();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white">
        <ArrowLeft size={14} /> Control room
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-white">New event</h1>
      <p className="mb-8 mt-1 text-ink-300">You can add polls, brackets, a talent hunt and a run of show from the control room after you save.</p>
      <EventForm action={createEvent} houses={houses} lockedHouseId={v.role === "organizer" ? v.houseId : null} submitLabel="Create & open control room" defaultStartMs={defaultStartMs} />
    </div>
  );
}
