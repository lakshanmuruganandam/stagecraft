import "server-only";
import { createPrivateKey, createPublicKey, hkdfSync, sign, verify, type KeyObject } from "node:crypto";
import { rootSecret } from "./env";
import { b64urlDecode, b64urlEncode, canonicalize, type CertificatePayload, type SignedCertificate } from "./canonical";

// DER prefix for a PKCS#8-wrapped raw 32-byte Ed25519 seed (RFC 8410).
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

type Issuer = { privateKey: KeyObject; publicKey: KeyObject; jwk: JsonWebKey & { kid: string }; keyId: string };
let cached: Issuer | null = null;

/**
 * The issuer key is derived from STAGECRAFT_SECRET with HKDF, so there is
 * no extra key file to manage, and rotating the secret rotates the key
 * (the keyId changes with it, which the verifier surfaces).
 */
export function issuer(): Issuer {
  if (cached) return cached;
  const seed = Buffer.from(hkdfSync("sha256", rootSecret(), "stagecraft", "certificate-signing-key/v1", 32));
  const privateKey = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: "der", type: "pkcs8" });
  const publicKey = createPublicKey(privateKey);
  const raw = publicKey.export({ format: "jwk" }) as JsonWebKey;
  const keyId = `sc-${raw.x!.slice(0, 10)}`;
  cached = { privateKey, publicKey, keyId, jwk: { kty: raw.kty, crv: raw.crv, x: raw.x, kid: keyId, alg: "EdDSA", use: "sig" } as JsonWebKey & { kid: string } };
  return cached;
}

export function signPayload(payload: CertificatePayload): SignedCertificate {
  const sig = sign(null, Buffer.from(canonicalize(payload)), issuer().privateKey);
  return { payload, signature: b64urlEncode(sig) };
}

export function verifySigned(cert: SignedCertificate): boolean {
  try {
    return verify(null, Buffer.from(canonicalize(cert.payload)), issuer().publicKey, b64urlDecode(cert.signature));
  } catch {
    return false;
  }
}
