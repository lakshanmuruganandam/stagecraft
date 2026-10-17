/**
 * Lightweight, transparent chat hygiene. Deliberately small: organizers
 * have hide / mute / slow-mode for everything a list can't catch.
 */
const BLOCKLIST = ["fuck", "shit", "bitch", "bastard", "asshole", "chutiya", "madarchod", "bhenchod", "randi", "gaandu"];
const pattern = new RegExp(`\\b(${BLOCKLIST.join("|")})\\w*`, "gi");

export function clean(text: string): string {
  return text.replace(pattern, (w) => w[0] + "•".repeat(Math.max(1, w.length - 1)));
}

export type Verdict = { ok: true; body: string } | { ok: false; reason: string };

export function vet(raw: string, opts: { max: number }): Verdict {
  const body = raw.replace(/\s+/g, " ").trim();
  if (!body) return { ok: false, reason: "Message is empty" };
  if (body.length > opts.max) return { ok: false, reason: `Keep it under ${opts.max} characters` };
  const links = body.match(/https?:\/\//g)?.length ?? 0;
  if (links > 1) return { ok: false, reason: "Only one link per message" };
  if (/(.)\1{14,}/.test(body)) return { ok: false, reason: "That looks like spam" };
  return { ok: true, body: clean(body) };
}
