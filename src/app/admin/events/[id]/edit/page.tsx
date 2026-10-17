import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { canManageEvent, getViewer } from "@/lib/auth";
import { getEventRow, listHouses } from "@/server/queries";
import { eventDTO } from "@/server/views";
import { updateEvent } from "@/app/admin/actions";
import { EventForm } from "@/components/admin/EventForm";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage({ params }: PageProps<"/admin/events/[id]/edit">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: { params: PageProps<"/admin/events/[id]/edit">["params"] }) {
  const { id } = await params;
  const v = await getViewer();
  if (!v) return <Gate kind="signin" next={`/admin/events/${id}/edit`} />;
  const row = await getEventRow(id);
  if (!row) return <Gate kind="notfound" />;
  if (!canManageEvent(v, row)) return <Gate kind="forbidden" />;
  const houses = await listHouses();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/admin/events/${row.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white">
        <ArrowLeft size={14} /> Back to control room
      </Link>
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight text-white">Edit details</h1>
      <EventForm
        action={updateEvent.bind(null, row.id)}
        houses={houses}
        event={eventDTO(row)}
        lockedHouseId={v.role === "organizer" ? v.houseId : null}
        submitLabel="Save changes"
      />
    </div>
  );
}
