import { anyOf, config, doc, modelCard, structured } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS_TECH = ["docs/technical/", "docs/compliance/", "docs/"];
const PATHS_SEC = ["docs/security/", "compliance/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-EU-AI-ACT-015-001-01",
  framework: "eu-ai-act",
  cluster: "performance-monitoring",
  article: "15.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Accuracy benchmarks are documented",
  obligation: "OBL-EU-AI-ACT-015-001",
  legalText:
    'Article 15(1): "High-risk AI systems shall be designed and developed in such a way that they achieve, in the light of their intended purpose, an appropriate level of accuracy, robustness and cybersecurity..."',
  remediation:
    "Add `metrics` to your model card or `performance_metrics` to your technical documentation.",
  check: anyOf(
    modelCard().requireAny("metrics", "model_performance"),
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("performance_metrics", "accuracy", "metrics"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-015-002-01",
  framework: "eu-ai-act",
  cluster: "security-robustness",
  article: "15.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Robustness testing is documented, including adversarial inputs",
  obligation: "OBL-EU-AI-ACT-015-002",
  legalText:
    "Article 15(3): AI systems shall be resilient against attempts to alter their use or performance by third parties exploiting vulnerabilities.",
  remediation:
    "Create a robustness testing document in docs/ or add robustness test results to your test results file.",
  check: anyOf(
    structured("test_results")
      .requireArray("results")
      .hasAnyEntry([{ category: { contains: "robust" } }]),
    doc("robustness-testing")
      .inPaths(["docs/", "compliance/", "docs/compliance/"])
      .formats([...FMTS]),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-015-003-01",
  framework: "eu-ai-act",
  cluster: "security-robustness",
  article: "15.3",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Cybersecurity measures are documented",
  obligation: "OBL-EU-AI-ACT-015-003",
  legalText:
    'Article 15(4): "High-risk AI systems shall be resilient as regards attempts by unauthorised third parties to alter their use, outputs or performance by exploiting the system\'s vulnerabilities."',
  remediation:
    "Create a security document in docs/security/ or a security config in config/security.yaml.",
  check: anyOf(
    config("security"),
    doc("security")
      .inPaths(PATHS_SEC)
      .formats([...FMTS]),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-015-003-02",
  framework: "eu-ai-act",
  cluster: "security-robustness",
  article: "15.3",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Access control policy is documented",
  obligation: "OBL-EU-AI-ACT-015-003",
  legalText:
    "Article 15(4): systems must include technical measures to protect against unauthorised access.",
  remediation: "Add an `access_control` field to your security config or security documentation.",
  check: anyOf(
    config("security").requireAny("access_control", "accessControl"),
    doc("security")
      .inPaths(["docs/security/", "compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("access_control", "accessControl"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-015-004-01",
  framework: "eu-ai-act",
  cluster: "security-robustness",
  article: "15.4",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Fallback plan for technical failures is documented",
  obligation: "OBL-EU-AI-ACT-015-004",
  legalText:
    "Article 15(3): AI systems must include fallback plans and fail-safe measures for when errors occur.",
  remediation:
    "Create a fallback-plan document in docs/ or add a `fallback_plan` field to your technical documentation.",
  check: anyOf(
    doc("technical-documentation")
      .inPaths(PATHS_TECH)
      .formats([...FMTS])
      .requireAny("fallback_plan", "failsafe"),
    doc("fallback-plan")
      .inPaths(["docs/", "compliance/"])
      .formats([...FMTS]),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-015-005-01",
  framework: "eu-ai-act",
  cluster: "bias-fairness",
  article: "15.5",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Accuracy is measured per relevant population groups (fairness metrics)",
  obligation: "OBL-EU-AI-ACT-015-005",
  legalText:
    "Article 15(1): accuracy levels must be declared in the instructions of use and the system must address relevant disaggregated metrics.",
  remediation:
    "Add per-group performance metrics to your bias assessment. Each group should have its own accuracy/performance entry.",
  check: structured("bias_assessment")
    .requireAnyArray("group_metrics", "groupMetrics", "per_group_metrics")
    .minLength(1),
});

rule({
  id: "ASSERT-EU-AI-ACT-015-006-01",
  framework: "eu-ai-act",
  cluster: "security-robustness",
  article: "15.6",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Third-party security assessment is conducted or planned",
  obligation: "OBL-EU-AI-ACT-015-006",
  legalText:
    "Article 15 and recital 74: providers are encouraged to carry out security assessments.",
  remediation:
    "Add a `security_assessment` field to your security documentation or create a security_audit structured file.",
  check: anyOf(
    structured("security_audit"),
    doc("security")
      .inPaths(["docs/security/", "compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("security_assessment", "third_party_audit"),
  ),
});
