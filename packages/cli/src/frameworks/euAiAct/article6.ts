import { config, doc, systemField } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, INFO, MAJOR } from "../../core/severity.js";

const VALID_RISK_LEVELS = ["prohibited", "high-risk", "limited-risk", "minimal-risk"] as const;
const ANNEX_III_CATEGORIES = [
  "biometric",
  "critical-infrastructure",
  "education",
  "employment",
  "essential-services",
  "law-enforcement",
  "migration",
  "justice",
] as const;

rule({
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
  check: systemField("riskLevel").validValues(VALID_RISK_LEVELS),
});

rule({
  id: "ASSERT-EU-AI-ACT-006-002-01",
  framework: "eu-ai-act",
  article: "6",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "High-risk system identifies its Annex III category",
  obligation: "OBL-EU-AI-ACT-006-002",
  legalText: "Article 6(2) and Annex III — High-risk AI systems referred to in Article 6(2)",
  remediation: `Add an 'annex_iii_category' field to your system config. Valid categories: ${ANNEX_III_CATEGORIES.join(", ")}.`,
  check: config("system").requireFieldIn(
    ["annex_iii_category", "annexIiiCategory"],
    ANNEX_III_CATEGORIES,
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-006-003-01",
  framework: "eu-ai-act",
  article: "6",
  severity: INFO,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Prohibited use cases documented as not applicable",
  obligation: "OBL-EU-AI-ACT-006-003",
  legalText: "Article 5 — Prohibited AI practices",
  remediation:
    "Create a prohibited-uses document in docs/compliance/ that explicitly states which Article 5 practices are not applicable.",
  check: doc("prohibited-uses")
    .inPaths(["docs/compliance/", "docs/", "compliance/"])
    .formats(["md", "yaml", "pdf", "docx"]),
});
