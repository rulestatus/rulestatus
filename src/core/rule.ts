import type { SeverityLevel } from "./severity.js";
import type { SystemContext } from "./context.js";

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
  fn: (system: SystemContext) => Promise<void>;
}

export const RULE_REGISTRY: RuleMeta[] = [];

/**
 * Register a compliance rule. Call at module top-level in each framework file.
 * Registration happens as a side-effect of import — framework modules are loaded
 * lazily by the engine so the full registry isn't built until needed.
 */
export function rule(
  meta: Omit<RuleMeta, "fn">,
  fn: (system: SystemContext) => Promise<void>,
): void {
  RULE_REGISTRY.push({ ...meta, fn });
}
