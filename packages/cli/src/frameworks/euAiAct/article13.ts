import { anyOf, config, doc } from "../../core/check.js";
import type { SystemContext } from "../../core/context.js";
import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS_IFU = ["docs/compliance/", "docs/", "compliance/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

// Article 13.1: multi-stage check with conditional hard-fail — kept as fn.
// If transparency config exists but ai_disclosure.enabled is false → hard FAIL (don't try API).
rule(
  {
    id: "ASSERT-EU-AI-ACT-013-001-01",
    framework: "eu-ai-act",
    article: "13.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "AI system discloses that output is AI-generated",
    obligation: "OBL-EU-AI-ACT-013-001",
    legalText:
      'Article 13(1): "High-risk AI systems shall be designed and developed in such a way to ensure that their operation is sufficiently transparent..."',
    remediation:
      "Enable AI disclosure in config/transparency.yaml with `ai_disclosure.enabled: true`.",
  },
  async (system: SystemContext) => {
    const cfg = await system.evidence.loadConfig("transparency");
    if (cfg) {
      const disclosure = (cfg.ai_disclosure ?? cfg.aiDisclosure) as
        | Record<string, unknown>
        | undefined;
      if (disclosure?.enabled === true) return;
      throw new ComplianceError(
        "AI disclosure is disabled in transparency config. Set `ai_disclosure.enabled: true`.",
      );
    }
    if (system.hasApi()) {
      const res = await system.evidence.probeApi("/api/health");
      if (res) {
        const hasHeader = "x-ai-disclosure" in res.headers || "x-ai-generated" in res.headers;
        const body = await res.body();
        const hasBodyField =
          body &&
          typeof body === "object" &&
          ("ai_disclosure" in (body as object) || "aiDisclosure" in (body as object));
        if (hasHeader || hasBodyField) return;
        throw new ComplianceError(
          "API endpoint missing AI disclosure. Add X-AI-Disclosure header or ai_disclosure field in response body.",
        );
      }
    }
    system.evidence.requireManual(
      "Cannot verify AI disclosure automatically. Provide documentation proving AI disclosure is shown to users.",
    );
  },
);

rule({
  id: "ASSERT-EU-AI-ACT-013-001-02",
  framework: "eu-ai-act",
  cluster: "transparency-disclosure",
  article: "13.1",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Transparency configuration documents AI disclosure and provider contact",
  obligation: "OBL-EU-AI-ACT-013-001",
  legalText:
    "Article 13(1): operation must be sufficiently transparent; Article 13(3)(a): instructions must include provider name and address.",
  remediation:
    "Create config/transparency.yaml with `ai_disclosure` (enabled: true, mechanism) and `provider_contact` fields.",
  check: config("transparency")
    .withOutputPath("config/transparency.yaml")
    .require("ai_disclosure")
    .requireAny("provider_contact", "providerContact"),
});

rule({
  id: "ASSERT-EU-AI-ACT-013-002-01",
  framework: "eu-ai-act",
  cluster: "transparency-disclosure",
  article: "13.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Instructions for use documentation exists",
  obligation: "OBL-EU-AI-ACT-013-002",
  legalText:
    'Article 13(2): "High-risk AI systems shall be accompanied by instructions for use in an appropriate digital or other format."',
  remediation: "Create docs/compliance/instructions-for-use.md.",
  check: doc("instructions-for-use")
    .inPaths(PATHS_IFU)
    .formats([...FMTS]),
});

rule({
  id: "ASSERT-EU-AI-ACT-013-002-02",
  framework: "eu-ai-act",
  cluster: "transparency-disclosure",
  article: "13.2",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Instructions for use include intended purpose and known limitations",
  obligation: "OBL-EU-AI-ACT-013-002",
  legalText:
    "Article 13(3)(b): instructions must specify the intended purpose and known limitations.",
  remediation:
    "Add `intended_purpose` and `known_limitations` fields to your instructions-for-use document.",
  check: doc("instructions-for-use")
    .inPaths(PATHS_IFU)
    .formats([...FMTS])
    .requireAny("intended_purpose", "intendedPurpose")
    .requireAny("known_limitations", "knownLimitations", "limitations"),
});

rule({
  id: "ASSERT-EU-AI-ACT-013-002-03",
  framework: "eu-ai-act",
  cluster: "transparency-disclosure",
  article: "13.2",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Instructions for use include performance characteristics",
  obligation: "OBL-EU-AI-ACT-013-002",
  legalText:
    "Article 13(3)(b)(iv): instructions must specify the level of accuracy, robustness and cybersecurity.",
  remediation:
    "Add `performance_metrics` or `accuracy` field to your instructions-for-use document.",
  check: doc("instructions-for-use")
    .inPaths(PATHS_IFU)
    .formats([...FMTS])
    .requireAny("performance_metrics", "accuracy", "performanceMetrics"),
});

rule({
  id: "ASSERT-EU-AI-ACT-013-003-01",
  framework: "eu-ai-act",
  cluster: "transparency-disclosure",
  article: "13.3",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "System capabilities and limitations are disclosed to deployers",
  obligation: "OBL-EU-AI-ACT-013-003",
  legalText:
    "Article 13(3)(b): instructions must include the capabilities and limitations of the system.",
  remediation:
    "Add `limitations` or `capabilities` field to instructions for use or technical documentation.",
  check: anyOf(
    doc("technical-documentation")
      .inPaths(["docs/technical/", "docs/compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("limitations", "capabilities"),
    doc("instructions-for-use")
      .inPaths(["docs/compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("limitations", "capabilities"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-013-004-01",
  framework: "eu-ai-act",
  cluster: "transparency-disclosure",
  article: "13.4",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Provider contact information is documented",
  obligation: "OBL-EU-AI-ACT-013-004",
  legalText:
    "Article 13(3)(a): instructions must include the name and registered address of the provider.",
  remediation: "Add `provider_contact` to instructions for use or system config.",
  check: anyOf(
    config("system").requireAny("provider_contact", "providerContact"),
    doc("instructions-for-use")
      .inPaths(["docs/compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("provider_contact", "providerContact", "provider"),
  ),
});
