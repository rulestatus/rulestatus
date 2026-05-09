import { anyOf, config, doc } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS = ["docs/ai-rmf/", "docs/governance/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-NIST-AIRMF-GV-001-01",
  framework: "nist-ai-rmf",
  cluster: "ai-policy-governance",
  article: "GOVERN 1.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "AI risk management policy is documented",
  obligation: "OBL-NIST-AIRMF-GV-001",
  legalText:
    "GOVERN 1.1: Policies, processes, procedures, and practices across the organization related to the mapping, measuring, and managing of AI risks are established, transparent, and implemented effectively.",
  remediation:
    "Create docs/ai-rmf/ai-risk-policy.yaml with: scope, governance_structure, risk_management_commitment, approved_by.",
  check: anyOf(
    config("ai_risk_policy")
      .requireAny("scope", "governance_structure")
      .requireAny("risk_management_commitment", "commitment"),
    doc("ai-risk-policy")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("scope", "governance_structure")
      .requireAny("risk_management_commitment", "commitment"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-GV-002-01",
  framework: "nist-ai-rmf",
  cluster: "ai-policy-governance",
  article: "GOVERN 1.5",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "Organizational AI risk tolerance is defined",
  obligation: "OBL-NIST-AIRMF-GV-002",
  legalText:
    "GOVERN 1.5: Organizational risk tolerances are established, communicated, and maintained. Teams understand the organization's risk tolerance for AI systems.",
  remediation:
    "Add a `risk_tolerance` field to your AI risk policy document defining acceptable risk thresholds.",
  check: anyOf(
    config("ai_risk_policy").requireAny("risk_tolerance", "riskTolerance"),
    doc("ai-risk-policy")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("risk_tolerance", "riskTolerance", "acceptable_risk"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-GV-003-01",
  framework: "nist-ai-rmf",
  cluster: "roles-responsibilities",
  article: "GOVERN 2.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "Roles and responsibilities for AI risk management are assigned",
  obligation: "OBL-NIST-AIRMF-GV-003",
  legalText:
    "GOVERN 2.1: Roles and responsibilities and organizational accountability for teams that design, develop, deploy, evaluate, and monitor AI systems are documented.",
  remediation:
    "Create docs/ai-rmf/ai-roles.yaml defining: roles, responsibilities, and accountable individuals for AI risk management.",
  check: doc("ai-roles")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("roles", "responsibilities")
    .requireAny("accountable_person", "accountablePerson", "ai_owner", "responsible_party"),
});

rule({
  id: "ASSERT-NIST-AIRMF-GV-004-01",
  framework: "nist-ai-rmf",
  cluster: "transparency-disclosure",
  article: "GOVERN 4.1",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "AI risk and benefits are communicated to relevant stakeholders",
  obligation: "OBL-NIST-AIRMF-GV-004",
  legalText:
    "GOVERN 4.1: Organizational teams are committed to a culture that considers and communicates AI risk and its potential impact on people. AI risk information is regularly communicated to relevant stakeholders.",
  remediation:
    "Document your AI risk communication plan: who is informed, how often, and through what channel.",
  check: doc("ai-risk-policy")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("communication_plan", "stakeholder_communication", "communicationPlan"),
});

rule({
  id: "ASSERT-NIST-AIRMF-GV-005-01",
  framework: "nist-ai-rmf",
  cluster: "security-robustness",
  article: "GOVERN 6.1",
  severity: MINOR,
  appliesTo: { actor: "provider" },
  title: "Third-party AI risk management policies are established",
  obligation: "OBL-NIST-AIRMF-GV-005",
  legalText:
    "GOVERN 6.1: Policies and procedures are in place to assess the provenance of AI models, data, and third-party components used by the organization.",
  remediation:
    "Add a `third_party_policy` or `supply_chain_risk` field to your AI risk policy or create a separate vendor risk document.",
  check: anyOf(
    doc("ai-risk-policy")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("third_party_policy", "supply_chain_risk", "vendor_risk"),
    doc("vendor-risk")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("third_party_policy", "supply_chain_risk", "provenance"),
  ),
});
