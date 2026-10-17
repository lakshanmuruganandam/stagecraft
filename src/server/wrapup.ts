import "server-only";
import { eq, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import { podium } from "@/lib/bracket";
import { signPayload, issuer } from "@/lib/certs";
import { newCertId, newId } from "@/lib/ids";
import { publish, publicChannel, userChannel } from "@/lib/live";
import type { CertificatePayload } from "@/lib/canonical";
import { bracketDTOs, contestDTOs } from "./views";
import { participants } from "./queries";

type Award = {
  userId: string | null;
  name: string;
  houseId: string | null;
  kind: s.CertKind;
  achievement: string;
  dedupe: string;
};

const PLACE: Record<1 | 2 | 3, { kind: s.CertKind; label: string }> = {
  1: { kind: "winner", label: "Winner" },
  2: { kind: "runner-up", label: "Runner-up" },
  3: { kind: "third", label: "Third place" },
};

/**
 * Turns the final state of an event into credentials and house points.
 * Idempotent: every certificate and points row has a dedupe key, so an
 * organizer can press "Wrap up" again after fixing a result and only the
 * missing pieces are issued.
 */
export async function wrapUpEvent(db: DB, eventId: string, opts: { actorId: string; at?: number; publishLive?: boolean }) {
  const at = opts.at ?? Date.now();
  const event = await db.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!event) throw new Error("Event not found");
  const houses = await db.select().from(s.houses);
  const houseName = (id: string | null) => houses.find((h) => h.id === id)?.name ?? null;
  const awards: Award[] = [];
  const points: { houseId: string; points: number; reason: string; dedupe: string }[] = [];
  const P = event.settings.points;
  const placePts = { 1: P.first, 2: P.second, 3: P.third } as const;

  // Brackets → podium (every team member gets a certificate).
  for (const b of await bracketDTOs(db, { eventId })) {
    const pod = podium(b.matches);
    const places: [1 | 2 | 3, string | null][] = [[1, pod.first], [2, pod.second], ...pod.third.map((t) => [3, t] as [3, string])];
    const entRows = await db.select().from(s.entrants).where(eq(s.entrants.bracketId, b.id));
    for (const [place, entrantId] of places) {
      const e = entRows.find((x) => x.id === entrantId);
      if (!e) continue;
      const label = `${PLACE[place].label} · ${b.title}${b.game ? ` (${b.game})` : ""}`;
      if (e.houseId) points.push({ houseId: e.houseId, points: placePts[place], reason: `${e.name}: ${label}`, dedupe: `pts:${b.id}:${e.id}:${place}` });
      const members = e.memberIds.length ? await db.select().from(s.users).where(inArray(s.users.id, e.memberIds)) : [];
      if (!members.length) awards.push({ userId: null, name: e.name, houseId: e.houseId, kind: PLACE[place].kind, achievement: label, dedupe: `${b.id}:${e.id}:${place}` });
      for (const m of members) awards.push({ userId: m.id, name: m.name, houseId: m.houseId, kind: PLACE[place].kind, achievement: `${label} — ${e.name}`, dedupe: `${b.id}:${e.id}:${place}:${m.id}` });
    }
  }

  // Contests → top three by blended score.
  for (const c of await contestDTOs(db, { eventId }, "manager")) {
    for (const st of c.standings ?? []) {
      if (st.rank > 3 || (st.votes === 0 && st.judgeAvg === null)) continue;
      const act = c.acts.find((a) => a.id === st.id)!;
      const actRow = await db.query.acts.findFirst({ where: eq(s.acts.id, act.id) });
      const place = st.rank as 1 | 2 | 3;
      const label = `${PLACE[place].label} · ${c.title}`;
      if (act.houseId) points.push({ houseId: act.houseId, points: placePts[place], reason: `${act.performer}: ${label}`, dedupe: `pts:${c.id}:${act.id}` });
      awards.push({ userId: actRow?.userId ?? null, name: act.performer, houseId: act.houseId, kind: PLACE[place].kind, achievement: `${label} — “${act.title}”`, dedupe: `${c.id}:${act.id}` });
    }
  }

  // Speakers & organizers from registrations.
  const regs = await db.select({ r: s.registrations, u: s.users }).from(s.registrations).innerJoin(s.users, eq(s.users.id, s.registrations.userId)).where(eq(s.registrations.eventId, eventId));
  for (const { r, u } of regs) {
    if (r.role === "speaker" || r.role === "organizer") {
      awards.push({ userId: u.id, name: u.name, houseId: u.houseId, kind: r.role, achievement: r.role === "speaker" ? `Speaker · ${event.title}` : `Organizing team · ${event.title}`, dedupe: `${eventId}:${r.role}:${u.id}` });
    }
  }

  // Everyone who took part gets a participation credential + house point.
  const awardedUsers = new Set(awards.map((a) => a.userId).filter(Boolean));
  for (const p of await participants(db, eventId)) {
    if (!awardedUsers.has(p.id)) {
      awards.push({ userId: p.id, name: p.name, houseId: p.houseId, kind: "participant", achievement: `Participant · ${event.title}`, dedupe: `${eventId}:participant:${p.id}` });
    }
  }
  const perHouse = new Map<string, number>();
  for (const a of awards) if (a.kind === "participant" && a.houseId) perHouse.set(a.houseId, (perHouse.get(a.houseId) ?? 0) + 1);
  for (const [houseId, n] of perHouse) {
    points.push({ houseId, points: n * P.participant, reason: `${n} member${n === 1 ? "" : "s"} took part in ${event.title}`, dedupe: `pts:${eventId}:participation:${houseId}` });
  }

  // Persist.
  const { keyId } = issuer();
  const issued: { id: string; userId: string | null }[] = [];
  for (const a of awards) {
    const dedupeKey = `${eventId}|${a.dedupe}`;
    const exists = await db.query.certificates.findFirst({ where: eq(s.certificates.dedupeKey, dedupeKey) });
    if (exists) continue;
    const id = newCertId();
    const payload: CertificatePayload = {
      "@context": "https://stagecraft.app/credential/v1",
      id,
      type: "StageCraftCertificate",
      recipient: { name: a.name, house: houseName(a.houseId) },
      achievement: a.achievement,
      kind: a.kind,
      event: { id: event.id, title: event.title, date: new Date(event.startsAt).toISOString().slice(0, 10) },
      issuer: { name: "StageCraft · IITM BS Houses", keyId },
      issuedAt: new Date(at).toISOString(),
    };
    const signed = signPayload(payload);
    await db.insert(s.certificates).values({
      id,
      eventId,
      userId: a.userId,
      recipientName: a.name,
      houseId: a.houseId,
      kind: a.kind,
      achievement: a.achievement,
      payload: JSON.stringify(payload),
      signature: signed.signature,
      issuedAt: at,
      dedupeKey,
    });
    issued.push({ id, userId: a.userId });
  }
  let pointsAwarded = 0;
  for (const p of points) {
    const res = await db
      .insert(s.housePoints)
      .values({ id: newId(), houseId: p.houseId, eventId, points: p.points, reason: p.reason, dedupeKey: p.dedupe, createdAt: at })
      .onConflictDoNothing();
    if (res.rowsAffected) pointsAwarded += p.points;
  }

  await db.update(s.events).set({ status: "ended", wrappedAt: at }).where(eq(s.events.id, eventId));
  await db.insert(s.auditLog).values({ id: newId(), actorId: opts.actorId, eventId, action: "event.wrapup", detail: `${issued.length} certificates, ${pointsAwarded} house points`, createdAt: at });

  if (opts.publishLive !== false) {
    const { certificatesFor } = await import("./queries");
    const all = await certificatesFor({ eventId });
    for (const c of issued) {
      const dto = all.find((x) => x.id === c.id);
      if (dto && c.userId) await publish(userChannel(c.userId), "cert.issued", dto);
    }
    const fresh = await db.query.events.findFirst({ where: eq(s.events.id, eventId) });
    const { eventDTO } = await import("./views");
    await publish(publicChannel(eventId), "event.update", eventDTO(fresh!));
  }
  return { certificates: issued.length, points: pointsAwarded };
}
