"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { auditGlobal, HttpError, requireAdmin, revokeAllSessions } from "@/lib/auth";
import { hashPassword, temporaryPassword } from "@/lib/password";

/**
 * Every user-governance mutation goes through this one action so that
 * authorization, guardrails and auditing can't be skipped by a new form.
 */
const Op = z.discriminatedUnion("op", [
  z.object({ op: z.literal("role"), userId: z.string().min(1), role: z.enum(["member", "organizer", "admin"]) }),
  z.object({ op: z.literal("house"), userId: z.string().min(1), houseId: z.string() }),
  z.object({ op: z.literal("suspend"), userId: z.string().min(1), reason: z.string().trim().min(5, "Give a reason (at least 5 characters)").max(300) }),
  z.object({ op: z.literal("reinstate"), userId: z.string().min(1) }),
  z.object({ op: z.literal("signout"), userId: z.string().min(1) }),
  z.object({ op: z.literal("reset"), userId: z.string().min(1) }),
  z.object({ op: z.literal("session"), userId: z.string().min(1), sessionId: z.string().min(1) }),
]);

export type UserActionState = { ok?: string; error?: string; tempPassword?: string; forEmail?: string; n?: number } | undefined;

async function otherActiveAdmins(exceptUserId: string) {
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(s.users)
    .where(and(eq(s.users.role, "admin"), isNull(s.users.suspendedAt), ne(s.users.id, exceptUserId)));
  return n;
}

export async function manageUser(prev: UserActionState, form: FormData): Promise<UserActionState> {
  const n = (prev?.n ?? 0) + 1; // lets the UI tell repeated results apart
  try {
    const admin = await requireAdmin();
    const parsed = Op.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid request", n };
    const input = parsed.data;
    const db = await getDb();
    const target = await db.query.users.findFirst({ where: eq(s.users.id, input.userId) });
    if (!target) return { error: "User not found", n };
    const self = target.id === admin.id;
    const who = `${target.email} (${target.id})`;
    const losesAdmin = target.role === "admin" && !target.suspendedAt;

    switch (input.op) {
      case "role": {
        if (input.role === target.role) return { ok: "No change", n };
        if (self) return { error: "You can't change your own role. Ask another admin.", n };
        if (losesAdmin && input.role !== "admin" && (await otherActiveAdmins(target.id)) === 0) return { error: "This is the last active admin. Promote someone else first.", n };
        if (input.role === "organizer" && !target.houseId) return { error: "Organizers must belong to a house. Set a house first.", n };
        await db.update(s.users).set({ role: input.role }).where(eq(s.users.id, target.id));
        await auditGlobal(admin.id, "user.role", `${who}: ${target.role} → ${input.role}`);
        break;
      }
      case "house": {
        const houseId = input.houseId || null;
        if (houseId === target.houseId) return { ok: "No change", n };
        if (houseId && !(await db.query.houses.findFirst({ where: eq(s.houses.id, houseId) }))) return { error: "Unknown house", n };
        if (!houseId && target.role === "organizer") return { error: "Organizers must belong to a house. Change the role first.", n };
        await db.update(s.users).set({ houseId }).where(eq(s.users.id, target.id));
        await auditGlobal(admin.id, "user.house", `${who}: ${target.houseId ?? "none"} → ${houseId ?? "none"}`);
        break;
      }
      case "suspend": {
        if (self) return { error: "You can't suspend yourself.", n };
        if (target.suspendedAt) return { error: "Already suspended", n };
        if (losesAdmin && (await otherActiveAdmins(target.id)) === 0) return { error: "This is the last active admin and can't be suspended.", n };
        await db.update(s.users).set({ suspendedAt: Date.now(), suspendedReason: input.reason }).where(eq(s.users.id, target.id));
        await revokeAllSessions(target.id);
        await auditGlobal(admin.id, "user.suspend", `${who}: ${input.reason}`);
        break;
      }
      case "reinstate": {
        if (!target.suspendedAt) return { error: "This account isn't suspended", n };
        await db.update(s.users).set({ suspendedAt: null, suspendedReason: null }).where(eq(s.users.id, target.id));
        await auditGlobal(admin.id, "user.reinstate", who);
        break;
      }
      case "signout": {
        // Signing yourself out everywhere keeps the session you're using.
        await revokeAllSessions(target.id, self ? admin.sessionId : undefined);
        await auditGlobal(admin.id, "user.signout_all", who);
        break;
      }
      case "reset": {
        if (self) return { error: "Change your own password from your account page.", n };
        const temp = temporaryPassword();
        await db.update(s.users).set({ passwordHash: await hashPassword(temp) }).where(eq(s.users.id, target.id));
        await revokeAllSessions(target.id);
        await auditGlobal(admin.id, "user.password_reset", who);
        revalidatePath("/admin/users", "layout");
        // Shown once; never stored in plain text or logged.
        return { ok: "Password reset. All their sessions were signed out.", tempPassword: temp, forEmail: target.email, n };
      }
      case "session": {
        const sess = await db.query.sessions.findFirst({ where: and(eq(s.sessions.id, input.sessionId), eq(s.sessions.userId, target.id)) });
        if (!sess) return { error: "Session not found", n };
        if (sess.id === admin.sessionId) return { error: "That's the session you're using. Sign out from the menu instead.", n };
        if (sess.revokedAt) return { error: "Already revoked", n };
        await db.update(s.sessions).set({ revokedAt: Date.now() }).where(eq(s.sessions.id, sess.id));
        await auditGlobal(admin.id, "user.session_revoke", `${who}: session ${sess.id}`);
        break;
      }
    }
    revalidatePath("/admin/users", "layout");
    return { ok: "Saved", n };
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message, n };
    throw e;
  }
}
