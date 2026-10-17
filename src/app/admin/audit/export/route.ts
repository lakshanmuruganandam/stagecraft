import type { NextRequest } from "next/server";
import { getViewer, auditGlobal } from "@/lib/auth";
import { listAudit, parseAuditFilters } from "../../_lib/audit";

const csv = (v: unknown) => {
  const s = String(v ?? "");
  // Neutralise spreadsheet formula injection (=, +, -, @ at cell start).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Admin-only CSV export of the audit log, honouring the page's filters. */
export async function GET(req: NextRequest) {
  const v = await getViewer();
  if (!v) return new Response("Sign in required", { status: 401 });
  if (v.role !== "admin") return new Response("Admins only", { status: 403 });
  const f = parseAuditFilters(req.nextUrl.searchParams, 20_000);
  if (!req.nextUrl.searchParams.has("limit")) f.limit = 20_000;
  const { rows } = await listAudit(f);
  const lines = [
    ["time_iso", "actor", "actor_email", "action", "detail", "event_id", "event_title"].join(","),
    ...rows.map((r) => [new Date(r.createdAt).toISOString(), r.actor ?? "system", r.actorEmail, r.action, r.detail, r.eventId, r.eventTitle].map(csv).join(",")),
  ];
  // Exporting the log is itself an auditable action.
  await auditGlobal(v.id, "audit.export", `${rows.length} rows ${req.nextUrl.search || "(no filters)"}`);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stagecraft-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
