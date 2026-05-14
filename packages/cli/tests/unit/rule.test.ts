import { beforeEach, describe, expect, it } from "bun:test";
import { RULE_REGISTRY, RuleRegistry, rule } from "../../src/core/rule.js";
import { CRITICAL } from "../../src/core/severity.js";

describe("rule() global registry", () => {
  beforeEach(() => {
    RULE_REGISTRY.length = 0;
  });

  it("registers a rule in RULE_REGISTRY", () => {
    const fn = async () => {};
    rule(
      {
        id: "TEST-001",
        framework: "test",
        article: "1",
        severity: CRITICAL,
        appliesTo: { actor: "provider", riskLevel: "high-risk" },
        title: "Test rule",
      },
      fn,
    );

    expect(RULE_REGISTRY).toHaveLength(1);
    expect(RULE_REGISTRY[0]?.id).toBe("TEST-001");
    expect(RULE_REGISTRY[0]?.fn).toBe(fn);
  });

  it("preserves all metadata fields", () => {
    rule(
      {
        id: "TEST-002",
        framework: "eu-ai-act",
        article: "9.1",
        severity: CRITICAL,
        appliesTo: { actor: "provider", riskLevel: "high-risk" },
        title: "My rule",
        obligation: "OBL-001",
        legalText: "Article 9...",
        remediation: "Fix it by...",
      },
      async () => {},
    );

    const r = RULE_REGISTRY[0];
    expect(r?.obligation).toBe("OBL-001");
    expect(r?.legalText).toBe("Article 9...");
    expect(r?.remediation).toBe("Fix it by...");
  });
});

describe("RuleRegistry class", () => {
  it("starts empty", () => {
    const reg = new RuleRegistry();
    expect(reg.rules).toHaveLength(0);
  });

  it("register() adds a rule", () => {
    const reg = new RuleRegistry();
    reg.register({
      id: "REG-001",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider" },
      title: "Test",
      fn: async () => {},
    });
    expect(reg.rules).toHaveLength(1);
    expect(reg.rules[0]?.id).toBe("REG-001");
  });

  it("clear() empties the registry", () => {
    const reg = new RuleRegistry();
    reg.register({
      id: "REG-002",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: {},
      title: "Test",
    });
    reg.clear();
    expect(reg.rules).toHaveLength(0);
  });

  it("two instances are fully isolated", () => {
    const reg1 = new RuleRegistry();
    const reg2 = new RuleRegistry();
    reg1.register({
      id: "REG1",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: {},
      title: "Reg1",
    });
    expect(reg1.rules).toHaveLength(1);
    expect(reg2.rules).toHaveLength(0);
  });
});
