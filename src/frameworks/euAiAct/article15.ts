import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-001-01",
    framework: "eu-ai-act",
    article: "15.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Accuracy benchmarks are documented",
    obligation: "OBL-EU-AI-ACT-015-001",
    legalText:
      'Article 15(1): "High-risk AI systems shall be designed and developed in such a way that they achieve, in the light of their intended purpose, an appropriate level of accuracy, robustness and cybersecurity..."',
    remediation:
      "Add `metrics` to your model card or `performance_metrics` to your technical documentation.",
  },
  async (system) => {
    const modelCard = await system.evidence.loadModelCard();
    if (modelCard?.hasField("metrics") || modelCard?.hasField("model_performance")) return;

    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (
      doc?.hasField("performance_metrics") ||
      doc?.hasField("accuracy") ||
      doc?.hasField("metrics")
    ) {
      return;
    }

    throw new ComplianceError(
      "No accuracy benchmarks documented. " +
        "Add `metrics` to your model card or `performance_metrics` to your technical documentation.",
    );
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-002-01",
    framework: "eu-ai-act",
    article: "15.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Robustness testing is documented, including adversarial inputs",
    obligation: "OBL-EU-AI-ACT-015-002",
    legalText:
      "Article 15(3): AI systems shall be resilient against attempts to alter their use or performance by third parties exploiting vulnerabilities.",
    remediation:
      "Create a robustness testing document in docs/ or add robustness test results to your test results file.",
  },
  async (system) => {
    const testResults = await system.evidence.loadStructured("test_results");
    if (testResults) {
      const results = testResults.results as Array<Record<string, unknown>> | undefined;
      const hasRobustness = results?.some((r) =>
        String(r.category ?? "")
          .toLowerCase()
          .includes("robust"),
      );
      if (hasRobustness) return;
    }

    const doc = await system.evidence.findDocument({
      category: "robustness-testing",
      paths: ["docs/", "compliance/", "docs/compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No robustness testing documentation found. " +
          "Create docs/robustness-testing.md including adversarial input testing results.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-003-01",
    framework: "eu-ai-act",
    article: "15.3",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Cybersecurity measures are documented",
    obligation: "OBL-EU-AI-ACT-015-003",
    legalText:
      'Article 15(4): "High-risk AI systems shall be resilient as regards attempts by unauthorised third parties to alter their use, outputs or performance by exploiting the system\'s vulnerabilities."',
    remediation:
      "Create a security document in docs/security/ or a security config in config/security.yaml.",
  },
  async (system) => {
    const config = await system.evidence.loadConfig("security");
    if (config) return;

    const doc = await system.evidence.findDocument({
      category: "security",
      paths: ["docs/security/", "compliance/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No cybersecurity documentation found. " + "Create docs/security/ or config/security.yaml.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-003-02",
    framework: "eu-ai-act",
    article: "15.3",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Access control policy is documented",
    obligation: "OBL-EU-AI-ACT-015-003",
    legalText:
      "Article 15(4): systems must include technical measures to protect against unauthorised access.",
    remediation: "Add an `access_control` field to your security config or security documentation.",
  },
  async (system) => {
    const config = await system.evidence.loadConfig("security");
    if (config?.access_control || config?.accessControl) return;

    const doc = await system.evidence.findDocument({
      category: "security",
      paths: ["docs/security/", "compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc?.hasField("access_control") && !doc?.hasField("accessControl")) {
      throw new ComplianceError(
        "No access control policy documented. Add `access_control` to security config or documentation.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-004-01",
    framework: "eu-ai-act",
    article: "15.4",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Fallback plan for technical failures is documented",
    obligation: "OBL-EU-AI-ACT-015-004",
    legalText:
      "Article 15(3): AI systems must include fallback plans and fail-safe measures for when errors occur.",
    remediation:
      "Create a fallback-plan document in docs/ or add a `fallback_plan` field to your technical documentation.",
  },
  async (system) => {
    const techDoc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (techDoc?.hasField("fallback_plan") || techDoc?.hasField("failsafe")) return;

    const fallbackDoc = await system.evidence.findDocument({
      category: "fallback-plan",
      paths: ["docs/", "compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!fallbackDoc) {
      throw new ComplianceError(
        "No fallback plan documented. " +
          "Add a `fallback_plan` field to technical documentation or create a fallback-plan document.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-005-01",
    framework: "eu-ai-act",
    article: "15.5",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Accuracy is measured per relevant population groups (fairness metrics)",
    obligation: "OBL-EU-AI-ACT-015-005",
    legalText:
      "Article 15(1): accuracy levels must be declared in the instructions of use and the system must address relevant disaggregated metrics.",
    remediation:
      "Add per-group performance metrics to your bias assessment. Each group should have its own accuracy/performance entry.",
  },
  async (system) => {
    const biasReport = await system.evidence.loadStructured("bias_assessment");
    if (!biasReport) {
      throw new ComplianceError(
        "No bias_assessment found. Per-group accuracy metrics required for Article 15(5).",
      );
    }

    const groups =
      biasReport.group_metrics ?? biasReport.groupMetrics ?? biasReport.per_group_metrics;
    if (!groups || (Array.isArray(groups) && groups.length === 0)) {
      throw new ComplianceError(
        "Bias assessment missing per-group metrics. " +
          "Add `group_metrics` array with accuracy per population subgroup.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-015-006-01",
    framework: "eu-ai-act",
    article: "15.6",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Third-party security assessment is conducted or planned",
    obligation: "OBL-EU-AI-ACT-015-006",
    legalText:
      "Article 15 and recital 74: providers are encouraged to carry out security assessments.",
    remediation:
      "Add a `security_assessment` field to your security documentation or create a security_audit structured file.",
  },
  async (system) => {
    const audit = await system.evidence.loadStructured("security_audit");
    if (audit) return;

    const doc = await system.evidence.findDocument({
      category: "security",
      paths: ["docs/security/", "compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc?.hasField("security_assessment") && !doc?.hasField("third_party_audit")) {
      throw new ComplianceError(
        "No third-party security assessment documented. " +
          "Add `security_assessment` to security docs or create docs/security_audit.yaml.",
      );
    }
  },
);
