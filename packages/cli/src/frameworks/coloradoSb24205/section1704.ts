import { anyOf, config, doc } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/compliance/", "docs/", "public/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-CO-SB24205-1704-001-01",
    framework: "colorado-sb24-205",
    cluster: "transparency-disclosure",
    article: "§6-1-1704",
    severity: CRITICAL,
    appliesTo: { actor: "deployer" },
    title: "Consumer AI disclosure notice is documented",
    obligation: "OBL-CO-SB24205-1704-001",
    legalText:
      "§6-1-1704(1): Before or when a consumer interacts with a high-risk AI system, deployer shall provide a plain language notice that the system is an AI system, its purpose, and the nature of the consequential decision.",
    remediation:
      "Create docs/compliance/consumer-ai-disclosure.yaml with `ai_disclosure`, `system_purpose`, and `consequential_decision_description` fields. Enable in config/transparency.yaml with `ai_disclosure.enabled: true`.",
    check: anyOf(
      config("transparency").requireNestedValue("ai_disclosure.enabled", true),
      doc("consumer-ai-disclosure")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("ai_disclosure", "aiDisclosure", "disclosure_statement")
        .requireAny("system_purpose", "systemPurpose", "ai_purpose"),
    ),
  },

  {
    id: "ASSERT-CO-SB24205-1704-002-01",
    framework: "colorado-sb24-205",
    cluster: "transparency-disclosure",
    article: "§6-1-1704",
    severity: MAJOR,
    appliesTo: { actor: "deployer" },
    title: "Pre-decision notice includes data categories, appeal process, and contact information",
    obligation: "OBL-CO-SB24205-1704-002",
    legalText:
      "§6-1-1704(2): Before collecting personal data for a consequential decision, deployer shall notify the consumer of the purpose, general categories of data processed, and how to request human review or an alternative process.",
    remediation:
      "Add `data_categories`, `appeal_process` (or `human_review`), and `contact_information` to your consumer-ai-disclosure document.",
    check: doc("consumer-ai-disclosure")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("data_categories", "dataCategories", "input_data_types")
      .requireAny("appeal_process", "human_review", "alternative_process")
      .requireAny("contact_information", "contactInfo", "contact"),
  },
];
