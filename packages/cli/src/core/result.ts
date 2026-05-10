import type { Confidence, EvidenceSource } from "../evidence/types.js";
import type { FrameworkBaseline } from "./rule.js";
import { atLeast, type SeverityLevel } from "./severity.js";

export type RuleStatus = "PASS" | "FAIL" | "WARN" | "SKIP" | "MANUAL" | "ATTESTED";

export interface RuleResult {
  ruleId: string;
  title: string;
  framework: string;
  article: string;
  severity: SeverityLevel;
  status: RuleStatus;
  cluster?: string | undefined;
  message?: string | undefined;
  durationMs: number;
  timestamp: Date;
  confidence: Confidence;
  evidenceSources: EvidenceSource[];
  attestedBy?: string | undefined;
  attestedAt?: string | undefined;
  attestationExpiresAt?: string | undefined;
}

export interface RunReport {
  systemName: string;
  actor: string;
  riskLevel: string;
  framework: string;
  startedAt: Date;
  finishedAt: Date;
  results: RuleResult[];
  frameworkBaselines: Record<string, FrameworkBaseline>;
}

export function passed(report: RunReport): RuleResult[] {
  return report.results.filter((r) => r.status === "PASS");
}

export function failed(report: RunReport): RuleResult[] {
  return report.results.filter((r) => r.status === "FAIL");
}

export function warned(report: RunReport): RuleResult[] {
  return report.results.filter((r) => r.status === "WARN");
}

export function skipped(report: RunReport): RuleResult[] {
  return report.results.filter((r) => r.status === "SKIP");
}

export function manual(report: RunReport): RuleResult[] {
  return report.results.filter((r) => r.status === "MANUAL");
}

export function attested(report: RunReport): RuleResult[] {
  return report.results.filter((r) => r.status === "ATTESTED");
}

/**
 * Returns 1 if any FAIL result meets or exceeds the `failOn` severity threshold,
 * otherwise 0. Used as the CLI process exit code.
 */
export function exitCode(report: RunReport, failOn: SeverityLevel = "critical"): number {
  const blocking = failed(report).filter((r) => atLeast(r.severity, failOn));
  return blocking.length > 0 ? 1 : 0;
}
