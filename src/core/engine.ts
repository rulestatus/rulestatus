import type { RulestatusConfig } from "../config/schema.js";
import { EvidenceRegistry } from "../evidence/registry.js";
import { ComplianceError, ManualReviewRequired, SkipTest } from "./exceptions.js";
import { type RuleMeta, RULE_REGISTRY } from "./rule.js";
import { type RuleResult, type RunReport } from "./result.js";
import { type SeverityLevel, atLeast } from "./severity.js";
import { SystemContext } from "./context.js";

const FRAMEWORK_MODULES: Record<string, string> = {
  "eu-ai-act": "../frameworks/euAiAct/index.js",
};

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
      const modulePath = FRAMEWORK_MODULES[fw];
      if (modulePath) {
        await import(modulePath);
      }
    }
  }

  collectRules(opts: RunOptions = {}): RuleMeta[] {
    let rules = [...RULE_REGISTRY];

    if (opts.framework) {
      rules = rules.filter((r) => r.framework === opts.framework);
    }
    if (opts.article) {
      rules = rules.filter((r) => r.article.startsWith(opts.article!));
    }
    if (opts.severity) {
      rules = rules.filter((r) => atLeast(r.severity, opts.severity!));
    }

    // Filter by system's actor and risk level
    rules = rules.filter((r) => {
      const at = r.appliesTo;
      if (at["actor"] && at["actor"] !== this.config.system.actor) return false;
      if (at["riskLevel"] && at["riskLevel"] !== this.config.system.riskLevel) return false;
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
      return { ...base, status: "PASS", durationMs: performance.now() - t0 };
    } catch (e) {
      const durationMs = performance.now() - t0;
      if (e instanceof ComplianceError) {
        return { ...base, status: "FAIL", message: e.message, durationMs };
      }
      if (e instanceof ManualReviewRequired) {
        return { ...base, status: "MANUAL", message: e.message, durationMs };
      }
      if (e instanceof SkipTest) {
        return { ...base, status: "SKIP", message: e.message, durationMs };
      }
      // Unexpected errors are surfaced as failures with the full stack
      const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
      return { ...base, status: "FAIL", message: `Internal error: ${msg}`, durationMs };
    }
  }
}
