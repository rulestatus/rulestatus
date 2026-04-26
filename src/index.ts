// Public API — for use as a library
export { rule, RULE_REGISTRY } from "./core/rule.js";
export { CRITICAL, MAJOR, MINOR, INFO, compareSeverity, atLeast } from "./core/severity.js";
export { ComplianceError, ManualReviewRequired, SkipTest } from "./core/exceptions.js";
export { exitCode, passed, failed, warned, skipped, manual } from "./core/result.js";
export type { RuleResult, RunReport, RuleStatus } from "./core/result.js";
export type { RuleMeta } from "./core/rule.js";
export type { SeverityLevel } from "./core/severity.js";
export { Engine } from "./core/engine.js";
export { loadConfig, findConfig } from "./config/loader.js";
export type { RulestatusConfig } from "./config/schema.js";
