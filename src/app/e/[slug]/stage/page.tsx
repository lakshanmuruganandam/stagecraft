import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventRow, getSnapshot } from "@/server/queries";
import { LiveProvider } from "@/components/live/LiveProvider";
import { StageView } from "./StageView";

export const metadata: Metadata = { title: "Stage view", robots: { index: false } };

/**
 * Full-screen stage graphics for projectors and OBS browser sources.
 * Append ?transparent=1 to key it over the video feed.
 */
export default function StagePage({ params, searchParams }: PageProps<"/e/[slug]/stage">) {
  return (
    <Suspense fallback={<div className="stage-root fixed inset-0" />}>
      <Loader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Loader({ params, searchParams }: Pick<PageProps<"/e/[slug]/stage">, "params" | "searchParams">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const row = await getEventRow(slug);
  if (!row || row.status === "draft") notFound();
  // Stage output is the public view, even when an organizer opens it.
  const snap = await getSnapshot(row.id, null);
  if (!snap) notFound();
  return (
    <LiveProvider snapshot={snap}>
      <StageView transparent={sp.transparent === "1"} />
    </LiveProvider>
  );
}
