"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { endSession, startSession } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { newId } from "@/lib/ids";

const safeNext = (v: FormDataEntryValue | null) => {
  const n = typeof v === "string" ? v : "/";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
};

const allowedDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS ?? "ds.study.iitm.ac.in,es.study.iitm.ac.in,study.iitm.ac.in")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

const SignIn = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  houseId: z.string().min(1, "Pick your house"),
});

export type SignInState = { error?: string } | undefined;

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = SignIn.safeParse({ name: form.get("name"), email: form.get("email"), houseId: form.get("houseId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, email, houseId } = parsed.data;
  const domain = email.split("@")[1];
  if (!isDemo() && !allowedDomains().includes(domain)) {
    return { error: `Use your IITM student email (${allowedDomains()[0]}).` };
  }
  const db = await getDb();
  const house = await db.query.houses.findFirst({ where: eq(s.houses.id, houseId) });
  if (!house) return { error: "Unknown house" };
  let user = await db.query.users.findFirst({ where: eq(s.users.email, email) });
  if (!user) {
    const id = newId();
    await db.insert(s.users).values({ id, name, email, houseId, role: "member" });
    user = await db.query.users.findFirst({ where: eq(s.users.id, id) });
  }
  await startSession(user!.id);
  redirect(safeNext(form.get("next")));
}

/** Demo only: hop between seeded personas to try every role. */
export async function switchPersona(form: FormData) {
  if (!isDemo()) throw new Error("Persona switching is disabled");
  const email = String(form.get("email") ?? "");
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(s.users.email, email) });
  if (user) await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signOut(form: FormData) {
  await endSession();
  redirect(safeNext(form.get("next")));
}
