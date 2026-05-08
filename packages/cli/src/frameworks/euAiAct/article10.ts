import { anyOf, doc, modelCard, structured } from "../../core/check.js";
import type { SystemContext } from "../../core/context.js";
import { ComplianceError, SkipTest } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

const PROTECTED_CHARACTERISTICS = [
  "gender",
  "race",
  "age",
  "disability",
  "nationality",
  "religion",
  "ethnicity",
] as const;
const PATHS_DATA = ["docs/compliance/", "docs/data-governance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-EU-AI-ACT-010-001-01",
  framework: "eu-ai-act",
  article: "10.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Training data documentation exists",
  obligation: "OBL-EU-AI-ACT-010-001",
  legalText:
    'Article 10(1): "High-risk AI systems... shall be developed on the basis of training, validation and testing data sets that meet the quality criteria..."',
  remediation:
    "Create a data governance document in docs/compliance/ or docs/data-governance/, or include training data details in your model card.",
  check: anyOf(
    modelCard().requireAny("training_data", "dataset_info"),
    doc("data-governance")
      .inPaths(PATHS_DATA)
      .formats([...FMTS]),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-010-002-01",
  framework: "eu-ai-act",
  article: "10.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Bias examination is documented for training data",
  obligation: "OBL-EU-AI-ACT-010-002",
  legalText:
    'Article 10(2)(f): "examination in view of possible biases, that are likely to affect health and safety or lead to the violation of fundamental rights."',
  remediation: "Create docs/bias_assessment.yaml or docs/compliance/bias-examination.md.",
  check: anyOf(
    structured("bias_assessment"),
    doc("bias-examination")
      .inPaths(["docs/compliance/", "docs/"])
      .formats([...FMTS])
      .requireAny("bias_examination", "biasExamination"),
  ),
});

rule({
  id: "ASSERT-EU-AI-ACT-010-002-02",
  framework: "eu-ai-act",
  article: "10.2",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Bias assessment covers at least 3 protected characteristics",
  obligation: "OBL-EU-AI-ACT-010-002",
  legalText:
    "Article 10(2)(f): bias examination must cover characteristics that could affect fundamental rights.",
  remediation: `Include at least 3 of: ${PROTECTED_CHARACTERISTICS.join(", ")} in characteristics_evaluated.`,
  check: structured("bias_assessment")
    .requireAnyArray(
      "characteristics_evaluated",
      "characteristicsEvaluated",
      "protected_attributes",
    )
    .coversAtLeast(3, PROTECTED_CHARACTERISTICS),
});

rule({
  id: "ASSERT-EU-AI-ACT-010-003-01",
  framework: "eu-ai-act",
  article: "10.3",
  severity: MAJOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Data relevance and representativeness are justified",
  obligation: "OBL-EU-AI-ACT-010-003",
  legalText:
    'Article 10(3): "Training, validation and testing data sets shall be relevant, sufficiently representative..."',
  remediation:
    "Add `data_sources` and `representativeness` fields to your data governance document or model card.",
  check: anyOf(
    modelCard().require("dataset_info"),
    modelCard().requireAny("training_data").requireAny("metrics"),
    doc("data-governance")
      .inPaths(PATHS_DATA)
      .formats([...FMTS])
      .requireAny("data_sources", "dataSources")
      .require("representativeness"),
  ),
});

// Article 10.4 — conditional check (special category data): kept as fn
// If special_category_data is absent → SKIP; if present → require legal_basis
rule(
  {
    id: "ASSERT-EU-AI-ACT-010-004-01",
    framework: "eu-ai-act",
    article: "10.4",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Special category data handling is documented if applicable",
    obligation: "OBL-EU-AI-ACT-010-004",
    legalText:
      'Article 10(5): "...the providers of such systems may process special categories of personal data..."',
    remediation:
      "If your system processes special category data, add `special_category_legal_basis` field.",
  },
  async (system: SystemContext) => {
    const doc = await system.evidence.findDocument({
      category: "data-governance",
      paths: ["docs/compliance/", "docs/data-governance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc)
      throw new ComplianceError(
        "No data governance document found to check for special category data handling.",
      );

    const processesSpecial =
      doc.field("special_category_data").exists() ||
      doc.field("specialCategoryData").exists() ||
      doc.field("processes_sensitive_data").exists();

    if (!processesSpecial)
      throw new SkipTest("System does not process special category data — check not applicable.");

    if (
      !doc.hasField("special_category_legal_basis") &&
      !doc.hasField("specialCategoryLegalBasis")
    ) {
      throw new ComplianceError(
        "System processes special category data but no legal basis documented. Add `special_category_legal_basis` field.",
      );
    }
  },
);

rule({
  id: "ASSERT-EU-AI-ACT-010-005-01",
  framework: "eu-ai-act",
  article: "10.5",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Data minimisation principle is documented",
  obligation: "OBL-EU-AI-ACT-010-005",
  legalText: "Article 10(3): data sets must have appropriate statistical properties.",
  remediation: "Add a `data_minimisation` field to your data governance document.",
  check: doc("data-governance")
    .inPaths(PATHS_DATA)
    .formats([...FMTS])
    .requireAny("data_minimisation", "data_minimization"),
});

rule({
  id: "ASSERT-EU-AI-ACT-010-006-01",
  framework: "eu-ai-act",
  article: "10.6",
  severity: MINOR,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Data quality criteria are defined",
  obligation: "OBL-EU-AI-ACT-010-006",
  legalText:
    "Article 10(3): training, validation and testing data sets must meet quality criteria for their intended purpose.",
  remediation: "Add a `data_quality_criteria` field to your data governance document.",
  check: doc("data-governance")
    .inPaths(PATHS_DATA)
    .formats([...FMTS])
    .requireAny("data_quality_criteria", "dataQualityCriteria", "quality_criteria"),
});
