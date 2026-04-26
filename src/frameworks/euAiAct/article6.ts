import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, INFO, MAJOR } from "../../core/severity.js";

const VALID_RISK_LEVELS = new Set(["prohibited", "high-risk", "limited-risk", "minimal-risk"]);
const ANNEX_III_CATEGORIES = new Set([
  "biometric",
  "critical-infrastructure",
  "education",
  "employment",
  "essential-services",
  "law-enforcement",
  "migration",
  "justice",
]);

rule(
  {
    id: "ASSERT-EU-AI-ACT-006-001-01",
    framework: "eu-ai-act",
    article: "6",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "System is classified under a defined risk level",
    obligation: "OBL-EU-AI-ACT-006-001",
    legalText: "Article 6 — Classification rules for high-risk AI systems",
    remediation:
      "Add a `risk_level` field in .rulestatus.yaml under `system:`. Valid values: prohibited, high-risk, limited-risk, minimal-risk.",
  },
  async (system) => {
    const level = system.riskLevel;
    if (!VALID_RISK_LEVELS.has(level)) {
      throw new ComplianceError(
        `System risk level "${level}" is not a recognised value. ` +
          `Expected one of: ${[...VALID_RISK_LEVELS].join(", ")}.`,
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-006-002-01",
    framework: "eu-ai-act",
    article: "6",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "High-risk system identifies its Annex III category",
    obligation: "OBL-EU-AI-ACT-006-002",
    legalText: "Article 6(2) and Annex III — High-risk AI systems referred to in Article 6(2)",
    remediation:
      "Add an `annex_iii_category` field in your system classification config or .rulestatus.yaml. " +
      `Valid categories: ${[...ANNEX_III_CATEGORIES].join(", ")}.`,
  },
  async (system) => {
    const config = await system.evidence.loadConfig("system");
    const category = String(config?.annex_iii_category ?? config?.annexIiiCategory ?? "").trim();

    if (!category) {
      throw new ComplianceError(
        "No Annex III category found. High-risk AI systems must be listed in Annex III. " +
          `Add 'annex_iii_category' to your system config. Valid values: ${[...ANNEX_III_CATEGORIES].join(", ")}.`,
      );
    }
    if (!ANNEX_III_CATEGORIES.has(category)) {
      throw new ComplianceError(
        `Annex III category "${category}" is not recognised. ` +
          `Valid values: ${[...ANNEX_III_CATEGORIES].join(", ")}.`,
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-006-003-01",
    framework: "eu-ai-act",
    article: "6",
    severity: INFO,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Prohibited use cases documented as not applicable",
    obligation: "OBL-EU-AI-ACT-006-003",
    legalText: "Article 5 — Prohibited AI practices",
    remediation:
      "Create a prohibited-uses document in docs/compliance/ that explicitly states which Article 5 practices are not applicable to this system.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "prohibited-uses",
      paths: ["docs/compliance/", "docs/", "compliance/"],
      formats: ["md", "yaml", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No prohibited-uses documentation found. " +
          "Best practice: document explicitly that Article 5 prohibited practices do not apply to this system.",
      );
    }
  },
);
