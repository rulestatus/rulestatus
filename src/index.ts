// Public API — for use as a library

export { findConfig, loadConfig } from "./config/loader.js";
export type { RulestatusConfig } from "./config/schema.js";
export { Engine } from "./core/engine.js";
export { ComplianceError, ManualReviewRequired, SkipTest } from "./core/exceptions.js";
export type { RuleResult, RuleStatus, RunReport } from "./core/result.js";
export { exitCode, failed, manual, passed, skipped, warned } from "./core/result.js";
export type { RuleMeta } from "./core/rule.js";
export { RULE_REGISTRY, rule } from "./core/rule.js";
export type { SeverityLevel } from "./core/severity.js";
export { atLeast, CRITICAL, compareSeverity, INFO, MAJOR, MINOR } from "./core/severity.js";
