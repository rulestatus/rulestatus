import { anyOf, doc, structured } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { MAJOR, MINOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-ISO-42001-010-001-01",
  framework: "iso-42001",
  cluster: "incident-response",
  article: "10.1",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Nonconformity and corrective action procedure exists",
  obligation: "OBL-ISO-42001-010-001",
  legalText:
    "Clause 10.1: When a nonconformity occurs, the organization shall take action to control and correct it, evaluate the need for action to eliminate the causes, and implement corrective action as needed.",
  remediation:
    "Create docs/aims/corrective-action.yaml with: nonconformity_process, root_cause_analysis, corrective_action_log.",
  check: anyOf(
    structured("corrective_action_log").requireAny(
      "nonconformities",
      "issues",
      "corrective_actions",
    ),
    doc("corrective-action")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("nonconformity_process", "corrective_action_process", "process"),
  ),
});

rule({
  id: "ASSERT-ISO-42001-010-002-01",
  framework: "iso-42001",
  cluster: "performance-monitoring",
  article: "10.2",
  severity: MINOR,
  appliesTo: { actor: "provider" },
  title: "Continual improvement of the AIMS is planned",
  obligation: "OBL-ISO-42001-010-002",
  legalText:
    "Clause 10.2: The organization shall continually improve the suitability, adequacy and effectiveness of the AIMS.",
  remediation:
    "Add a `continual_improvement` or `improvement_plan` field to your AIMS scope or AI objectives document.",
  check: anyOf(
    doc("aims-scope")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("continual_improvement", "improvement_plan", "improvementPlan"),
    doc("ai-objectives")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("continual_improvement", "improvement_plan", "improvement_cycle"),
  ),
});
