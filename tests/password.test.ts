import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, temporaryPassword, verifyPassword } from "@/lib/password";
import { hashToken, newSessionToken } from "@/lib/session";

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$131072$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("correct horse batterY", h)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });

  it("returns false (not throw) for accounts without a password", async () => {
    expect(await verifyPassword("anything at all", null)).toBe(false);
  });
});

describe("password policy", () => {
  it("prefers length and blocks obvious choices", () => {
    expect(passwordProblem("short")).toMatch(/10 characters/);
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/easy/);
    expect(passwordProblem("ananya-is-great", "ananya@ds.study.iitm.ac.in")).toMatch(/email/);
    expect(passwordProblem("monsoon evenings in chennai")).toBeNull();
  });

  it("generates readable temporary passwords", () => {
    expect(temporaryPassword()).toMatch(/^[\w]{4}-[\w]{4}-[\w]{4}$/);
  });
});

describe("session tokens", () => {
  it("are random and only stored as a hash", () => {
    const a = newSessionToken();
    expect(a).not.toBe(newSessionToken());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).not.toContain(a);
    expect(hashToken(a)).toBe(hashToken(a));
  });
});
