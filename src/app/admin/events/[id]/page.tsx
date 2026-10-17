import { Suspense } from "react";
import type { Metadata } from "next";
import { canManageEvent, getViewer } from "@/lib/auth";
import { getEventRow, getSnapshot } from "@/server/queries";
import { LiveProvider } from "@/components/live/LiveProvider";
import { ControlRoom } from "@/components/admin/control/ControlRoom";
import { Insights, InsightsSkeleton } from "@/components/admin/control/Insights";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";

export const metadata: Metadata = { title: "Control room" };

export default function ControlRoomPage({ params }: PageProps<"/admin/events/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: PageProps<"/admin/events/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return <Gate kind="signin" next={`/admin/events/${id}`} />;
  const row = await getEventRow(id);
  if (!row) return <Gate kind="notfound" />;
  if (!canManageEvent(viewer, row)) return <Gate kind="forbidden" />;
  const snap = await getSnapshot(row.id, viewer);
  if (!snap) return <Gate kind="notfound" />;
  return (
    <LiveProvider snapshot={snap}>
      <ControlRoom
        insights={
          <Suspense fallback={<InsightsSkeleton />}>
            <Insights eventId={row.id} />
          </Suspense>
        }
      />
    </LiveProvider>
  );
}
