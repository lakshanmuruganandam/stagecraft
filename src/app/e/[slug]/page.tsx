import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { certificatesFor, getEventRow, getSnapshot } from "@/server/queries";
import { LiveProvider } from "@/components/live/LiveProvider";
import { EventRoom } from "@/components/live/EventRoom";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEventRow(slug);
  return e ? { title: e.title, description: e.tagline ?? e.description.slice(0, 150) } : { title: "Event not found" };
}

export default function EventPage({ params }: PageProps<"/e/[slug]">) {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: PageProps<"/e/[slug]">["params"] }) {
  const { slug } = await params;
  const row = await getEventRow(slug);
  if (!row) notFound();
  const viewer = await getViewer();
  const [snap, certs] = await Promise.all([getSnapshot(row.id, viewer), viewer ? certificatesFor({ userId: viewer.id }) : Promise.resolve([])]);
  if (!snap) notFound();
  return (
    <LiveProvider snapshot={snap}>
      <EventRoom myCerts={certs.filter((c) => c.eventId === row.id)} />
    </LiveProvider>
  );
}

function RoomSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/5" />
        <div className="aspect-video animate-pulse rounded-2xl bg-white/5" />
      </div>
      <div className="h-[600px] animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}
