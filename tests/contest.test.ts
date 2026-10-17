import { describe, expect, it } from "vitest";
import { standings } from "@/lib/contest";

describe("standings", () => {
  it("blends judge and audience scores by weight", () => {
    const rows = standings(
      [
        { id: "a", votes: 100, judgeScores: [6] },
        { id: "b", votes: 50, judgeScores: [10] },
      ],
      60,
    );
    // a: .6*60 + .4*100 = 76 ; b: .6*100 + .4*50 = 80
    expect(rows.map((r) => [r.id, r.total])).toEqual([["b", 80], ["a", 76]]);
  });

  it("lets the crowd decide alone before any judge scores exist", () => {
    const rows = standings([{ id: "a", votes: 3, judgeScores: [] }, { id: "b", votes: 9, judgeScores: [] }], 60);
    expect(rows[0].id).toBe("b");
    expect(rows[0].total).toBe(100);
  });

  it("shares ranks on exact ties", () => {
    const rows = standings(
      [
        { id: "a", votes: 5, judgeScores: [] },
        { id: "b", votes: 5, judgeScores: [] },
        { id: "c", votes: 1, judgeScores: [] },
      ],
      0,
    );
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
});
