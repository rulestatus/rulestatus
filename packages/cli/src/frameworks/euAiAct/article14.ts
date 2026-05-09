import { anyOf, api, config, doc, manual } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS_TECH = ["docs/technical/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-EU-AI-ACT-014-001-01",
  framework: "eu-ai-act",
  cluster: "human-oversight",
  article: "14.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Human override mechanism exists or is documented",
  obligation: "OBL-EU-AI-ACT-014-001",
  legalText:
    'Article 14(1): "High-risk AI systems shall be designed and developed in such a way... that they can be effectively overseen by natural persons..."',
  remediation:
    "Create config/human_oversight.yaml with `override.enabled: true`, document the mechanism, or attest manually with `rulestatus attest ASSERT-EU-AI-ACT-014-001-01`.",
  check: anyOf(
    config("human_oversight").requireNestedValue("override.enabled", true),
    config("human_oversight").requireAny("override_mechanism", "overrideMechanism"),
    doc("human-oversight")
      .inPaths(["docs/compliance/", "docs/", "compliance/"])
      .formats([...FMTS])
      .requireAny("override_mechanism", "human_override"),
    api("/api/override").expectStatusNot(404),
    manual(
      "Provide documentation proving a human override mechanism exists and is accessible to oversight personnel.",
    ),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-014-002-01",
  framework: "eu-ai-act",
  cluster: "human-oversight",
  article: "14.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Human oversight measures are specified in technical documentation",
  obligation: "OBL-EU-AI-ACT-014-002",
  legalText:
    "Article 14(2): oversight measures must be built into the system or identified for implementation by the deployer.",
  remediation: "Add a `human_oversight_measures` field to your technical documentation.",
  check: doc("technical-documentation")
    .inPaths(PATHS_TECH)
    .formats([...FMTS])
    .requireAny("human_oversight_measures", "humanOversightMeasures", "human_oversight"),
});

rule({
  id: "ASSERT-EU-AI-ACT-014-003-01",
  framework: "eu-ai-act",
  cluster: "human-oversight",
  article: "14.3",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Explainability output is available to oversight personnel",
  obligation: "OBL-EU-AI-ACT-014-003",
  legalText:
    "Article 14(4)(c): oversight persons must be able to interpret the AI system's output.",
  remediation:
    "Add `enabled: true` to config/explainability.yaml, document explainability in technical docs, or attest manually with `rulestatus attest ASSERT-EU-AI-ACT-014-003-01`.",
  check: anyOf(
    config("explainability").requireNestedValue("enabled", true),
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("explainability", "interpretability"),
    api("/api/explain").expectOk(),
    manual(
      "Provide documentation proving explainability output is available to oversight personnel.",
    ),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-014-004-01",
  framework: "eu-ai-act",
  cluster: "human-oversight",
  article: "14.4",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "System can be paused or stopped by human operator",
  obligation: "OBL-EU-AI-ACT-014-004",
  legalText:
    "Article 14(4)(e): oversight persons must be able to decide not to use the AI system or override its output.",
  remediation: "Add `pause_capability: true` to config/human_oversight.yaml.",
  check: anyOf(
    config("human_oversight").requireNestedValue("pause_capability", true),
    config("human_oversight").requireNestedValue("pauseCapability", true),
    config("human_oversight").requireAny("stop_mechanism", "stopMechanism"),
    doc("human-oversight")
      .inPaths(["docs/compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("pause_capability", "stop_mechanism"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-014-005-01",
  framework: "eu-ai-act",
  cluster: "human-oversight",
  article: "14.5",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Human oversight training materials exist",
  obligation: "OBL-EU-AI-ACT-014-005",
  legalText:
    "Article 14(3): oversight persons must have the necessary competence, training and authority.",
  remediation: "Create docs/training/ or docs/oversight/ documentation for oversight personnel.",
  check: doc("training-materials")
    .inPaths(["docs/training/", "docs/oversight/", "docs/compliance/"])
    .formats([...FMTS]),
});

rule({
  id: "ASSERT-EU-AI-ACT-014-006-01",
  framework: "eu-ai-act",
  cluster: "human-oversight",
  article: "14.6",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Audit logs are accessible to oversight personnel",
  obligation: "OBL-EU-AI-ACT-014-006",
  legalText:
    "Article 12: high-risk AI systems shall have logging capabilities for monitoring purposes.",
  remediation: "Add `audit_log.enabled: true` to config/logging.yaml.",
  check: anyOf(
    config("logging").requireNestedValue("audit_log.enabled", true),
    config("logging").requireNestedValue("auditLog.enabled", true),
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("audit_logging", "monitoring"),
  ),
});
