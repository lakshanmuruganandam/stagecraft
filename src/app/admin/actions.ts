"use server";

import { isDemo } from "@/lib/env";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { canManageEvent, getViewer } from "@/lib/auth";
import { newId, slugify } from "@/lib/ids";
import { adminChannel, publicChannel, publish } from "@/lib/live";
import { eventDTO } from "@/server/views";

/* ───────────────────────── Event details form ───────────────────────── */

const streamUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return /(^|\.)youtube\.com$|^youtu\.be$|(^|\.)twitch\.tv$/.test(u.hostname);
    } catch {
      return false;
    }
  }, "Use a YouTube or Twitch link");

const EventInput = z.object({
  title: z.string().trim().min(4, "Title needs at least 4 characters").max(120),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(4000),
  kind: z.enum(["talk", "cultural", "esports", "hackathon"]),
  streamUrl,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a start date and time"),
  durationMin: z.coerce.number().int().min(10, "At least 10 minutes").max(24 * 60),
  hostHouseIds: z.array(z.string()).min(1, "Pick at least one host house"),
  status: z.enum(["draft", "scheduled"]),
  qaModeration: z.boolean(),
  allowAnonymousQa: z.boolean(),
  slowModeSec: z.coerce.number().int().min(0).max(300),
  pointsFirst: z.coerce.number().int().min(0).max(1000),
  pointsSecond: z.coerce.number().int().min(0).max(1000),
  pointsThird: z.coerce.number().int().min(0).max(1000),
  pointsParticipant: z.coerce.number().int().min(0).max(100),
});

export type EventFormValues = Record<string, string | string[]>;
export type EventFormState = { error?: string; fieldErrors?: Record<string, string>; values?: EventFormValues } | undefined;

/** Echo what the user typed so React's post-action form reset doesn't wipe it. */
function echo(form: FormData): EventFormValues {
  const out: EventFormValues = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION")) continue;
    if (k === "hostHouseIds") out[k] = [...((out[k] as string[]) ?? []), v];
    else out[k] = v;
  }
  out.hostHouseIds ??= [];
  return out;
}

/** "2026-10-18T19:00" typed in the form is IST wall-clock time. */
const istToMs = (local: string) => Date.parse(`${local}:00+05:30`);

function parseForm(form: FormData) {
  return EventInput.safeParse({
    title: form.get("title") ?? "",
    tagline: form.get("tagline") ?? "",
    description: form.get("description") ?? "",
    kind: form.get("kind"),
    streamUrl: form.get("streamUrl") ?? "",
    startsAt: form.get("startsAt") ?? "",
    durationMin: form.get("durationMin"),
    hostHouseIds: form.getAll("hostHouseIds").map(String),
    status: form.get("status") ?? "draft",
    qaModeration: form.get("qaModeration") === "on",
    allowAnonymousQa: form.get("allowAnonymousQa") === "on",
    slowModeSec: form.get("slowModeSec") ?? 0,
    pointsFirst: form.get("pointsFirst") ?? 50,
    pointsSecond: form.get("pointsSecond") ?? 30,
    pointsThird: form.get("pointsThird") ?? 20,
    pointsParticipant: form.get("pointsParticipant") ?? 2,
  });
}

function fieldErrors(err: z.ZodError, form: FormData): EventFormState {
  const fe: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    fe[k] ??= i.message;
  }
  return { error: "Please fix the highlighted fields.", fieldErrors: fe, values: echo(form) };
}

async function uniqueSlug(base: string, exceptId?: string) {
  const db = await getDb();
  const root = slugify(base) || "event";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await db.query.events.findFirst({
      where: exceptId ? and(eq(s.events.slug, slug), ne(s.events.id, exceptId)) : eq(s.events.slug, slug),
    });
    if (!hit) return slug;
  }
  return `${root}-${newId().slice(0, 5)}`;
}

export async function createEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const v = await getViewer();
  if (!v || (v.role !== "admin" && v.role !== "organizer")) return { error: "Only organizers can create events." };
  const parsed = parseForm(form);
  if (!parsed.success) return fieldErrors(parsed.error, form);
  const d = parsed.data;
  if (v.role === "organizer" && (!v.houseId || !d.hostHouseIds.includes(v.houseId))) {
    return { error: "Your own house must be one of the hosts.", fieldErrors: { hostHouseIds: "Include your house" }, values: echo(form) };
  }
  const startsAt = istToMs(d.startsAt);
  if (Number.isNaN(startsAt)) return { error: "Invalid start time", fieldErrors: { startsAt: "Invalid date" }, values: echo(form) };

  const db = await getDb();
  const id = newId();
  await db.insert(s.events).values({
    id,
    slug: await uniqueSlug(d.title),
    title: d.title,
    tagline: d.tagline || null,
    description: d.description,
    kind: d.kind,
    status: d.status,
    streamUrl: d.streamUrl || null,
    hostHouseIds: d.hostHouseIds,
    startsAt,
    endsAt: startsAt + d.durationMin * 60_000,
    hue: Math.floor(Math.random() * 360),
    settings: {
      ...s.defaultSettings,
      qaModeration: d.qaModeration,
      allowAnonymousQa: d.allowAnonymousQa,
      slowModeSec: d.slowModeSec,
      points: { first: d.pointsFirst, second: d.pointsSecond, third: d.pointsThird, participant: d.pointsParticipant },
    },
    createdBy: v.id,
  });
  await db.insert(s.auditLog).values({ id: newId(), actorId: v.id, eventId: id, action: "event.create", detail: d.title });
  revalidatePath("/");
  redirect(`/admin/events/${id}`);
}

export async function updateEvent(eventId: string, _prev: EventFormState, form: FormData): Promise<EventFormState> {
  const v = await getViewer();
  const db = await getDb();
  const event = await db.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!event) return { error: "Event not found" };
  if (!canManageEvent(v, event)) return { error: "You can't manage this event." };
  const parsed = parseForm(form);
  if (!parsed.success) return fieldErrors(parsed.error, form);
  const d = parsed.data;
  if (v!.role === "organizer" && (!v!.houseId || !d.hostHouseIds.includes(v!.houseId))) {
    return { error: "Your own house must stay one of the hosts.", fieldErrors: { hostHouseIds: "Include your house" }, values: echo(form) };
  }
  const startsAt = istToMs(d.startsAt);
  if (Number.isNaN(startsAt)) return { error: "Invalid start time", fieldErrors: { startsAt: "Invalid date" }, values: echo(form) };

  // Don't drag a live/ended event back to draft from the details form.
  const status = event.status === "live" || event.status === "ended" ? event.status : d.status;
  await db
    .update(s.events)
    .set({
      title: d.title,
      slug: d.title === event.title ? event.slug : await uniqueSlug(d.title, eventId),
      tagline: d.tagline || null,
      description: d.description,
      kind: d.kind,
      status,
      streamUrl: d.streamUrl || null,
      hostHouseIds: d.hostHouseIds,
      startsAt,
      endsAt: startsAt + d.durationMin * 60_000,
      settings: {
        ...event.settings,
        qaModeration: d.qaModeration,
        allowAnonymousQa: d.allowAnonymousQa,
        slowModeSec: d.slowModeSec,
        points: { first: d.pointsFirst, second: d.pointsSecond, third: d.pointsThird, participant: d.pointsParticipant },
      },
    })
    .where(eq(s.events.id, eventId));
  await db.insert(s.auditLog).values({ id: newId(), actorId: v!.id, eventId, action: "event.update", detail: d.title });
  const fresh = await db.query.events.findFirst({ where: eq(s.events.id, eventId) });
  await publish([publicChannel(eventId), adminChannel(eventId)], "event.update", eventDTO(fresh!));
  revalidatePath("/");
  redirect(`/admin/events/${eventId}`);
}

/* ───────────────────────────── Demo reset ───────────────────────────── */

export async function resetDemo() {
  const v = await getViewer();
  if (!v || v.role !== "admin") throw new Error("Admins only");
  // Destructive by design, so it only exists on demo deployments.
  if (!isDemo()) throw new Error("Demo reset is disabled on this deployment");
  const db = await getDb();
  const { wipe, seed } = await import("@/db/seed");
  await wipe(db);
  await seed(db);
  // The admin user was recreated with the same id, so the session survives.
  revalidatePath("/", "layout");
  redirect("/admin?reset=1");
}
