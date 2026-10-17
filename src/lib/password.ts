import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => _scrypt(pw, salt, len, opts, (e, k) => (e ? rej(e) : res(k))));

// OWASP-recommended scrypt cost (N=2^17, r=8, p=1); needs ~128 MiB headroom.
const N = 2 ** 17, r = 8, p = 1, KEYLEN = 32;
const maxmem = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r, p, maxmem });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) {
    // Burn comparable time so missing accounts aren't distinguishable by latency.
    await scrypt(password, randomBytes(16), KEYLEN, { N, r, p, maxmem });
    return false;
  }
  const [alg, n, rr, pp, salt, hash] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, { N: +n, r: +rr, p: +pp, maxmem });
  return timingSafeEqual(key, expected);
}

/** Password policy: length beats complexity rules (NIST SP 800-63B). */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "That password is too long.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "Don't include your email in your password.";
  if (/^(.)\1+$/.test(pw) || ["password12", "1234567890", "qwertyuiop", "stagecraft"].some((w) => pw.toLowerCase().startsWith(w))) return "That password is too easy to guess.";
  return null;
}

/** Readable one-time password for admin resets. */
export function temporaryPassword() {
  const words = randomBytes(12).toString("base64url").replace(/[-_]/g, "x");
  return `${words.slice(0, 4)}-${words.slice(4, 8)}-${words.slice(8, 12)}`;
}
