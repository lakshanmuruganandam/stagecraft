import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { rootSecret } from "./env";

/**
 * Rotating proof-of-presence codes. The stage screen shows a QR for the
 * current 30-second window; a code is accepted for its own window and the
 * previous one, so a screenshot shared to a group chat dies within a minute.
 */
export const WINDOW_MS = 30_000;

const sign = (eventId: string, w: number) =>
  createHmac("sha256", rootSecret()).update(`checkin:${eventId}:${w}`).digest("base64url").slice(0, 16);

export function currentCode(eventId: string, now = Date.now()) {
  const w = Math.floor(now / WINDOW_MS);
  return { code: `${w.toString(36)}.${sign(eventId, w)}`, expiresAt: (w + 1) * WINDOW_MS };
}

/**
 * Stage key: an HMAC that authorizes a screen to *display* check-in codes.
 * It travels only in the organizer's Stage/OBS link, so nobody at home can
 * fetch the rotating code and check in remotely.
 */
export function stageKey(eventId: string) {
  return createHmac("sha256", rootSecret()).update(`stage:${eventId}`).digest("base64url").slice(0, 22);
}

export function verifyStageKey(eventId: string, key: string | null) {
  if (!key) return false;
  const a = Buffer.from(stageKey(eventId));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyCode(eventId: string, code: string, now = Date.now()): boolean {
  const [ws, sig] = code.split(".");
  const w = parseInt(ws ?? "", 36);
  const cur = Math.floor(now / WINDOW_MS);
  if (!Number.isFinite(w) || !sig || (w !== cur && w !== cur - 1)) return false;
  const expected = Buffer.from(sign(eventId, w));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
