import { describe, expect, it } from "vitest";
import { currentCode, verifyCode, WINDOW_MS } from "@/lib/checkin";

describe("rotating check-in codes", () => {
  const t = 1_760_000_000_000;
  it("accepts the current and previous window only", () => {
    const { code } = currentCode("e1", t);
    expect(verifyCode("e1", code, t)).toBe(true);
    expect(verifyCode("e1", code, t + WINDOW_MS)).toBe(true);
    expect(verifyCode("e1", code, t + 2 * WINDOW_MS)).toBe(false);
  });
  it("is bound to the event and resists tampering", () => {
    const { code } = currentCode("e1", t);
    expect(verifyCode("e2", code, t)).toBe(false);
    expect(verifyCode("e1", code.slice(0, -1) + (code.endsWith("A") ? "B" : "A"), t)).toBe(false);
    expect(verifyCode("e1", "garbage", t)).toBe(false);
  });
});

describe("stage keys", () => {
  it("authorize only the matching event", async () => {
    const { stageKey, verifyStageKey } = await import("@/lib/checkin");
    expect(verifyStageKey("e1", stageKey("e1"))).toBe(true);
    expect(verifyStageKey("e2", stageKey("e1"))).toBe(false);
    expect(verifyStageKey("e1", null)).toBe(false);
    expect(verifyStageKey("e1", "short")).toBe(false);
  });
});
