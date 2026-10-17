import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { rootSecret } from "./env";

export const SESSION_COOKIE = "sc_session";
const key = () => new TextEncoder().encode(rootSecret());

export async function encodeSession(uid: string) {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
}

export async function decodeSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}
