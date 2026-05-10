import type { CheckNode } from "./check.js";
import type { SystemContext } from "./context.js";
import type { SeverityLevel } from "./severity.js";

export interface RuleMeta {
  id: string;
  framework: string;
  article: string;
  severity: SeverityLevel;
  appliesTo: Record<string, string>;
  title: string;
  description?: string;
  obligation?: string;
  remediation?: string;
  legalText?: string;
  /**
   * Cross-framework obligation cluster — groups assertions from different frameworks
   * that address the same underlying requirement. Used to derive interoperability
   * annotations at runtime. Rule files are the single source of truth for this mapping.
   *
   * Defined clusters:
   *   ai-risk-management      ai-policy-governance   roles-responsibilities
   *   incident-response       training-data          bias-fairness
   *   technical-documentation performance-monitoring security-robustness
   *   transparency-disclosure human-oversight        impact-assessment
   */
  cluster?: string | undefined;
  /** Builder DSL check — used by executor. Mutually exclusive with fn. */
  check?: CheckNode;
  /** Imperative implementation — escape hatch for complex logic. */
  fn?: (system: SystemContext) => Promise<void>;
}

export const FRAMEWORK_LABEL: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "iso-42001": "ISO/IEC 42001:2023",
  "nist-ai-rmf": "NIST AI RMF 1.0",
  "colorado-sb24-205": "Colorado SB 24-205",
};

export const RULE_REGISTRY: RuleMeta[] = [];

/**
 * Register a compliance rule. Call at module top-level in each framework file.
 *
 * Two forms:
 *   rule({ ...meta, check: doc("...").inPaths([...]) })        // builder DSL
 *   rule({ ...meta }, async (system) => { ... })               // imperative (escape hatch)
 */
export function rule(
  meta: Omit<RuleMeta, "fn">,
  fn?: (system: SystemContext) => Promise<void>,
): void {
  RULE_REGISTRY.push(fn ? { ...meta, fn } : meta);
}
