/**
 * Deterministic JSON: object keys sorted, no whitespace. Shared by the
 * server signer and the in-browser verifier so both sides hash the exact
 * same bytes. Pure TS on purpose — no Node APIs.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type CertificatePayload = {
  "@context": "https://stagecraft.app/credential/v1";
  id: string;
  type: "StageCraftCertificate";
  recipient: { name: string; house: string | null };
  achievement: string;
  kind: string;
  event: { id: string; title: string; date: string };
  issuer: { name: string; keyId: string };
  issuedAt: string;
};

export type SignedCertificate = { payload: CertificatePayload; signature: string };

/** Verifies a signed certificate in any runtime with WebCrypto Ed25519. */
export async function verifyWithJwk(cert: SignedCertificate, jwk: JsonWebKey): Promise<boolean> {
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["verify"]);
  const data = new TextEncoder().encode(canonicalize(cert.payload));
  return crypto.subtle.verify({ name: "Ed25519" }, key, b64urlDecode(cert.signature), data);
}
