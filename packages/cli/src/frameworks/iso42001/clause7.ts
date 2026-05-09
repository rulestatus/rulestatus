import { anyOf, doc } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { MAJOR, MINOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/compliance/", "docs/"];
const PATHS_TRAINING = ["docs/training/", "docs/aims/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-ISO-42001-007-001-01",
  framework: "iso-42001",
  cluster: "roles-responsibilities",
  article: "7.2",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Competence requirements for AI roles are documented",
  obligation: "OBL-ISO-42001-007-001",
  legalText:
    "Clause 7.2: The organization shall determine the necessary competence of persons doing work under its control that affects its AI performance, ensure they are competent, and retain documented information as evidence.",
  remediation:
    "Create docs/aims/competence-requirements.yaml with: roles, required_competencies, and evidence_of_competence fields.",
  check: doc("competence-requirements")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("required_competencies", "competencies", "requiredCompetencies")
    .requireAny("roles", "ai_roles"),
});

rule({
  id: "ASSERT-ISO-42001-007-002-01",
  framework: "iso-42001",
  cluster: "roles-responsibilities",
  article: "7.3",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Awareness program for AI policy and AIMS exists",
  obligation: "OBL-ISO-42001-007-002",
  legalText:
    "Clause 7.3: Persons doing work under the organization's control shall be aware of the AI policy, their contribution to AIMS effectiveness, and the implications of not conforming.",
  remediation:
    "Create docs/training/ or docs/aims/ awareness documentation covering AI policy and AIMS obligations.",
  check: anyOf(
    doc("awareness-program")
      .inPaths(PATHS_TRAINING)
      .formats([...FMTS])
      .requireAny("ai_policy_awareness", "policy_awareness", "aims_awareness"),
    doc("training-materials")
      .inPaths(PATHS_TRAINING)
      .formats([...FMTS])
      .requireAny("ai_policy", "aims_obligations", "awareness"),
  ),
});

rule({
  id: "ASSERT-ISO-42001-007-003-01",
  framework: "iso-42001",
  cluster: "technical-documentation",
  article: "7.5",
  severity: MINOR,
  appliesTo: { actor: "provider" },
  title: "Document control procedure for AIMS documented information exists",
  obligation: "OBL-ISO-42001-007-003",
  legalText:
    "Clause 7.5: The organization shall control documented information required by the AIMS, including creation, update, and availability controls.",
  remediation:
    "Create docs/aims/document-control.yaml defining how AIMS documents are created, reviewed, approved, and retained.",
  check: doc("document-control")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("review_cycle", "review_frequency", "retention_period", "reviewCycle"),
});
