import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { connection } from "next/server";
import { Laptop, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { getViewer } from "@/lib/auth";
import { revokeSession, signOutEverywhere } from "@/app/actions/auth";
import { Avatar, Badge, buttonClass } from "@/components/ui/primitives";
import { fmtRelative } from "@/lib/format";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Account & security" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white/4" />}>
        <Account />
      </Suspense>
    </div>
  );
}

function device(ua: string | null) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const mobile = /Mobile|Android|iPhone/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return { label: `${browser}${os ? ` on ${os}` : ""}`, mobile };
}

async function Account() {
  await connection();
  const v = await getViewer();
  if (!v) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-200">Sign in to manage your account.</p>
        <Link href="/login?next=/account" className={`${buttonClass("primary")} mt-4`}>
          Sign in
        </Link>
      </div>
    );
  }
  const db = await getDb();
  const now = requestTime();
  const sessions = await db
    .select()
    .from(s.sessions)
    .where(and(eq(s.sessions.userId, v.id), isNull(s.sessions.revokedAt), gt(s.sessions.expiresAt, now)))
    .orderBy(desc(s.sessions.lastSeenAt));

  return (
    <div className="grid gap-8">
      <div className="flex items-center gap-4">
        <Avatar name={v.name} color={v.house?.color} size={60} />
        <div>
          <p className="eyebrow">{v.house?.name ?? "No"} House · {v.role}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">{v.name}</h1>
          <p className="text-sm text-ink-400">{v.email}</p>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-white">Password</h2>
        <p className="mt-1 text-sm text-ink-400">Changing it signs you out on every other device.</p>
        <PasswordForm hasPassword={!!v.passwordHash} />
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white">
              <ShieldCheck size={18} className="text-ok" /> Where you&apos;re signed in
            </h2>
            <p className="mt-1 text-sm text-ink-400">Sessions expire after 14 days of inactivity.</p>
          </div>
          {sessions.length > 1 && (
            <form action={signOutEverywhere}>
              <button className={buttonClass("outline", "sm")}>
                <LogOut size={14} /> Sign out other devices
              </button>
            </form>
          )}
        </div>
        <ul className="mt-5 divide-y divide-white/6">
          {sessions.map((x) => {
            const d = device(x.userAgent);
            const current = x.id === v.sessionId;
            return (
              <li key={x.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/5 text-ink-300">{d.mobile ? <Smartphone size={16} /> : <Laptop size={16} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {d.label} {current && <Badge tone="ok">This device</Badge>}
                  </p>
                  <p className="timecode text-xs text-ink-500">
                    {x.ip ?? "unknown IP"} · signed in {fmtRelative(x.createdAt, now)} · active {fmtRelative(x.lastSeenAt, now)}
                  </p>
                </div>
                {!current && (
                  <form action={revokeSession}>
                    <input type="hidden" name="sessionId" value={x.id} />
                    <button className={buttonClass("ghost", "sm")}>Sign out</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Wall-clock time for this request (read after connection()). */
function requestTime() {
  return Date.now();
}
