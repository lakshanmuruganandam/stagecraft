"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { auditGlobal, endSession, getViewer, revokeAllSessions, startSession } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { newId } from "@/lib/ids";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { take } from "@/lib/ratelimit";

/** Only same-origin relative paths; rejects //host, backslashes and control chars. */
const safeNext = (v: FormDataEntryValue | null) => {
  const n = typeof v === "string" ? v : "/";
  if (!n.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(n)) return "/";
  try {
    const u = new URL(n, "http://stagecraft.local");
    return u.origin === "http://stagecraft.local" ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
};

const isDemoAccount = (email: string) => email.endsWith(".demo");

const allowedDomains = async () =>
  (process.env.ALLOWED_EMAIL_DOMAINS ?? "ds.study.iitm.ac.in,es.study.iitm.ac.in,study.iitm.ac.in")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

/** Client IP, trusting forwarding headers only behind a known proxy. */
async function clientIp() {
  const h = await headers();
  const trusted = process.env.VERCEL || process.env.TRUST_PROXY === "1";
  if (!trusted) return "direct";
  return (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").at(-1) ?? "direct").trim();
}

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> } | undefined;
const keep = (form: FormData, ...names: string[]) => Object.fromEntries(names.map((n) => [n, String(form.get(n) ?? "")]));

/* ───────── Sign in ───────── */

const SignIn = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), password: z.string().min(1, "Enter your password").max(200) });

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const fields = keep(form, "email");
  const parsed = SignIn.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };
  const { email, password } = parsed.data;

  if (isDemoAccount(email) && !isDemo()) return { error: "That email and password don't match.", fields };
  // Throttle per account+network (stuffing) and per account overall (distributed
  // guessing); the wider per-account cap stops strangers locking you out cheaply.
  const ip = await clientIp();
  const [byPair, byEmail, byIp] = await Promise.all([take(`login:${email}:${ip}`, 5, 1 / 180), take(`login:${email}`, 20, 1 / 60), take(`login-ip:${ip}`, 30, 1 / 20)]);
  const limits = [byPair, byEmail, byIp];
  if (limits.some((l) => !l.ok)) {
    await auditGlobal(null, "auth.throttled", `${email} from ${ip}`);
    const mins = Math.ceil(Math.max(...limits.map((l) => l.retryInMs)) / 60000);
    return { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, fields };
  }

  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(s.users.email, email) });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    await auditGlobal(user?.id ?? null, "auth.failed", `${email} from ${ip}`);
    return { error: "That email and password don't match.", fields };
  }
  if (user.suspendedAt) {
    await auditGlobal(user.id, "auth.blocked", "suspended account");
    return { error: `This account is suspended${user.suspendedReason ? `: ${user.suspendedReason}` : ""}. Contact your house admins.`, fields };
  }
  await startSession(user.id);
  await auditGlobal(user.id, "auth.login", ip);
  redirect(safeNext(form.get("next")));
}

/* ───────── Sign up ───────── */

const SignUp = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  houseId: z.string().min(1, "Pick your house"),
  password: z.string(),
});

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const fields = keep(form, "name", "email", "houseId");
  const parsed = SignUp.safeParse({ name: form.get("name"), email: form.get("email"), houseId: form.get("houseId"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };
  const { name, email, houseId, password } = parsed.data;
  const domains = await allowedDomains();
  if (!isDemo() && !domains.includes(email.split("@")[1])) return { error: `Use your IITM student email (@${domains[0]}).`, fields };
  if (isDemoAccount(email)) return { error: "That email domain is reserved.", fields };
  const problem = passwordProblem(password, email);
  if (problem) return { error: problem, fields };
  if (!(await take(`signup:${await clientIp()}`, 5, 1 / 600)).ok) return { error: "Too many sign-ups from this network. Try again later.", fields };

  const db = await getDb();
  if (!(await db.query.houses.findFirst({ where: eq(s.houses.id, houseId) }))) return { error: "Unknown house", fields };
  if (await db.query.users.findFirst({ where: eq(s.users.email, email) })) {
    // Same message either way: don't reveal which emails have accounts.
    return { error: "We couldn't create that account. If it's yours, sign in instead.", fields };
  }
  const id = newId();
  // First-run bootstrap: the configured address becomes admin only while no admin exists.
  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const hasAdmin = bootstrap === email ? !!(await db.query.users.findFirst({ where: eq(s.users.role, "admin") })) : true;
  const role = bootstrap === email && !hasAdmin ? "admin" : "member";
  await db.insert(s.users).values({ id, name, email, houseId, role, passwordHash: await hashPassword(password) });
  if (role === "admin") await auditGlobal(id, "auth.bootstrap_admin", email);
  await auditGlobal(id, "auth.signup", email);
  await startSession(id);
  redirect(safeNext(form.get("next")));
}

/* ───────── Demo personas (demo mode only) ───────── */

export async function switchPersona(form: FormData) {
  if (!isDemo()) throw new Error("Persona switching is disabled");
  const email = String(form.get("email") ?? "");
  if (!email.endsWith(".demo")) throw new Error("Only seeded demo accounts can be switched to");
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: and(eq(s.users.email, email), isNull(s.users.suspendedAt)) });
  if (user) {
    await endSession();
    await startSession(user.id);
    await auditGlobal(user.id, "auth.persona", "demo persona switch");
  }
  redirect(safeNext(form.get("next")));
}

export async function signOut(form: FormData) {
  const v = await getViewer();
  await endSession();
  if (v) await auditGlobal(v.id, "auth.logout");
  redirect(safeNext(form.get("next")));
}

/* ───────── Account self-service ───────── */

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v) return { error: "Sign in first" };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  const problem = passwordProblem(next, v.email);
  if (problem) return { error: problem };
  if (!(await take(`pwchange:${v.id}`, 5, 1 / 300)).ok) return { error: "Too many attempts. Try again in a few minutes." };
  if (v.passwordHash && !(await verifyPassword(current, v.passwordHash))) return { error: "Your current password is incorrect." };
  const db = await getDb();
  await db.update(s.users).set({ passwordHash: await hashPassword(next) }).where(eq(s.users.id, v.id));
  await revokeAllSessions(v.id, v.sessionId);
  await auditGlobal(v.id, "auth.password_changed", "other sessions signed out");
  return { ok: "Password updated. You've been signed out on every other device." };
}

export async function revokeSession(form: FormData) {
  const v = await getViewer();
  if (!v) return;
  const sid = String(form.get("sessionId") ?? "");
  const db = await getDb();
  await db.update(s.sessions).set({ revokedAt: Date.now() }).where(and(eq(s.sessions.id, sid), eq(s.sessions.userId, v.id)));
  await auditGlobal(v.id, "auth.session_revoked", sid);
  redirect("/account");
}

export async function signOutEverywhere() {
  const v = await getViewer();
  if (!v) return;
  await revokeAllSessions(v.id, v.sessionId);
  await auditGlobal(v.id, "auth.signout_others");
  redirect("/account");
}
