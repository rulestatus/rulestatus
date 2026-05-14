import { anyOf, doc, modelCard, structured } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS = ["docs/ai-rmf/", "docs/compliance/", "docs/"];
const PATHS_TECH = ["docs/technical/", "docs/ai-rmf/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-NIST-AIRMF-MS-001-01",
    framework: "nist-ai-rmf",
    cluster: "ai-risk-management",
    article: "MEASURE 1.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "Criteria for evaluating AI risk are defined",
    obligation: "OBL-NIST-AIRMF-MS-001",
    legalText:
      "MEASURE 1.1: Approaches and criteria to evaluate the trustworthiness of AI systems are established. The criteria align with risk categories identified during the Map function.",
    remediation:
      "Add `evaluation_criteria` or `trustworthiness_criteria` to your AI risk assessment or create a separate evaluation framework document.",
    check: anyOf(
      doc("ai-risk-assessment")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("evaluation_criteria", "trustworthiness_criteria", "risk_criteria"),
      doc("evaluation-framework")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("evaluation_criteria", "criteria", "measures"),
    ),
  },

  {
    id: "ASSERT-NIST-AIRMF-MS-002-01",
    framework: "nist-ai-rmf",
    cluster: "performance-monitoring",
    article: "MEASURE 2.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "AI system performance is evaluated and results documented",
    obligation: "OBL-NIST-AIRMF-MS-002",
    legalText:
      "MEASURE 2.2: Scientific and technical evaluations of AI system functionality and performance are documented. Evaluation methods are appropriate for the intended context.",
    remediation:
      "Add `performance_metrics` to your model card or technical documentation with evaluation results.",
    check: anyOf(
      modelCard().requireAny("metrics", "model_performance", "evaluation_results"),
      doc("technical-documentation")
        .inPaths(PATHS_TECH)
        .formats([...FMTS])
        .requireAny("performance_metrics", "evaluation_results", "accuracy"),
    ),
  },

  {
    id: "ASSERT-NIST-AIRMF-MS-003-01",
    framework: "nist-ai-rmf",
    cluster: "bias-fairness",
    article: "MEASURE 2.3",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "Fairness and bias metrics are documented across population groups",
    obligation: "OBL-NIST-AIRMF-MS-003",
    legalText:
      "MEASURE 2.3: AI system performance or improvement is evaluated against benchmarks. Benchmarks include group fairness metrics where relevant.",
    remediation:
      "Add per-group performance metrics to your bias assessment. Include group_metrics with results per population subgroup.",
    check: anyOf(
      structured("bias_assessment").requireAny(
        "group_metrics",
        "groupMetrics",
        "per_group_metrics",
        "fairness_metrics",
      ),
      doc("bias-examination")
        .inPaths(["docs/compliance/", "docs/ai-rmf/", "docs/"])
        .formats([...FMTS])
        .requireAny("group_metrics", "fairness_metrics", "disaggregated_metrics"),
    ),
  },

  {
    id: "ASSERT-NIST-AIRMF-MS-004-01",
    framework: "nist-ai-rmf",
    cluster: "security-robustness",
    article: "MEASURE 2.7",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "AI system security and adversarial robustness are evaluated",
    obligation: "OBL-NIST-AIRMF-MS-004",
    legalText:
      "MEASURE 2.7: AI system security and resilience — including adversarial robustness — are evaluated and documented. Results are considered in risk treatment decisions.",
    remediation:
      "Document security evaluation results in docs/security/ or docs/ai-rmf/ including adversarial testing findings.",
    check: anyOf(
      doc("security")
        .inPaths(["docs/security/", "docs/ai-rmf/", "docs/compliance/", "docs/"])
        .formats([...FMTS])
        .requireAny("adversarial_testing", "security_evaluation", "robustness_testing"),
      doc("technical-documentation")
        .inPaths(PATHS_TECH)
        .formats([...FMTS])
        .requireAny("robustness", "adversarial_testing", "security_evaluation"),
    ),
  },

  {
    id: "ASSERT-NIST-AIRMF-MS-005-01",
    framework: "nist-ai-rmf",
    cluster: "security-robustness",
    article: "MEASURE 2.9",
    severity: MINOR,
    appliesTo: { actor: "provider" },
    title: "Risks from third-party AI components and data are documented",
    obligation: "OBL-NIST-AIRMF-MS-005",
    legalText:
      "MEASURE 2.9: The AI system architecture, including AI components and third-party components, is documented and known. Risks from third-party use are considered.",
    remediation:
      "Add `third_party_components` or `supply_chain_risks` to your technical documentation.",
    check: anyOf(
      doc("technical-documentation")
        .inPaths(PATHS_TECH)
        .formats([...FMTS])
        .requireAny("third_party_components", "supply_chain_risks", "dependencies"),
      doc("vendor-risk")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("third_party_components", "ai_components", "component_risks"),
    ),
  },
];
