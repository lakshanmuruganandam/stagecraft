import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";
import { buttonClass, inputClass } from "@/components/ui/primitives";
import { fmtDate, fmtTime } from "@/lib/format";
import { AUDIT_PAGE, auditFacets, auditQuery, listAudit, parseAuditFilters, PREFIXES } from "../_lib/audit";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Audit searchParams={searchParams} />
    </Suspense>
  );
}

const TONE: Record<string, string> = {
  auth: "text-sky-300",
  user: "text-spot-300",
  cert: "text-ok",
  event: "text-violet-300",
  audit: "text-ink-200",
};

async function Audit({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  const v = await getViewer();
  if (!v) return <Gate kind="signin" next="/admin/audit" />;
  if (v.role !== "admin") return <Gate kind="adminonly" />;
  const f = parseAuditFilters(await searchParams);
  const [{ rows, total, hasMore }, facets] = await Promise.all([listAudit(f), auditFacets()]);
  const filtered = !!(f.prefix || f.actor || f.event || f.from || f.to);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Governance</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white">Audit log</h1>
          <p className="mt-1 text-ink-300">Every privileged action across StageCraft, newest first. Append-only.</p>
        </div>
        <a href={`/admin/audit/export${auditQuery({ ...f, limit: AUDIT_PAGE })}`} className={buttonClass("outline")}>
          <Download size={15} /> Export CSV
        </a>
      </div>

      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[9rem_1fr_1fr_9.5rem_9.5rem_auto]">
        <label className="grid gap-1 text-xs text-ink-400">
          Action
          <select name="prefix" defaultValue={f.prefix ?? ""} className={inputClass}>
            <option value="">All</option>
            {PREFIXES.map((p) => (
              <option key={p} value={p}>
                {p}.*
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-400">
          Actor
          <select name="actor" defaultValue={f.actor ?? ""} className={inputClass}>
            <option value="">Anyone</option>
            <option value="system">System</option>
            {facets.actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-400">
          Event
          <select name="event" defaultValue={f.event ?? ""} className={inputClass}>
            <option value="">Any</option>
            <option value="none">Not event-specific</option>
            {facets.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-400">
          From (IST)
          <input type="date" name="from" defaultValue={f.from} className={inputClass} />
        </label>
        <label className="grid gap-1 text-xs text-ink-400">
          To (IST)
          <input type="date" name="to" defaultValue={f.to} className={inputClass} />
        </label>
        <div className="flex items-end gap-2">
          <button className={buttonClass("primary")}>Filter</button>
          {filtered && (
            <Link href="/admin/audit" className={buttonClass("ghost")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="mb-3 text-sm text-ink-400" aria-live="polite">
        Showing <span className="timecode text-ink-200">{rows.length}</span> of <span className="timecode text-ink-200">{total}</span> entries
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Audit log entries</caption>
          <thead className="border-b border-white/6 text-xs text-ink-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Time (IST)</th>
              <th scope="col" className="px-3 py-3 font-medium">Actor</th>
              <th scope="col" className="px-3 py-3 font-medium">Action</th>
              <th scope="col" className="px-3 py-3 font-medium">Detail</th>
              <th scope="col" className="px-4 py-3 font-medium">Event</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-white/[0.02]">
                <td className="timecode whitespace-nowrap px-4 py-2.5 text-xs text-ink-300">
                  {fmtDate(r.createdAt, { day: "numeric", month: "short" })} · {fmtTime(r.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  {r.actorId ? (
                    <Link href={`/admin/users/${r.actorId}`} className="text-ink-100 hover:underline">
                      {r.actor ?? r.actorId}
                    </Link>
                  ) : (
                    <span className="text-ink-500">System</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <code className={`text-xs ${TONE[r.action.split(".")[0]] ?? "text-ink-200"}`}>{r.action}</code>
                </td>
                <td className="max-w-md px-3 py-2.5 text-xs text-ink-300">
                  <span className="line-clamp-2 break-words">{r.detail ?? "—"}</span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {r.eventId ? (
                    <Link href={`/admin/events/${r.eventId}`} className="text-spot-400 hover:underline">
                      {r.eventTitle ?? r.eventId}
                    </Link>
                  ) : (
                    <span className="text-ink-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-400">
                  No entries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Link href={`/admin/audit${auditQuery(f, { limit: f.limit + AUDIT_PAGE })}`} scroll={false} className={buttonClass("outline")}>
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}
