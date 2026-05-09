import { anyOf, doc } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/ai-rmf/", "docs/compliance/", "docs/"];
const PATHS_TECH = ["docs/technical/", "docs/ai-rmf/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-NIST-AIRMF-MP-001-01",
  framework: "nist-ai-rmf",
  cluster: "technical-documentation",
  article: "MAP 1.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "AI system context, intended use, and deployment environment are documented",
  obligation: "OBL-NIST-AIRMF-MP-001",
  legalText:
    "MAP 1.1: Context is established for the AI risk assessment. Factors affecting the intended use and deployment context of the AI system are documented.",
  remediation:
    "Create docs/ai-rmf/system-context.yaml with: intended_use, deployment_context, affected_populations, known_use_cases.",
  check: anyOf(
    doc("system-context")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("intended_use", "intendedUse")
      .requireAny("deployment_context", "deploymentContext", "deployment_environment"),
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("intended_purpose", "intended_use")
      .requireAny("deployment_context", "deployment_environment", "operating_context"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-MP-002-01",
  framework: "nist-ai-rmf",
  cluster: "ai-risk-management",
  article: "MAP 2.2",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "External factors and dependencies affecting AI risk are documented",
  obligation: "OBL-NIST-AIRMF-MP-002",
  legalText:
    "MAP 2.2: Scientific findings, context, and external factors that may affect AI risk and the organization's ability to manage it are documented.",
  remediation:
    "Add `external_factors` or `dependencies` to your system context or risk assessment document.",
  check: anyOf(
    doc("system-context")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("external_factors", "dependencies", "externalFactors"),
    doc("ai-risk-assessment")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("external_factors", "dependencies", "context_factors"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-MP-003-01",
  framework: "nist-ai-rmf",
  cluster: "technical-documentation",
  article: "MAP 3.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "AI system tasks, capabilities, and limitations are documented",
  obligation: "OBL-NIST-AIRMF-MP-003",
  legalText:
    "MAP 3.1: AI tasks and the capabilities and limitations of AI systems are documented. Known limitations are communicated to relevant AI actors.",
  remediation:
    "Add `capabilities` and `limitations` fields to your technical documentation or system context document.",
  check: anyOf(
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("capabilities", "limitations"),
    doc("system-context")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("capabilities", "limitations"),
  ),
});

rule({
  id: "ASSERT-NIST-AIRMF-MP-004-01",
  framework: "nist-ai-rmf",
  cluster: "ai-risk-management",
  article: "MAP 5.1",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Likelihood and impact of AI risks are assessed",
  obligation: "OBL-NIST-AIRMF-MP-004",
  legalText:
    "MAP 5.1: Likelihood and impact of AI risks are assessed for each identified risk. Risk levels reflect the combination of likelihood and impact.",
  remediation:
    "Ensure each risk entry in your risk assessment includes `likelihood`, `impact`, and `risk_level` fields.",
  check: doc("ai-risk-assessment")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("likelihood", "risk_level", "riskLevel")
    .requireAny("impact", "severity"),
});
