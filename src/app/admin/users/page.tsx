import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronDown, Search } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { listHouses } from "@/server/queries";
import { AdminSkeleton, Gate } from "@/components/admin/Gate";
import { UserActions } from "@/components/admin/users/UserActions";
import { Avatar, Badge, buttonClass, inputClass } from "@/components/ui/primitives";
import { fmtDate, fmtRelative } from "@/lib/format";
import { listUsers, now, PAGE, parseUserFilters, type UserFilters } from "../_lib/users";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

const ROLE_TONE = { admin: "spot", organizer: "ok", member: "neutral" } as const;

function qs(f: UserFilters, patch: Partial<UserFilters>) {
  const merged = { ...f, ...patch };
  const p = new URLSearchParams();
  if (merged.q) p.set("q", merged.q);
  if (merged.house) p.set("house", merged.house);
  if (merged.role) p.set("role", merged.role);
  if (merged.status) p.set("status", merged.status);
  if (merged.limit !== PAGE) p.set("limit", String(merged.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function Users({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  const v = await getViewer();
  if (!v) return <Gate kind="signin" next="/admin/users" />;
  if (v.role !== "admin") return <Gate kind="adminonly" />;
  const f = parseUserFilters(await searchParams);
  const [{ users, total, hasMore }, houses] = await Promise.all([listUsers(f), listHouses()]);
  const t = now();
  const filtered = !!(f.q || f.house || f.role || f.status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="eyebrow">Governance</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white">Users</h1>
        <p className="mt-1 text-ink-300">Roles, houses, suspensions and sessions. Every change is written to the audit log.</p>
      </div>

      <form method="get" role="search" className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_10rem_9rem_9rem_auto]">
        <label className="relative">
          <span className="sr-only">Search name or email</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input name="q" defaultValue={f.q} placeholder="Search name or email" className={`${inputClass} pl-9`} />
        </label>
        <label>
          <span className="sr-only">House</span>
          <select name="house" defaultValue={f.house ?? ""} className={inputClass}>
            <option value="">All houses</option>
            <option value="none">No house</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Role</span>
          <select name="role" defaultValue={f.role ?? ""} className={inputClass}>
            <option value="">All roles</option>
            <option value="admin">Admins</option>
            <option value="organizer">Organizers</option>
            <option value="member">Members</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={f.status ?? ""} className={inputClass}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="muted">Muted</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className={buttonClass("primary")}>Filter</button>
          {filtered && (
            <Link href="/admin/users" className={buttonClass("ghost")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="mb-3 text-sm text-ink-400" aria-live="polite">
        Showing <span className="timecode text-ink-200">{users.length}</span> of <span className="timecode text-ink-200">{total}</span> user{total === 1 ? "" : "s"}
        {filtered && " matching your filters"}
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <caption className="sr-only">Users</caption>
          <thead className="border-b border-white/6 text-xs text-ink-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">User</th>
              <th scope="col" className="px-3 py-3 font-medium">House</th>
              <th scope="col" className="px-3 py-3 font-medium">Role</th>
              <th scope="col" className="px-3 py-3 font-medium">Status</th>
              <th scope="col" className="px-3 py-3 font-medium">Last login</th>
              <th scope="col" className="px-3 py-3 font-medium">Sessions</th>
              <th scope="col" className="px-3 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => {
              const muted = !!u.mutedUntil && u.mutedUntil > t;
              return (
                <tr key={u.id} className={`align-top ${u.suspendedAt ? "bg-onair/[0.03]" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="group flex items-center gap-3">
                      <Avatar name={u.name} color={u.house?.color} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-white group-hover:underline">
                          {u.name}
                          {u.id === v.id && <span className="ml-1.5 text-xs text-ink-400">(you)</span>}
                        </span>
                        <span className="block truncate text-xs text-ink-400">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-ink-200">
                    {u.house ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: u.house.color }} />
                        {u.house.name}
                      </span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    {u.suspendedAt ? (
                      <span title={u.suspendedReason ?? undefined}>
                        <Badge tone="live">Suspended</Badge>
                      </span>
                    ) : muted ? (
                      <Badge tone="muted">Muted</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ok">
                        <span className="size-1.5 rounded-full bg-ok" /> Active
                      </span>
                    )}
                  </td>
                  <td className="timecode px-3 py-3 text-xs text-ink-300">{u.lastLoginAt ? fmtRelative(u.lastLoginAt, t) : <span className="text-ink-500">never</span>}</td>
                  <td className="timecode px-3 py-3 text-ink-200">{u.activeSessions}</td>
                  <td className="timecode px-3 py-3 text-xs text-ink-400">{fmtDate(u.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-right">
                    <details className="group relative inline-block text-left">
                      <summary className={`${buttonClass("ghost", "sm")} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                        Manage <ChevronDown size={13} className="transition group-open:rotate-180" />
                      </summary>
                      <div className="absolute right-0 z-20 mt-2 w-[22rem] rounded-2xl border border-white/10 bg-ink-850 p-4 shadow-2xl">
                        <UserActions user={u} houses={houses} isSelf={u.id === v.id} />
                        <Link href={`/admin/users/${u.id}`} className="mt-3 block text-xs text-spot-400 hover:underline">
                          Sessions, certificates & history →
                        </Link>
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-ink-400">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Link href={`/admin/users${qs(f, { limit: f.limit + PAGE })}`} scroll={false} className={buttonClass("outline")}>
            Show {Math.min(PAGE, total - users.length)} more
          </Link>
        </div>
      )}
    </div>
  );
}
