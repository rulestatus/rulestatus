import { anyOf, doc, modelCard } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS_TECH = ["docs/technical/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

const ANNEX_IV_FIELDS = [
  "general_description",
  "intended_purpose",
  "development_process",
  "training_methodology",
  "performance_metrics",
  "monitoring",
  "robustness",
  "accuracy",
  "cybersecurity",
  "human_oversight",
  "limitations",
  "standards",
  "post_market",
  "changes",
  "compliance_declaration",
];

rule({
  id: "ASSERT-EU-AI-ACT-011-001-01",
  framework: "eu-ai-act",
  cluster: "technical-documentation",
  article: "11.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Technical documentation exists with system description",
  obligation: "OBL-EU-AI-ACT-011-001",
  legalText:
    'Article 11(1): "The technical documentation of a high-risk AI system shall be drawn up before that system is placed on the market..."',
  remediation:
    "Create technical documentation in docs/technical/ or docs/compliance/. Must include system_name and general_description.",
  check: doc("technical-documentation")
    .inPaths(PATHS_TECH)
    .formats([...FMTS])
    .requireAny("system_name", "systemName", "general_description", "generalDescription"),
});

rule({
  id: "ASSERT-EU-AI-ACT-011-001-02",
  framework: "eu-ai-act",
  cluster: "technical-documentation",
  article: "11.1",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Technical documentation covers required Annex IV sections",
  obligation: "OBL-EU-AI-ACT-011-001",
  legalText: "Article 11 and Annex IV — Technical documentation required for high-risk AI systems.",
  remediation: `Ensure your technical documentation includes at least 10 of the ${ANNEX_IV_FIELDS.length} Annex IV sections.`,
  check: doc("technical-documentation")
    .inPaths(PATHS_TECH)
    .formats([...FMTS])
    .minFieldCoverage(10, ANNEX_IV_FIELDS),
});

rule({
  id: "ASSERT-EU-AI-ACT-011-001-03",
  framework: "eu-ai-act",
  cluster: "technical-documentation",
  article: "11.1",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Technical documentation includes model architecture description",
  obligation: "OBL-EU-AI-ACT-011-001",
  legalText:
    "Annex IV, point 1(c): technical documentation must include the design specifications, including general logic and algorithms.",
  remediation:
    "Add `model_architecture` to your technical documentation or `model_type` to your model card.",
  check: anyOf(
    modelCard().requireAny("model_type", "modelType"),
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("model_architecture", "modelArchitecture", "architecture"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-011-001-04",
  framework: "eu-ai-act",
  cluster: "performance-monitoring",
  article: "11.1",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Performance metrics are documented",
  obligation: "OBL-EU-AI-ACT-011-001",
  legalText: "Annex IV, point 2(f): technical documentation must include performance metrics.",
  remediation:
    "Add `performance_metrics` to your technical documentation or `metrics` to your model card.",
  check: anyOf(
    modelCard().requireAny("metrics", "model_performance"),
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("performance_metrics", "performanceMetrics", "metrics"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-011-001-05",
  framework: "eu-ai-act",
  cluster: "technical-documentation",
  article: "11.1",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Technical documentation is versioned and dated",
  obligation: "OBL-EU-AI-ACT-011-001",
  legalText: "Article 11(2): technical documentation must be kept up to date.",
  remediation: "Add `version` and `date` fields to your technical documentation.",
  check: doc("technical-documentation")
    .inPaths(PATHS_TECH)
    .formats([...FMTS])
    .require("version")
    .requireAny("date", "updated_at", "updatedAt"),
});

rule({
  id: "ASSERT-EU-AI-ACT-011-002-01",
  framework: "eu-ai-act",
  cluster: "technical-documentation",
  article: "11.2",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Technical documentation references relevant standards",
  obligation: "OBL-EU-AI-ACT-011-002",
  legalText: "Annex IV, point 4: technical documentation must list the relevant standards applied.",
  remediation: "Add a `standards` field listing applicable standards (e.g. ISO 42001, IEC 62443).",
  check: doc("technical-documentation")
    .inPaths(PATHS_TECH)
    .formats([...FMTS])
    .requireAny("standards", "applicable_standards"),
});
