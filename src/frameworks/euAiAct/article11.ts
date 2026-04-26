import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

// Required sections per Annex IV of the EU AI Act
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

rule(
  {
    id: "ASSERT-EU-AI-ACT-011-001-01",
    framework: "eu-ai-act",
    article: "11.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Technical documentation exists with system description",
    obligation: "OBL-EU-AI-ACT-011-001",
    legalText:
      'Article 11(1): "The technical documentation of a high-risk AI system shall be drawn up before that system is placed on the market or put into service..."',
    remediation:
      "Create technical documentation in docs/technical/ or docs/compliance/. " +
      "It must include at minimum: system_name, general_description, intended_purpose.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No technical documentation found. Expected in docs/technical/ or docs/compliance/.",
      );
    }
    if (
      !doc.hasField("system_name") &&
      !doc.hasField("systemName") &&
      !doc.hasField("general_description") &&
      !doc.hasField("generalDescription")
    ) {
      throw new ComplianceError(
        "Technical documentation missing: system name or general description.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-011-001-02",
    framework: "eu-ai-act",
    article: "11.1",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Technical documentation covers required Annex IV sections",
    obligation: "OBL-EU-AI-ACT-011-001",
    legalText:
      "Article 11 and Annex IV — Technical documentation required for high-risk AI systems.",
    remediation:
      `Ensure your technical documentation includes at least 10 of the ${ANNEX_IV_FIELDS.length} Annex IV sections. ` +
      `Required fields: ${ANNEX_IV_FIELDS.join(", ")}.`,
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No technical documentation found.");
    }

    const covered = ANNEX_IV_FIELDS.filter((f) => doc.hasField(f) || doc.hasField(toCamel(f)));

    if (covered.length < 10) {
      const missing = ANNEX_IV_FIELDS.filter((f) => !covered.includes(f));
      throw new ComplianceError(
        `Technical documentation covers ${covered.length}/${ANNEX_IV_FIELDS.length} Annex IV sections. ` +
          `Need at least 10. Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " ..." : ""}.`,
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-011-001-03",
    framework: "eu-ai-act",
    article: "11.1",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Technical documentation includes model architecture description",
    obligation: "OBL-EU-AI-ACT-011-001",
    legalText:
      "Annex IV, point 1(c): technical documentation must include the design specifications, including general logic and algorithms.",
    remediation:
      "Add `model_architecture` to your technical documentation or `model_type` to your model card.",
  },
  async (system) => {
    const modelCard = await system.evidence.loadModelCard();
    if (modelCard?.hasField("model_type") || modelCard?.hasField("modelType")) return;

    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No technical documentation found.");
    }
    if (
      !doc.hasField("model_architecture") &&
      !doc.hasField("modelArchitecture") &&
      !doc.hasField("architecture")
    ) {
      throw new ComplianceError("Technical documentation missing: model architecture description.");
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-011-001-04",
    framework: "eu-ai-act",
    article: "11.1",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Performance metrics are documented",
    obligation: "OBL-EU-AI-ACT-011-001",
    legalText:
      "Annex IV, point 2(f): technical documentation must include the measures for human oversight and the performance metrics.",
    remediation:
      "Add `performance_metrics` to your technical documentation or `metrics` to your model card.",
  },
  async (system) => {
    const modelCard = await system.evidence.loadModelCard();
    if (modelCard?.hasField("metrics") || modelCard?.hasField("model_performance")) return;

    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No technical documentation found.");
    }
    if (
      !doc.hasField("performance_metrics") &&
      !doc.hasField("performanceMetrics") &&
      !doc.hasField("metrics")
    ) {
      throw new ComplianceError("Technical documentation missing: performance metrics.");
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-011-001-05",
    framework: "eu-ai-act",
    article: "11.1",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Technical documentation is versioned and dated",
    obligation: "OBL-EU-AI-ACT-011-001",
    legalText:
      "Article 11(2): technical documentation must be kept up to date; version control is implied.",
    remediation: "Add `version` and `date` fields to your technical documentation.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No technical documentation found.");
    }
    if (!doc.hasField("version")) {
      throw new ComplianceError("Technical documentation missing: version field.");
    }
    if (!doc.hasField("date") && !doc.hasField("updated_at") && !doc.hasField("updatedAt")) {
      throw new ComplianceError("Technical documentation missing: date field.");
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-011-002-01",
    framework: "eu-ai-act",
    article: "11.2",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Technical documentation references relevant standards",
    obligation: "OBL-EU-AI-ACT-011-002",
    legalText:
      "Annex IV, point 4: technical documentation must list the relevant standards applied.",
    remediation:
      "Add a `standards` field to your technical documentation listing applicable standards (e.g., ISO 42001, IEC 62443).",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No technical documentation found.");
    }
    if (!doc.hasField("standards") && !doc.hasField("applicable_standards")) {
      throw new ComplianceError(
        "Technical documentation missing: references to applicable standards (e.g. ISO 42001, IEC 62443).",
      );
    }
  },
);

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
