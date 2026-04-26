import { describe, it, expect, beforeEach } from "bun:test";
import { rule, RULE_REGISTRY } from "../../src/core/rule.js";
import { CRITICAL } from "../../src/core/severity.js";

describe("rule()", () => {
  beforeEach(() => {
    RULE_REGISTRY.length = 0; // clear registry before each test
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
