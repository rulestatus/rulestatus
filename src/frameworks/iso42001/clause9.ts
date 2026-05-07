import { anyOf, doc, structured } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-ISO-42001-009-001-01",
  framework: "iso-42001",
  article: "9.1",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Monitoring and measurement program for AIMS is documented",
  obligation: "OBL-ISO-42001-009-001",
  legalText:
    "Clause 9.1: The organization shall monitor, measure, analyse and evaluate the AIMS. It shall determine what needs to be monitored and measured, and when results shall be analysed.",
  remediation:
    "Create docs/aims/monitoring-plan.yaml with: metrics, measurement_frequency, responsible_party, review_schedule.",
  check: anyOf(
    structured("aims_monitoring_plan")
      .requireAny("metrics", "kpis")
      .requireAny("measurement_frequency", "review_schedule"),
    doc("monitoring-plan")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("metrics", "kpis", "measurements")
      .requireAny("measurement_frequency", "review_schedule", "monitoring_cadence"),
  ),
});

rule({
  id: "ASSERT-ISO-42001-009-002-01",
  framework: "iso-42001",
  article: "9.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "Internal audit program for the AIMS is established",
  obligation: "OBL-ISO-42001-009-002",
  legalText:
    "Clause 9.2: The organization shall conduct internal audits at planned intervals to provide information on whether the AIMS conforms to requirements and is effectively implemented.",
  remediation:
    "Create docs/aims/audit-program.yaml with: audit_schedule, audit_scope, auditor_qualifications, last_audit_date.",
  check: anyOf(
    structured("audit_program")
      .requireAny("audit_schedule", "schedule")
      .requireAny("audit_scope", "scope"),
    doc("audit-program")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("audit_schedule", "schedule", "auditSchedule")
      .requireAny("audit_scope", "scope"),
  ),
});

rule({
  id: "ASSERT-ISO-42001-009-003-01",
  framework: "iso-42001",
  article: "9.3",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Management review of the AIMS is conducted and recorded",
  obligation: "OBL-ISO-42001-009-003",
  legalText:
    "Clause 9.3: Top management shall review the AIMS at planned intervals to ensure its continuing suitability, adequacy and effectiveness.",
  remediation:
    "Create docs/aims/management-review.yaml with: review_date, attendees, decisions, improvement_actions.",
  check: anyOf(
    structured("management_review")
      .requireAny("review_date", "reviewDate")
      .requireAny("decisions", "improvement_actions", "outcomes"),
    doc("management-review")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("review_date", "reviewDate")
      .requireAny("decisions", "improvement_actions", "outcomes"),
  ),
});
