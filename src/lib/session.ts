import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "sc_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days, sliding
export const SESSION_TOUCH_MS = 1000 * 60 * 5; // refresh lastSeen at most every 5 min

export const newSessionToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");
