import { beforeEach, describe, expect, it } from "bun:test";
import { defaultConfig } from "../../src/config/schema.js";
import { Engine } from "../../src/core/engine.js";
import { ComplianceError, ManualReviewRequired, SkipTest } from "../../src/core/exceptions.js";
import { RULE_REGISTRY } from "../../src/core/rule.js";
import { CRITICAL, MAJOR } from "../../src/core/severity.js";

function makeConfig(overrides: Record<string, unknown> = {}) {
  const cfg = defaultConfig();
  return { ...cfg, ...overrides } as ReturnType<typeof defaultConfig>;
}

describe("Engine", () => {
  beforeEach(() => {
    RULE_REGISTRY.length = 0;
  });

  it("returns PASS for a rule that does not throw", async () => {
    RULE_REGISTRY.push({
      id: "TEST-PASS",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Passing rule",
      fn: async () => {},
    });

    const engine = new Engine(makeConfig());
    const report = await engine.run({ framework: "test" });

    expect(report.results[0]?.status).toBe("PASS");
  });

  it("returns FAIL for a rule that throws ComplianceError", async () => {
    RULE_REGISTRY.push({
      id: "TEST-FAIL",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Failing rule",
      fn: async () => {
        throw new ComplianceError("Missing document");
      },
    });

    const engine = new Engine(makeConfig());
    const report = await engine.run({ framework: "test" });

    expect(report.results[0]?.status).toBe("FAIL");
    expect(report.results[0]?.message).toBe("Missing document");
  });

  it("returns MANUAL for ManualReviewRequired", async () => {
    RULE_REGISTRY.push({
      id: "TEST-MANUAL",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Manual rule",
      fn: async () => {
        throw new ManualReviewRequired("Please review manually");
      },
    });

    const engine = new Engine(makeConfig());
    const report = await engine.run({ framework: "test" });

    expect(report.results[0]?.status).toBe("MANUAL");
  });

  it("returns SKIP for SkipTest", async () => {
    RULE_REGISTRY.push({
      id: "TEST-SKIP",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Skipped rule",
      fn: async () => {
        throw new SkipTest("Not applicable");
      },
    });

    const engine = new Engine(makeConfig());
    const report = await engine.run({ framework: "test" });

    expect(report.results[0]?.status).toBe("SKIP");
  });

  it("filters by framework", async () => {
    RULE_REGISTRY.push(
      {
        id: "A-001",
        framework: "eu-ai-act",
        article: "9",
        severity: CRITICAL,
        appliesTo: { actor: "provider", riskLevel: "high-risk" },
        title: "EU Rule",
        fn: async () => {},
      },
      {
        id: "B-001",
        framework: "other",
        article: "1",
        severity: CRITICAL,
        appliesTo: { actor: "provider", riskLevel: "high-risk" },
        title: "Other Rule",
        fn: async () => {},
      },
    );

    const engine = new Engine(makeConfig());
    const report = await engine.run({ framework: "eu-ai-act" });

    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.ruleId).toBe("A-001");
  });

  it("filters out rules that don't apply to the system actor", async () => {
    RULE_REGISTRY.push({
      id: "PROVIDER-ONLY",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "deployer", riskLevel: "high-risk" },
      title: "Deployer rule",
      fn: async () => {},
    });

    const cfg = makeConfig();
    cfg.system.actor = "provider";
    const engine = new Engine(cfg);
    const report = await engine.run({ framework: "test" });

    expect(report.results).toHaveLength(0);
  });

  it("filters by severity threshold", async () => {
    RULE_REGISTRY.push(
      {
        id: "CRIT-001",
        framework: "test",
        article: "1",
        severity: CRITICAL,
        appliesTo: { actor: "provider", riskLevel: "high-risk" },
        title: "Critical rule",
        fn: async () => {},
      },
      {
        id: "MAJOR-001",
        framework: "test",
        article: "1",
        severity: MAJOR,
        appliesTo: { actor: "provider", riskLevel: "high-risk" },
        title: "Major rule",
        fn: async () => {},
      },
    );

    const engine = new Engine(makeConfig());
    const report = await engine.run({ framework: "test", severity: CRITICAL });

    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.ruleId).toBe("CRIT-001");
  });
});
