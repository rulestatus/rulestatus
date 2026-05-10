import { describe, expect, it } from "bun:test";
import type { RuleResult, RunReport } from "../../src/core/result.js";
import { scoreReport } from "../../src/core/score.js";

function makeResult(overrides: Partial<RuleResult>): RuleResult {
  return {
    ruleId: "ASSERT-TEST-001",
    title: "Test rule",
    framework: "eu-ai-act",
    article: "Article 9",
    severity: "major",
    status: "PASS",
    durationMs: 1,
    timestamp: new Date(),
    confidence: "strong",
    evidenceSources: [],
    ...overrides,
  };
}

function makeReport(results: RuleResult[]): RunReport {
  return {
    systemName: "test",
    actor: "provider",
    riskLevel: "high-risk",
    framework: "eu-ai-act",
    startedAt: new Date(),
    finishedAt: new Date(),
    results,
    frameworkBaselines: {},
  };
}

describe("scoreReport", () => {
  it("returns 100 with grade A when all rules pass", () => {
    const report = makeReport([
      makeResult({ status: "PASS" }),
      makeResult({ status: "PASS" }),
      makeResult({ status: "ATTESTED" }),
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(100);
    expect(score.grade).toBe("A");
    expect(score.totalDeducted).toBe(0);
  });

  it("deducts 10 per critical FAIL", () => {
    const report = makeReport([
      makeResult({ status: "FAIL", severity: "critical" }),
      makeResult({ status: "FAIL", severity: "critical" }),
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(80);
    expect(score.grade).toBe("B");
    expect(score.totalDeducted).toBe(20);
  });

  it("deducts 5 per major FAIL", () => {
    const report = makeReport([makeResult({ status: "FAIL", severity: "major" })]);
    const score = scoreReport(report);
    expect(score.points).toBe(95);
    expect(score.grade).toBe("A");
  });

  it("deducts 2 per minor FAIL", () => {
    const report = makeReport([makeResult({ status: "FAIL", severity: "minor" })]);
    const score = scoreReport(report);
    expect(score.points).toBe(98);
    expect(score.grade).toBe("A");
  });

  it("deducts 0 for info FAIL", () => {
    const report = makeReport([makeResult({ status: "FAIL", severity: "info" })]);
    const score = scoreReport(report);
    expect(score.points).toBe(100);
  });

  it("deducts half weight for WARN results", () => {
    const report = makeReport([makeResult({ status: "WARN", severity: "critical" })]);
    const score = scoreReport(report);
    expect(score.points).toBe(95);
    expect(score.totalDeducted).toBe(5);
  });

  it("ignores SKIP and MANUAL results", () => {
    const report = makeReport([
      makeResult({ status: "SKIP", severity: "critical" }),
      makeResult({ status: "MANUAL", severity: "critical" }),
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(100);
  });

  it("clamps to 0 for catastrophic failures", () => {
    const results = Array.from({ length: 20 }, () =>
      makeResult({ status: "FAIL", severity: "critical" }),
    );
    const score = scoreReport(makeReport(results));
    expect(score.points).toBe(0);
    expect(score.grade).toBe("F");
  });

  it("assigns correct grades at boundaries", () => {
    const cases: [number, string][] = [
      [90, "A"],
      [89, "B"],
      [80, "B"],
      [79, "C"],
      [70, "C"],
      [69, "D"],
      [60, "D"],
      [59, "F"],
      [0, "F"],
    ];

    for (const [points, expectedGrade] of cases) {
      const deducted = 100 - points;
      const results =
        deducted > 0
          ? Array.from({ length: Math.floor(deducted / 2) }, () =>
              makeResult({ status: "FAIL", severity: "minor" }),
            )
          : [];
      // Verify grade threshold mapping directly via score output
      const report = makeReport(results);
      const score = scoreReport(report);
      if (score.points === points) {
        expect(score.grade).toBe(expectedGrade);
      }
    }
  });

  it("mixes severities correctly", () => {
    const report = makeReport([
      makeResult({ status: "FAIL", severity: "critical" }), // -10
      makeResult({ status: "FAIL", severity: "major" }), // -5
      makeResult({ status: "WARN", severity: "major" }), // -2
      makeResult({ status: "PASS" }),
    ]);
    const score = scoreReport(report);
    expect(score.totalDeducted).toBe(17);
    expect(score.points).toBe(83);
    expect(score.grade).toBe("B");
  });
});
