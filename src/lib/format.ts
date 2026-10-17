export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

const tz = "Asia/Kolkata";

export function fmtDate(ms: number, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, ...opts }).format(ms);
}

export function fmtTime(ms: number) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(ms);
}

export function fmtRelative(ms: number, now: number) {
  const d = ms - now;
  const abs = Math.abs(d);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return d < 0 ? "just now" : "in a moment";
  if (abs < 3_600_000) return rtf.format(Math.round(d / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(d / 3_600_000), "hour");
  return rtf.format(Math.round(d / 86_400_000), "day");
}

export const KIND_LABEL = { talk: "Guest session", cultural: "Cultural stage", esports: "Esports arena", hackathon: "Hackathon" } as const;

/** youtube / twitch URL → embeddable player URL. */
export function embedUrl(url: string | null, host: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&rel=0&modestbranding=1` : null;
    }
    if (u.hostname.includes("twitch.tv")) {
      const channel = u.pathname.split("/").filter(Boolean)[0];
      return channel ? `https://player.twitch.tv/?channel=${channel}&parent=${host}&muted=true` : null;
    }
  } catch {
    return null;
  }
  return null;
}
