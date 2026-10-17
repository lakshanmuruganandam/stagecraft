import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, Monitor, Smartphone } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { listHouses } from "@/server/queries";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";
import { RevokeSession, UserActions } from "@/components/admin/users/UserActions";
import { Panel } from "@/components/admin/control/Panel";
import { Avatar, Badge } from "@/components/ui/primitives";
import { fmtDate, fmtRelative, fmtTime } from "@/lib/format";
import { getUserDetail, now } from "../../_lib/users";

export const metadata: Metadata = { title: "User" };

export default function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <UserDetail params={params} />
    </Suspense>
  );
}

/** "Mozilla/5.0 (Macintosh…) … Chrome/140" → "Chrome on macOS". */
function uaSummary(ua: string | null) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl|node|undici/i.test(ua) ? "Script" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "unknown OS";
  return { label: `${browser} on ${os}`, mobile: /Mobile|iPhone|Android/.test(ua) };
}

async function UserDetail({ params }: { params: PageProps<"/admin/users/[id]">["params"] }) {
  const { id } = await params;
  const v = await getViewer();
  if (!v) return <Gate kind="signin" next={`/admin/users/${id}`} />;
  if (v.role !== "admin") return <Gate kind="adminonly" />;
  const [d, houses] = await Promise.all([getUserDetail(id), listHouses()]);
  if (!d) return <Gate kind="notfound" />;
  const { user: u, house } = d;
  const t = now();
  const active = d.sessions.filter((s) => !s.revokedAt && s.expiresAt > t);
  const muted = !!u.mutedUntil && u.mutedUntil > t;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white">
        <ArrowLeft size={14} /> All users
      </Link>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={u.name} color={house?.color} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            {u.name}
            {u.id === v.id && <span className="ml-2 text-base font-normal text-ink-400">(you)</span>}
          </h1>
          <p className="text-ink-300">
            {u.email} · {house?.name ?? "No house"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={u.role === "admin" ? "spot" : u.role === "organizer" ? "ok" : "neutral"}>{u.role}</Badge>
            {u.suspendedAt ? <Badge tone="live">Suspended {fmtRelative(u.suspendedAt, t)}</Badge> : <Badge tone="ok">Active</Badge>}
            {muted && <Badge tone="muted">Muted until {fmtTime(u.mutedUntil!)}</Badge>}
            <Badge tone="muted">Joined {fmtDate(u.createdAt, { day: "numeric", month: "short", year: "numeric" })}</Badge>
            <Badge tone="muted">Last login {u.lastLoginAt ? fmtRelative(u.lastLoginAt, t) : "never"}</Badge>
          </div>
          {u.suspendedReason && <p className="mt-2 text-sm text-danger">Reason: {u.suspendedReason}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <Panel title="Account controls">
            <div className="p-4">
              <UserActions user={u} houses={houses} isSelf={u.id === v.id} />
            </div>
          </Panel>

          <Panel title={`Certificates · ${d.certs.length}`}>
            {d.certs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">No certificates yet.</p>
            ) : (
              <ul className="divide-y divide-white/6">
                {d.certs.map((c) => (
                  <li key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${c.revokedAt ? "opacity-55" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{c.achievement}</p>
                      <p className="text-xs text-ink-400">
                        {c.eventTitle} · {fmtDate(c.issuedAt)}
                      </p>
                    </div>
                    {c.revokedAt && <Badge tone="live">revoked</Badge>}
                    <Link href={`/c/${c.id}`} className="timecode text-xs text-spot-400 hover:underline">
                      {c.id}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={`Sessions · ${active.length} active`} subtitle="Server-side sessions; revoking takes effect on the next request">
            {d.sessions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">No sessions recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-ink-400">
                    <tr className="border-b border-white/6">
                      <th scope="col" className="px-4 py-2 font-medium">Device</th>
                      <th scope="col" className="px-3 py-2 font-medium">IP</th>
                      <th scope="col" className="px-3 py-2 font-medium">Signed in</th>
                      <th scope="col" className="px-3 py-2 font-medium">Last seen</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {d.sessions.map((s) => {
                      const ua = uaSummary(s.userAgent);
                      const dead = !!s.revokedAt || s.expiresAt <= t;
                      return (
                        <tr key={s.id} className={dead ? "opacity-50" : ""}>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2 text-ink-100" title={s.userAgent ?? undefined}>
                              {ua.mobile ? <Smartphone size={14} /> : <Monitor size={14} />} {ua.label}
                            </span>
                          </td>
                          <td className="timecode px-3 py-2.5 text-xs text-ink-300">{s.ip ?? "—"}</td>
                          <td className="timecode px-3 py-2.5 text-xs text-ink-300">{fmtRelative(s.createdAt, t)}</td>
                          <td className="timecode px-3 py-2.5 text-xs text-ink-300">{fmtRelative(s.lastSeenAt, t)}</td>
                          <td className="px-4 py-2.5 text-right">
                            {s.revokedAt ? (
                              <span className="text-xs text-ink-500">revoked</span>
                            ) : s.expiresAt <= t ? (
                              <span className="text-xs text-ink-500">expired</span>
                            ) : (
                              <RevokeSession userId={u.id} sessionId={s.id} current={s.id === v.sessionId} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="History" subtitle="Audit entries by or about this user">
            {d.audit.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">Nothing recorded yet.</p>
            ) : (
              <ol className="max-h-[28rem] space-y-0.5 overflow-y-auto p-2">
                {d.audit.map((a) => (
                  <li key={a.id} className="grid grid-cols-[6.5rem_1fr] gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/3">
                    <span className="timecode text-ink-500">{fmtRelative(a.createdAt, t)}</span>
                    <span className="min-w-0 text-ink-300">
                      <span className="text-ink-100">{a.actorId === u.id ? "They" : (a.actor ?? "System")}</span> · <code className="text-spot-300">{a.action}</code>
                      {a.eventId && (
                        <Link href={`/admin/events/${a.eventId}`} className="ml-1 text-ink-400 hover:text-white">
                          (event)
                        </Link>
                      )}
                      {a.detail && <span className="block truncate text-ink-500">{a.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
