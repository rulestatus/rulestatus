import { anyOf, doc, structured } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS = ["docs/compliance/", "docs/ai-rmf/", "docs/aims/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-CO-SB24205-1703-001-01",
  framework: "colorado-sb24-205",
  cluster: "ai-risk-management",
  article: "§6-1-1703",
  severity: CRITICAL,
  appliesTo: { actor: "deployer" },
  title: "Risk management program is documented and aligned with a recognized framework",
  obligation: "OBL-CO-SB24205-1703-001",
  legalText:
    "§6-1-1703(2)(b): Deployer shall implement a risk management program that is consistent with the NIST AI Risk Management Framework, ISO/IEC 42001, or another framework designated by the attorney general.",
  remediation:
    "Create docs/compliance/risk-management-program.yaml with `framework_alignment` (nist-ai-rmf, iso-42001, or equivalent), `program_description`, and `review_schedule` fields.",
  check: anyOf(
    doc("risk-management-program")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("framework_alignment", "frameworkAlignment", "aligned_framework")
      .requireAny("program_description", "risk_management_program", "program_overview"),
    doc("ai-risk-policy")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("framework_alignment", "nist_ai_rmf", "iso_42001")
      .requireAny("risk_management_program", "program_description"),
  ),
});

rule({
  id: "ASSERT-CO-SB24205-1703-002-01",
  framework: "colorado-sb24-205",
  cluster: "impact-assessment",
  article: "§6-1-1703",
  severity: CRITICAL,
  appliesTo: { actor: "deployer" },
  title: "Pre-deployment impact assessment is conducted and documented",
  obligation: "OBL-CO-SB24205-1703-002",
  legalText:
    "§6-1-1703(2)(c): Before deploying a high-risk AI system, deployer shall complete an impact assessment and retain it for at least 3 years after the system's final deployment.",
  remediation:
    "Create docs/compliance/ai-impact-assessment.yaml with required fields before deploying the AI system.",
  check: anyOf(
    structured("ai_impact_assessment")
      .requireAny("purpose", "intended_use", "deployment_purpose")
      .requireAny("risk_analysis", "discrimination_risks", "identified_risks"),
    doc("ai-impact-assessment")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("purpose", "intended_use", "deployment_purpose")
      .requireAny("risk_analysis", "discrimination_risks", "identified_risks"),
  ),
});

rule({
  id: "ASSERT-CO-SB24205-1703-003-01",
  framework: "colorado-sb24-205",
  cluster: "impact-assessment",
  article: "§6-1-1703",
  severity: MAJOR,
  appliesTo: { actor: "deployer" },
  title: "Impact assessment covers all required elements: purpose, risk, data, metrics, monitoring",
  obligation: "OBL-CO-SB24205-1703-003",
  legalText:
    "§6-1-1703(2)(c): The impact assessment must include the purpose, risk analysis, data categories processed, evaluation metrics, and post-deployment monitoring plan.",
  remediation:
    "Ensure your ai-impact-assessment includes: `purpose`, `risk_analysis`, `data_categories`, `evaluation_metrics`, and `monitoring_plan`.",
  check: doc("ai-impact-assessment")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("purpose", "deployment_purpose", "intended_use")
    .requireAny("risk_analysis", "discrimination_risks")
    .requireAny("data_categories", "input_data", "dataCategories")
    .requireAny("evaluation_metrics", "metrics", "performance_metrics")
    .requireAny("monitoring_plan", "post_deployment_monitoring", "monitoringPlan"),
});

rule({
  id: "ASSERT-CO-SB24205-1703-004-01",
  framework: "colorado-sb24-205",
  cluster: "performance-monitoring",
  article: "§6-1-1703",
  severity: MINOR,
  appliesTo: { actor: "deployer" },
  title: "Annual impact assessment review date is documented",
  obligation: "OBL-CO-SB24205-1703-004",
  legalText:
    "§6-1-1703(2)(c): Deployer shall complete an updated impact assessment annually and within 90 days of any intentional and substantial modification to the system.",
  remediation: "Add `annual_review_date` or `next_review_date` to your impact assessment document.",
  check: doc("ai-impact-assessment")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("annual_review_date", "next_review_date", "review_schedule", "reviewDate"),
});
