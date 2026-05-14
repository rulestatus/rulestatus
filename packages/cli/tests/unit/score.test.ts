import { describe, expect, it } from "bun:test";
import type { RuleResult, RunReport } from "../../src/core/result.js";
import { scoreReport } from "../../src/core/score.js";

function makeResult(overrides: Partial<RuleResult>): RuleResult {
  return {
    ruleId: "ASSERT-TEST-001",
    title: "Test rule",
    framework: "eu-ai-act",
    article: "Article 9",
    severity: "critical",
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

// ── basic pass/fail ───────────────────────────────────────────────────────────

describe("scoreReport", () => {
  it("returns 100 with grade A when all rules pass", () => {
    const report = makeReport([
      makeResult({ status: "PASS", severity: "critical" }),
      makeResult({ status: "PASS", severity: "major" }),
      makeResult({ status: "ATTESTED", severity: "critical" }),
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(100);
    expect(score.grade).toBe("A");
    expect(score.totalDeducted).toBe(0);
  });

  it("returns 0 when every rule fails", () => {
    const report = makeReport([
      makeResult({ status: "FAIL", severity: "critical" }),
      makeResult({ status: "FAIL", severity: "critical" }),
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(0);
    expect(score.grade).toBe("F");
  });

  it("score reflects proportion — same failures score worse in a smaller run", () => {
    // 3 critical FAILs out of 50 critical rules → 47/50 = 94%
    const bigRun = makeReport([
      ...Array.from({ length: 47 }, () => makeResult({ status: "PASS", severity: "critical" })),
      ...Array.from({ length: 3 }, () => makeResult({ status: "FAIL", severity: "critical" })),
    ]);
    // 3 critical FAILs out of 10 critical rules → 7/10 = 70%
    const smallRun = makeReport([
      ...Array.from({ length: 7 }, () => makeResult({ status: "PASS", severity: "critical" })),
      ...Array.from({ length: 3 }, () => makeResult({ status: "FAIL", severity: "critical" })),
    ]);

    const bigScore = scoreReport(bigRun);
    const smallScore = scoreReport(smallRun);

    expect(bigScore.points).toBe(94);
    expect(smallScore.points).toBe(70);
    expect(bigScore.points).toBeGreaterThan(smallScore.points);
  });

  // ── severity weights ──────────────────────────────────────────────────────────

  it("1 critical FAIL out of 10 critical rules → 90 points", () => {
    const report = makeReport([
      ...Array.from({ length: 9 }, () => makeResult({ status: "PASS", severity: "critical" })),
      makeResult({ status: "FAIL", severity: "critical" }),
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(90);
    expect(score.totalWeight).toBe(100);
    expect(score.totalDeducted).toBe(10);
  });

  it("major FAIL weighs less than critical FAIL in a mixed run", () => {
    // 1 critical FAIL in run of 1 critical + 1 major PASS
    const withCriticalFail = makeReport([
      makeResult({ status: "FAIL", severity: "critical" }), // -10 of 15 total weight
      makeResult({ status: "PASS", severity: "major" }),
    ]);
    // 1 major FAIL in run of 1 critical PASS + 1 major
    const withMajorFail = makeReport([
      makeResult({ status: "PASS", severity: "critical" }),
      makeResult({ status: "FAIL", severity: "major" }), // -5 of 15 total weight
    ]);

    expect(scoreReport(withCriticalFail).points).toBeLessThan(scoreReport(withMajorFail).points);
  });

  it("info FAIL does not affect score", () => {
    const report = makeReport([
      makeResult({ status: "PASS", severity: "critical" }),
      makeResult({ status: "FAIL", severity: "info" }),
    ]);
    const score = scoreReport(report);
    // info weight = 0, so denominator is only from the critical rule
    expect(score.points).toBe(100);
    expect(score.totalDeducted).toBe(0);
  });

  // ── WARN ─────────────────────────────────────────────────────────────────────

  it("critical WARN deducts half weight (5 of 10) → 50 points in single-rule run", () => {
    const report = makeReport([makeResult({ status: "WARN", severity: "critical" })]);
    const score = scoreReport(report);
    expect(score.points).toBe(50);
    expect(score.totalDeducted).toBe(5);
  });

  it("major WARN deducts 2 of 5 weight → 60 points in single-rule run", () => {
    const report = makeReport([makeResult({ status: "WARN", severity: "major" })]);
    const score = scoreReport(report);
    expect(score.points).toBe(60);
    expect(score.totalDeducted).toBe(2);
  });

  // ── excluded statuses ─────────────────────────────────────────────────────────

  it("SKIP rules are excluded from scoring", () => {
    const report = makeReport([
      makeResult({ status: "PASS", severity: "critical" }),
      makeResult({ status: "SKIP", severity: "critical" }), // excluded
    ]);
    const score = scoreReport(report);
    // totalWeight = 10 (only the PASS rule), no deductions
    expect(score.points).toBe(100);
    expect(score.totalWeight).toBe(10);
  });

  it("MANUAL rules are excluded from scoring", () => {
    const report = makeReport([
      makeResult({ status: "PASS", severity: "critical" }),
      makeResult({ status: "MANUAL", severity: "critical" }), // excluded
    ]);
    const score = scoreReport(report);
    expect(score.points).toBe(100);
    expect(score.totalWeight).toBe(10);
  });

  it("ATTESTED counts as pass", () => {
    const report = makeReport([
      makeResult({ status: "ATTESTED", severity: "critical" }),
      makeResult({ status: "FAIL", severity: "critical" }),
    ]);
    const score = scoreReport(report);
    // total_weight = 20, deducted = 10 → 50 points
    expect(score.points).toBe(50);
  });

  // ── empty / all-info edge cases ───────────────────────────────────────────────

  it("empty run returns 100", () => {
    expect(scoreReport(makeReport([])).points).toBe(100);
  });

  it("run with only SKIP and MANUAL returns 100 (no scoreable rules)", () => {
    const report = makeReport([
      makeResult({ status: "SKIP", severity: "critical" }),
      makeResult({ status: "MANUAL", severity: "critical" }),
    ]);
    expect(scoreReport(report).points).toBe(100);
    expect(scoreReport(report).totalWeight).toBe(0);
  });

  // ── grade thresholds ──────────────────────────────────────────────────────────

  it("assigns correct grades at round-number boundaries using 10-rule runs", () => {
    // With 10 critical rules (totalWeight = 100), N fails gives (100-N*10)/100 * 100 = 100-N*10 points
    const cases: [number, string][] = [
      [0, "A"], // 100 points
      [1, "A"], // 90 points
      [2, "B"], // 80 points
      [3, "C"], // 70 points
      [4, "D"], // 60 points
      [5, "F"], // 50 points
    ];

    for (const [failCount, expectedGrade] of cases) {
      const results = [
        ...Array.from({ length: 10 - failCount }, () =>
          makeResult({ status: "PASS", severity: "critical" }),
        ),
        ...Array.from({ length: failCount }, () =>
          makeResult({ status: "FAIL", severity: "critical" }),
        ),
      ];
      const score = scoreReport(makeReport(results));
      expect(score.grade).toBe(expectedGrade);
    }
  });

  // ── mixed severities ──────────────────────────────────────────────────────────

  it("mixed severity run computes correctly", () => {
    // 1 critical FAIL (-10), 1 major FAIL (-5), 1 major WARN (-2), 1 major PASS
    // totalWeight = 10 + 5 + 5 + 5 = 25
    // totalDeducted = 10 + 5 + 2 = 17
    // points = round((25 - 17) / 25 * 100) = round(32) = 32
    const report = makeReport([
      makeResult({ status: "FAIL", severity: "critical" }),
      makeResult({ status: "FAIL", severity: "major" }),
      makeResult({ status: "WARN", severity: "major" }),
      makeResult({ status: "PASS", severity: "major" }),
    ]);
    const score = scoreReport(report);
    expect(score.totalWeight).toBe(25);
    expect(score.totalDeducted).toBe(17);
    expect(score.points).toBe(32);
    expect(score.grade).toBe("F");
  });
});
