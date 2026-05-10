import type { RunReport } from "./result.js";
import type { SeverityLevel } from "./severity.js";

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ComplianceScore {
  points: number;
  grade: Grade;
  totalDeducted: number;
}

/**
 * Deduction weights per severity for FAIL and WARN results.
 * WARN is half-weight — it signals a gap without blocking the pipeline.
 * Single source of truth: every reporter derives its score from scoreReport().
 */
const FAIL_DEDUCTIONS: Record<SeverityLevel, number> = {
  critical: 10,
  major: 5,
  minor: 2,
  info: 0,
};

const WARN_DEDUCTIONS: Record<SeverityLevel, number> = {
  critical: 5,
  major: 2,
  minor: 1,
  info: 0,
};

const GRADE_THRESHOLDS: [number, Grade][] = [
  [90, "A"],
  [80, "B"],
  [70, "C"],
  [60, "D"],
  [0, "F"],
];

export function scoreReport(report: RunReport): ComplianceScore {
  let totalDeducted = 0;

  for (const r of report.results) {
    if (r.status === "FAIL") {
      totalDeducted += FAIL_DEDUCTIONS[r.severity];
    } else if (r.status === "WARN") {
      totalDeducted += WARN_DEDUCTIONS[r.severity];
    }
  }

  const points = Math.max(0, 100 - totalDeducted);
  const grade = toGrade(points);
  return { points, grade, totalDeducted };
}

export function gradeLabel(score: ComplianceScore): string {
  return `${score.points}/100  Grade: ${score.grade}`;
}

function toGrade(points: number): Grade {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (points >= threshold) return grade;
  }
  return "F";
}
