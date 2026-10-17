import "server-only";

const DEV_SECRET = "stagecraft-dev-secret-change-me-in-production-0123456789";

/** Root secret: signs sessions and derives the certificate signing key. */
export function rootSecret(): string {
  const s = process.env.STAGECRAFT_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !isDemo()) {
    throw new Error("STAGECRAFT_SECRET (>= 32 chars) is required in production");
  }
  return DEV_SECRET;
}

/** Demo mode shows the persona switcher so judges can try every role. */
export const isDemo = () => process.env.STAGECRAFT_DEMO !== "off";

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
