import type { RulestatusConfig } from "../config/schema.js";
import { EvidenceRegistry } from "../evidence/registry.js";
import { SystemContext } from "./context.js";
import { ComplianceError, ManualReviewRequired, SkipTest } from "./exceptions.js";
import type { RuleResult, RunReport } from "./result.js";
import { RULE_REGISTRY, type RuleMeta } from "./rule.js";
import { atLeast, type SeverityLevel } from "./severity.js";

export interface RunOptions {
  framework?: string;
  article?: string;
  severity?: SeverityLevel;
}

export class Engine {
  private readonly system: SystemContext;

  constructor(private readonly config: RulestatusConfig) {
    const evCfg: Record<string, unknown> = {
      ...config.evidence,
      api_base_url: config.system.apiBaseUrl || config.evidence.apiBaseUrl,
    };
    const basePath = process.cwd();
    const registry = new EvidenceRegistry(evCfg, basePath);
    this.system = new SystemContext(config.system, registry);
  }

  /** Lazily import framework modules, triggering side-effect registration into RULE_REGISTRY. */
  async loadFrameworks(frameworks: string[]): Promise<void> {
    for (const fw of frameworks) {
      if (fw === "eu-ai-act") {
        await import("../frameworks/euAiAct/index.js");
      }
    }
  }

  collectRules(opts: RunOptions = {}): RuleMeta[] {
    let rules = [...RULE_REGISTRY];

    if (opts.framework) {
      rules = rules.filter((r) => r.framework === opts.framework);
    }
    if (opts.article) {
      const article = opts.article;
      rules = rules.filter((r) => r.article.startsWith(article));
    }
    if (opts.severity) {
      const severity = opts.severity;
      rules = rules.filter((r) => atLeast(r.severity, severity));
    }

    // Filter by system's actor and risk level
    rules = rules.filter((r) => {
      const at = r.appliesTo;
      if (at.actor && at.actor !== this.config.system.actor) return false;
      if (at.riskLevel && at.riskLevel !== this.config.system.riskLevel) return false;
      return true;
    });

    return rules;
  }

  async run(opts: RunOptions = {}): Promise<RunReport> {
    const rules = this.collectRules(opts);
    const startedAt = new Date();
    const results: RuleResult[] = [];

    for (const rule of rules) {
      results.push(await this.execute(rule));
    }

    return {
      systemName: this.config.system.name,
      actor: this.config.system.actor,
      riskLevel: this.config.system.riskLevel,
      framework: opts.framework ?? "all",
      startedAt,
      finishedAt: new Date(),
      results,
    };
  }

  private async execute(rule: RuleMeta): Promise<RuleResult> {
    const registry = this.system.evidence;
    registry.resetForRule();

    const base = {
      ruleId: rule.id,
      title: rule.title,
      framework: rule.framework,
      article: rule.article,
      severity: rule.severity,
      timestamp: new Date(),
    };

    const t0 = performance.now();
    try {
      await rule.fn(this.system);
      const durationMs = performance.now() - t0;
      return {
        ...base,
        status: "PASS",
        durationMs,
        confidence: registry.getConfidence(),
        evidenceSources: registry.snapshotSources(),
      };
    } catch (e) {
      const durationMs = performance.now() - t0;
      const evidenceSources = registry.snapshotSources();
      const confidence = registry.getConfidence();
      if (e instanceof ComplianceError) {
        return {
          ...base,
          status: "FAIL",
          message: e.message,
          durationMs,
          confidence,
          evidenceSources,
        };
      }
      if (e instanceof ManualReviewRequired) {
        return {
          ...base,
          status: "MANUAL",
          message: e.message,
          durationMs,
          confidence,
          evidenceSources,
        };
      }
      if (e instanceof SkipTest) {
        return {
          ...base,
          status: "SKIP",
          message: e.message,
          durationMs,
          confidence,
          evidenceSources,
        };
      }
      // Unexpected errors are surfaced as failures with the full stack
      const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
      return {
        ...base,
        status: "FAIL",
        message: `Internal error: ${msg}`,
        durationMs,
        confidence,
        evidenceSources,
      };
    }
  }
}
