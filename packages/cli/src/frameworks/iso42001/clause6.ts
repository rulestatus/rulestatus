import { anyOf, doc, structured } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-ISO-42001-006-001-01",
    framework: "iso-42001",
    cluster: "ai-risk-management",
    article: "6.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "AIMS-level risks and opportunities are identified and documented",
    obligation: "OBL-ISO-42001-006-001",
    legalText:
      "Clause 6.1.1: The organization shall determine the risks and opportunities that need to be addressed to give assurance that the AIMS can achieve its intended outcome(s).",
    remediation:
      "Create docs/aims/aims-risk-assessment.yaml with: identified_risks, opportunities, and treatment_plan fields.",
    check: anyOf(
      structured("aims_risk_assessment")
        .requireAny("identified_risks", "risks")
        .requireAny("treatment_plan", "treatmentPlan", "mitigations"),
      doc("aims-risk-assessment")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("identified_risks", "risks")
        .requireAny("treatment_plan", "treatmentPlan", "opportunities"),
    ),
  },

  {
    id: "ASSERT-ISO-42001-006-002-01",
    framework: "iso-42001",
    cluster: "performance-monitoring",
    article: "6.2",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "AI management objectives are documented and measurable",
    obligation: "OBL-ISO-42001-006-002",
    legalText:
      "Clause 6.2: The organization shall establish AI management objectives at relevant functions, levels, and processes. Objectives shall be measurable and have a target date.",
    remediation:
      "Create docs/aims/ai-objectives.yaml with: objectives (each with target, measure, review_date).",
    check: anyOf(
      structured("ai_objectives").requireAny("objectives", "aims_objectives"),
      doc("ai-objectives")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("objectives", "aims_objectives", "aiObjectives"),
    ),
  },
];
