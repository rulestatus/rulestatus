import { anyOf, config, doc } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/ai-rmf/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-NIST-AIRMF-MG-001-01",
  framework: "nist-ai-rmf",
  article: "MANAGE 1.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "AI risks are prioritized and treatment decisions are documented",
  obligation: "OBL-NIST-AIRMF-MG-001",
  legalText:
    "MANAGE 1.1: A risk treatment plan is established for AI risks. Identified risks are prioritized and treatment decisions — accept, mitigate, transfer, or avoid — are documented.",
  remediation:
    "Create docs/ai-rmf/risk-treatment-plan.yaml with: prioritized_risks, treatment_decisions (accept/mitigate/transfer/avoid), owners, target_dates.",
  check: anyOf(
    doc("risk-treatment-plan")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("prioritized_risks", "treatment_decisions", "risk_treatments"),
    doc("ai-risk-assessment")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("treatment_plan", "treatment_decisions", "risk_treatments"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-MG-002-01",
  framework: "nist-ai-rmf",
  article: "MANAGE 1.3",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Residual risks after treatment are identified and accepted",
  obligation: "OBL-NIST-AIRMF-MG-002",
  legalText:
    "MANAGE 1.3: Responses to the AI risks deemed highest priority are developed, planned, and documented. Residual risks are identified and documented.",
  remediation:
    "Add `residual_risks` field to your risk treatment plan listing risks that remain after mitigation.",
  check: anyOf(
    doc("risk-treatment-plan")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("residual_risks", "residualRisks", "accepted_risks"),
    doc("ai-risk-assessment")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("residual_risks", "residualRisks", "accepted_risks"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-MG-003-01",
  framework: "nist-ai-rmf",
  article: "MANAGE 2.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "AI incident response and escalation procedures are documented",
  obligation: "OBL-NIST-AIRMF-MG-003",
  legalText:
    "MANAGE 2.2: Mechanisms are established to inventory AI systems and report failures, unexpected outcomes, and other impacts that may affect the organization or individuals.",
  remediation:
    "Create docs/ai-rmf/incident-response.yaml or config/incident_response.yaml with: reporting_process, escalation_path, response_timeline.",
  check: anyOf(
    config("incident_response").requireAny(
      "reporting_process",
      "escalation_path",
      "response_timeline",
    ),
    doc("incident-response")
      .inPaths(["docs/ai-rmf/", "docs/", "compliance/", "docs/compliance/"])
      .formats([...FMTS])
      .requireAny("reporting_process", "escalation_path", "response_timeline"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-MG-004-01",
  framework: "nist-ai-rmf",
  article: "MANAGE 2.4",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Deployed AI system is monitored for performance and risk",
  obligation: "OBL-NIST-AIRMF-MG-004",
  legalText:
    "MANAGE 2.4: Deployed AI systems are monitored for performance and outcomes. Feedback is used to improve risk management processes.",
  remediation:
    "Document your production monitoring plan with: monitored_metrics, alert_thresholds, review_frequency, feedback_loop.",
  check: anyOf(
    doc("monitoring-plan")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("monitored_metrics", "metrics", "kpis")
      .requireAny("alert_thresholds", "review_frequency", "monitoring_cadence"),
    doc("technical-documentation")
      .inPaths(["docs/technical/", "docs/ai-rmf/", "docs/compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("monitoring", "post_market", "production_monitoring"),
  ),
});
