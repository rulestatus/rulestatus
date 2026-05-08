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
  /** Builder DSL check — used by executor. Mutually exclusive with fn. */
  check?: CheckNode;
  /** Imperative implementation — escape hatch for complex logic. */
  fn?: (system: SystemContext) => Promise<void>;
}

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
