import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { b64urlEncode, canonicalize, verifyWithJwk, type CertificatePayload } from "@/lib/canonical";
import { vet } from "@/lib/moderation";

describe("canonicalize", () => {
  it("is independent of key order", () => {
    expect(canonicalize({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: "x" } })).toBe(
      canonicalize({ a: { c: "x", d: [1, { y: 2, z: 1 }] }, b: 1 }),
    );
  });
});

describe("certificate signatures", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  const payload: CertificatePayload = {
    "@context": "https://stagecraft.app/credential/v1",
    id: "SC-ABCDE-FGHJK",
    type: "StageCraftCertificate",
    recipient: { name: "Asha", house: "Saranda" },
    achievement: "Champion · Valorant Cup",
    kind: "winner",
    event: { id: "e1", title: "Valorant Cup", date: "2026-10-18" },
    issuer: { name: "StageCraft", keyId: "k1" },
    issuedAt: "2026-10-18T12:00:00.000Z",
  };
  const signature = b64urlEncode(sign(null, Buffer.from(canonicalize(payload)), privateKey));

  it("verifies a genuine certificate with WebCrypto", async () => {
    expect(await verifyWithJwk({ payload, signature }, jwk)).toBe(true);
  });

  it("rejects a tampered certificate", async () => {
    const forged = { ...payload, achievement: "Champion · Everything" };
    expect(await verifyWithJwk({ payload: forged, signature }, jwk)).toBe(false);
  });
});

describe("vet", () => {
  it("masks blocked words and rejects spam", () => {
    const r = vet("what the fuck  is   this", { max: 200 });
    expect(r.ok && r.body).toBe("what the f••• is this");
    expect(vet("a".repeat(30), { max: 200 }).ok).toBe(false);
    expect(vet("http://a http://b", { max: 200 }).ok).toBe(false);
  });
});
