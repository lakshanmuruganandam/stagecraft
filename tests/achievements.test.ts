import { describe, expect, it } from "vitest";
import { EMPTY_ACTIVITY, evaluateBadges, evaluateQuests, levelFor, summarize, xpFor, xpForLevel } from "@/lib/achievements";

const act = (o: Partial<typeof EMPTY_ACTIVITY>) => ({ ...EMPTY_ACTIVITY, ...o });

describe("badges", () => {
  it("are all locked for a new member", () => {
    expect(evaluateBadges(EMPTY_ACTIVITY).every((b) => b.tier === null)).toBe(true);
  });

  it("climb tiers at their thresholds", () => {
    const tierOf = (n: number) => evaluateBadges(act({ questionsAsked: n })).find((b) => b.id === "curious-mind")!;
    expect(tierOf(1).tier).toBe("bronze");
    expect(tierOf(5).tier).toBe("silver");
    expect(tierOf(20).tier).toBe("gold");
    expect(tierOf(20).progress).toBe(1);
  });

  it("reports progress toward the next tier", () => {
    const b = evaluateBadges(act({ pollsVoted: 5 })).find((x) => x.id === "pollster")!;
    // bronze at 1, silver at 10 → (5-1)/(10-1)
    expect(b.tier).toBe("bronze");
    expect(b.next).toBe(10);
    expect(b.progress).toBeCloseTo(4 / 9);
  });
});

describe("xp & levels", () => {
  it("weights activity", () => {
    expect(xpFor(act({ eventsAttended: 1, questionsAsked: 2 }))).toBe(30 + 30);
  });

  it("uses a smooth, strictly increasing curve", () => {
    for (let n = 1; n < 30; n++) expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(xpForLevel(4)).level).toBe(4);
    expect(levelFor(xpForLevel(4) - 1).level).toBe(3);
  });

  it("keeps progress within [0, 1)", () => {
    for (const xp of [0, 50, 99, 100, 1234, 99999]) {
      const l = levelFor(xp);
      expect(l.progress).toBeGreaterThanOrEqual(0);
      expect(l.progress).toBeLessThan(1);
    }
  });
});

describe("quests", () => {
  it("start with only the root available", () => {
    const qs = evaluateQuests(EMPTY_ACTIVITY);
    expect(qs.filter((q) => q.state === "available").map((q) => q.id)).toEqual(["arrive"]);
  });

  it("unlock children once parents are done", () => {
    const qs = evaluateQuests(act({ eventsAttended: 1, questionsAsked: 1 }));
    const state = Object.fromEntries(qs.map((q) => [q.id, q.state]));
    expect(state.arrive).toBe("done");
    expect(state["first-question"]).toBe("done");
    expect(state.upvoter).toBe("available");
    expect(state["first-poll"]).toBe("available");
    expect(state.podium).toBe("locked");
  });

  it("summarize counts earned badges", () => {
    expect(summarize(act({ eventsAttended: 2, pollsVoted: 1 })).earned).toBe(2);
  });
});
