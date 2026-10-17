import { describe, expect, it } from "vitest";
import { buildBracket, podium, reportResult, roundName, seedOrder, BracketError } from "@/lib/bracket";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

describe("seedOrder", () => {
  it("places top seeds on opposite halves", () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  it("every first-round pair sums to size+1", () => {
    const o = seedOrder(32);
    for (let i = 0; i < o.length; i += 2) expect(o[i] + o[i + 1]).toBe(33);
  });
});

describe("buildBracket", () => {
  it("creates n-1 main matches plus bronze", () => {
    const ms = buildBracket(teams(8), { thirdPlace: true });
    expect(ms.filter((m) => m.lane === "main")).toHaveLength(7);
    expect(ms.filter((m) => m.lane === "third")).toHaveLength(1);
  });

  it("gives byes to the top seeds and advances them", () => {
    const ms = buildBracket(teams(6));
    const r1 = ms.filter((m) => m.round === 1);
    const byes = r1.filter((m) => m.status === "done");
    expect(byes.map((m) => m.winnerId).sort()).toEqual(["t1", "t2"]);
    const r2 = ms.filter((m) => m.round === 2);
    expect(r2.flatMap((m) => [m.aId, m.bId])).toContain("t1");
    expect(r2.flatMap((m) => [m.aId, m.bId])).toContain("t2");
  });

  it("rejects fewer than 2 entrants", () => {
    expect(() => buildBracket(["solo"])).toThrow();
  });
});

describe("reportResult", () => {
  it("plays a full 4-team bracket with bronze to a podium", () => {
    let ms = buildBracket(teams(4), { thirdPlace: true });
    const semis = ms.filter((m) => m.round === 1);
    ms = reportResult(ms, semis[0].id, 2, 0); // t1 beats t4
    ms = reportResult(ms, semis[1].id, 1, 2); // t3 beats t2
    const final = ms.find((m) => m.round === 2 && m.lane === "main")!;
    const bronze = ms.find((m) => m.lane === "third")!;
    expect([final.aId, final.bId]).toEqual(["t1", "t3"]);
    expect([bronze.aId, bronze.bId]).toEqual(["t4", "t2"]);
    ms = reportResult(ms, final.id, 3, 1);
    ms = reportResult(ms, bronze.id, 0, 2);
    expect(podium(ms)).toEqual({ first: "t1", second: "t3", third: ["t2"] });
  });

  it("rejects draws and undecided matches", () => {
    const ms = buildBracket(teams(4));
    expect(() => reportResult(ms, ms[0].id, 1, 1)).toThrow(BracketError);
    const final = ms.find((m) => m.round === 2)!;
    expect(() => reportResult(ms, final.id, 1, 0)).toThrow(BracketError);
  });

  it("re-routes a corrected result while the next match is unplayed", () => {
    let ms = buildBracket(teams(4));
    const s0 = ms.find((m) => m.round === 1 && m.slot === 0)!;
    ms = reportResult(ms, s0.id, 2, 0);
    ms = reportResult(ms, s0.id, 0, 2); // oops, t4 actually won
    expect(ms.find((m) => m.round === 2)!.aId).toBe("t4");
  });

  it("refuses a correction once the downstream match is played", () => {
    let ms = buildBracket(teams(4));
    const [a, b] = ms.filter((m) => m.round === 1);
    ms = reportResult(ms, a.id, 2, 0);
    ms = reportResult(ms, b.id, 2, 0);
    ms = reportResult(ms, ms.find((m) => m.round === 2)!.id, 2, 1);
    expect(() => reportResult(ms, a.id, 0, 2)).toThrow(/Reset it first/);
  });

  it("does not mutate its input", () => {
    const ms = buildBracket(teams(4));
    const snapshot = JSON.stringify(ms);
    reportResult(ms, ms[0].id, 2, 1);
    expect(JSON.stringify(ms)).toBe(snapshot);
  });
});

describe("roundName", () => {
  it("names late rounds", () => {
    expect(roundName(3, 3)).toBe("Grand final");
    expect(roundName(2, 3)).toBe("Semi-finals");
    expect(roundName(1, 4)).toBe("Round of 16");
  });
});
