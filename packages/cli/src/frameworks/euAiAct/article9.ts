import { anyOf, config, doc, structured } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PATHS_RISK = ["docs/risk-management/", "compliance/", "docs/compliance/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-EU-AI-ACT-009-001-01",
  framework: "eu-ai-act",
  article: "9.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Risk management system documentation exists",
  obligation: "OBL-EU-AI-ACT-009-001",
  legalText:
    'Article 9(1): "A risk management system shall be established, implemented, documented and maintained in relation to high-risk AI systems."',
  remediation:
    "Create a risk management document in docs/risk-management/ or compliance/. Must include: system_name, identified_risks, mitigation_measures, review_date.",
  check: doc("risk-management")
    .inPaths(PATHS_RISK)
    .formats([...FMTS])
    .requireAny("system_name", "systemName")
    .requireAny("identified_risks", "identifiedRisks")
    .requireAny("mitigation_measures", "mitigationMeasures")
    .requireAny("review_date", "reviewDate")
    .withinMonths(12),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-001-02",
  framework: "eu-ai-act",
  article: "9.1",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Risk management document covers intended use cases",
  obligation: "OBL-EU-AI-ACT-009-001",
  legalText:
    "Article 9(1): risk management must be maintained in relation to the AI system's intended purpose.",
  remediation: "Add an `intended_use` or `use_cases` field to your risk management document.",
  check: doc("risk-management")
    .inPaths(PATHS_RISK)
    .formats([...FMTS])
    .requireAny("intended_use", "use_cases", "useCases"),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-002-A-01",
  framework: "eu-ai-act",
  article: "9.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Risk register covers health, safety, and fundamental rights dimensions",
  obligation: "OBL-EU-AI-ACT-009-002-A",
  legalText:
    'Article 9(2)(a): "identification and analysis of the known and the reasonably foreseeable risks to health, safety or the fundamental rights..."',
  remediation:
    "Add a `dimension` field to each risk entry. Required values: health, safety, fundamental_rights.",
  check: structured("risk_register")
    .withOutputPath("docs/risk_register.yaml")
    .requireArray("risks")
    .coversDimensions(["health", "safety", "fundamental_rights"]),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-002-B-01",
  framework: "eu-ai-act",
  article: "9.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Risk register includes emerging risks and foreseeable misuse scenarios",
  obligation: "OBL-EU-AI-ACT-009-002-B",
  legalText:
    'Article 9(2)(b): "estimation and evaluation of the risks that may emerge when the high-risk AI system is used in accordance with its intended purpose and under conditions of reasonably foreseeable misuse."',
  remediation: "Add risk entries with `source: emerging` or `category: misuse`.",
  check: structured("risk_register")
    .requireArray("risks")
    .hasAnyEntry([{ source: "emerging" }, { category: "misuse" }]),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-003-01",
  framework: "eu-ai-act",
  article: "9.3",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Risk management is described as a continuous iterative process",
  obligation: "OBL-EU-AI-ACT-009-003",
  legalText:
    'Article 9(1): "The risk management system shall be understood as a continuous iterative process..."',
  remediation: "Add a `review_cycle` field (e.g. 'quarterly') to your risk management document.",
  check: doc("risk-management")
    .inPaths(["docs/risk-management/", "compliance/"])
    .formats([...FMTS])
    .requireAny("review_cycle", "reviewCycle"),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-004-01",
  framework: "eu-ai-act",
  article: "9.4",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Testing procedures with representative data are documented",
  obligation: "OBL-EU-AI-ACT-009-004",
  legalText:
    'Article 9(4)(a): "testing of the high-risk AI system... shall be performed on the basis of data relevant for the intended purpose."',
  remediation: "Create a test plan document with `representative_data` field.",
  check: anyOf(
    structured("test_plan").requireAny("representative_data", "testDatasets"),
    doc("testing-procedures")
      .inPaths(["docs/", "compliance/", "docs/compliance/"])
      .formats([...FMTS])
      .requireAny("representative_data", "test_datasets", "testDatasets"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-005-01",
  framework: "eu-ai-act",
  article: "9.5",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Residual risks are identified and documented",
  obligation: "OBL-EU-AI-ACT-009-005",
  legalText:
    'Article 9(2)(c): "evaluation of other possibly arising risks based on the analysis of data gathered from the post-market monitoring system."',
  remediation: "Add residual risk entries with `status: residual` or a `residual_risk` field.",
  check: structured("risk_register")
    .requireArray("risks")
    .hasAnyEntry([{ status: "residual" }, { residual_risk: { exists: true } }]),
});

rule({
  id: "ASSERT-EU-AI-ACT-009-008-01",
  framework: "eu-ai-act",
  article: "9.8",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Serious incident reporting procedure is documented",
  obligation: "OBL-EU-AI-ACT-009-008",
  legalText:
    "Article 9 + Article 73: providers must establish procedures for reporting serious incidents.",
  remediation: "Create docs/incident-response.md or config/incident_response.yaml.",
  check: anyOf(
    config("incident_response"),
    doc("incident-response")
      .inPaths(["docs/", "compliance/", "docs/compliance/"])
      .formats([...FMTS]),
  ),
});
