import { anyOf, doc, structured } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-ISO-42001-008-001-01",
    framework: "iso-42001",
    cluster: "ai-risk-management",
    article: "8.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "AI risk assessment process is documented",
    obligation: "OBL-ISO-42001-008-001",
    legalText:
      "Clause 8.2 + Annex A.5.1: The organization shall implement and maintain an AI risk assessment process including identification of risks, analysis, and evaluation against risk acceptance criteria.",
    remediation:
      "Create docs/aims/ai-risk-assessment.yaml with: risk_criteria, assessment_methodology, identified_risks.",
    check: anyOf(
      structured("ai_risk_assessment")
        .requireAny("risk_criteria", "riskCriteria")
        .requireAny("identified_risks", "risks", "assessedRisks"),
      doc("ai-risk-assessment")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("risk_criteria", "assessment_methodology", "riskCriteria")
        .requireAny("identified_risks", "risks"),
    ),
  },

  {
    id: "ASSERT-ISO-42001-008-002-01",
    framework: "iso-42001",
    cluster: "impact-assessment",
    article: "8.3",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "AI impact assessment is documented",
    obligation: "OBL-ISO-42001-008-002",
    legalText:
      "Clause 8.3 + Annex A.5.2: The organization shall conduct and document an AI impact assessment covering potential impacts on individuals, groups, and society.",
    remediation:
      "Create docs/aims/ai-impact-assessment.yaml with: impacted_groups, potential_harms, severity_ratings, mitigations.",
    check: anyOf(
      structured("ai_impact_assessment").requireAny(
        "impacted_groups",
        "impacts",
        "potential_harms",
      ),
      doc("ai-impact-assessment")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("impacted_groups", "impacts", "potential_harms", "impactedGroups"),
    ),
  },

  {
    id: "ASSERT-ISO-42001-008-003-01",
    framework: "iso-42001",
    cluster: "training-data",
    article: "8.4",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "AI system lifecycle stages are documented",
    obligation: "OBL-ISO-42001-008-003",
    legalText:
      "Clause 8.4 + Annex A.6.1: The organization shall plan and control processes for the AI system lifecycle, including design, development, testing, deployment, monitoring, and decommissioning.",
    remediation:
      "Add a `lifecycle_stages` or `development_process` field to your technical documentation or create docs/aims/lifecycle.yaml.",
    check: anyOf(
      doc("lifecycle")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("lifecycle_stages", "development_stages", "lifecycleStages"),
      doc("technical-documentation")
        .inPaths(["docs/technical/", "docs/compliance/", "docs/"])
        .formats([...FMTS])
        .requireAny("development_process", "lifecycle_stages", "deployment_process"),
    ),
  },

  {
    id: "ASSERT-ISO-42001-008-004-01",
    framework: "iso-42001",
    cluster: "human-oversight",
    article: "8.1",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "Operational planning and control procedures are documented",
    obligation: "OBL-ISO-42001-008-004",
    legalText:
      "Clause 8.1: The organization shall plan, implement, control, evaluate, and maintain the processes needed to meet requirements for the provision of AI systems.",
    remediation:
      "Create docs/aims/operational-procedures.yaml documenting development controls, review gates, and deployment approval process.",
    check: doc("operational-procedures")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("development_controls", "review_gates", "deployment_approval", "controls"),
  },
];
