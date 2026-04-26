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
];

rule(
  {
    id: "ASSERT-EU-AI-ACT-010-001-01",
    framework: "eu-ai-act",
    article: "10.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Training data documentation exists",
    obligation: "OBL-EU-AI-ACT-010-001",
    legalText:
      'Article 10(1): "High-risk AI systems... shall be developed on the basis of training, validation and testing data sets that meet the quality criteria referred to in paragraphs 2 to 5."',
    remediation:
      "Create a data governance document in docs/compliance/ or docs/data-governance/. " +
      "Alternatively, include data documentation in your model card.",
  },
  async (system) => {
    const modelCard = await system.evidence.loadModelCard();
    if (modelCard?.hasField("training_data") || modelCard?.hasField("dataset_info")) return;

    const doc = await system.evidence.findDocument({
      category: "data-governance",
      paths: ["docs/compliance/", "docs/data-governance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No training data documentation found. " +
          "Create a data governance document or include training data details in your model card.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-010-002-01",
    framework: "eu-ai-act",
    article: "10.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Bias examination is documented for training data",
    obligation: "OBL-EU-AI-ACT-010-002",
    legalText:
      'Article 10(2)(f): "examination in view of possible biases, that are likely to affect health and safety or lead to the violation of fundamental rights."',
    remediation:
      "Create a bias assessment report at docs/bias_assessment.yaml or docs/compliance/bias-examination.md.",
  },
  async (system) => {
    const biasReport = await system.evidence.loadStructured("bias_assessment");
    if (biasReport) return;

    const doc = await system.evidence.findDocument({
      category: "bias-examination",
      paths: ["docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No bias examination documented. Article 10(2)(f) requires examination of possible biases in training data.",
      );
    }
    if (!doc.hasField("bias_examination") && !doc.hasField("biasExamination")) {
      throw new ComplianceError(
        "Data governance document found but missing bias_examination field.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-010-002-02",
    framework: "eu-ai-act",
    article: "10.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Bias assessment covers at least 3 protected characteristics",
    obligation: "OBL-EU-AI-ACT-010-002",
    legalText:
      "Article 10(2)(f): bias examination must cover characteristics that could affect fundamental rights.",
    remediation:
      "Ensure your bias assessment covers protected characteristics. " +
      `Include at least 3 of: ${PROTECTED_CHARACTERISTICS.join(", ")}.`,
  },
  async (system) => {
    const biasReport = await system.evidence.loadStructured("bias_assessment");
    if (!biasReport) {
      throw new ComplianceError("No bias_assessment document found.");
    }

    const characteristics =
      biasReport.characteristics_evaluated ??
      biasReport.characteristicsEvaluated ??
      biasReport.protected_attributes;

    if (!Array.isArray(characteristics) || characteristics.length === 0) {
      throw new ComplianceError(
        "Bias assessment missing `characteristics_evaluated` field. " +
          "List the protected characteristics assessed for bias.",
      );
    }

    const covered = (characteristics as string[]).map((c) => String(c).toLowerCase());
    const matched = PROTECTED_CHARACTERISTICS.filter((pc) => covered.some((c) => c.includes(pc)));

    if (matched.length < 3) {
      throw new ComplianceError(
        `Bias assessment covers only ${matched.length} protected characteristics (need ≥ 3): ${matched.join(", ") || "none"}. ` +
          `Consider adding: ${PROTECTED_CHARACTERISTICS.filter((p) => !matched.includes(p))
            .slice(0, 3)
            .join(", ")}.`,
      );
    }
  },
);

rule(
  {
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
  },
  async (system) => {
    const modelCard = await system.evidence.loadModelCard();
    if (
      modelCard?.hasField("dataset_info") ||
      (modelCard?.hasField("training_data") && modelCard?.hasField("metrics"))
    ) {
      return;
    }

    const doc = await system.evidence.findDocument({
      category: "data-governance",
      paths: ["docs/compliance/", "docs/data-governance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No data governance document found.");
    }
    if (!doc.hasField("data_sources") && !doc.hasField("dataSources")) {
      throw new ComplianceError("Data governance document missing: data_sources");
    }
    if (!doc.hasField("representativeness")) {
      throw new ComplianceError(
        "Data governance document missing: representativeness justification",
      );
    }
  },
);

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
      'Article 10(5): "To the extent that it is strictly necessary for the purposes of ensuring bias monitoring, detection and correction in relation to the high-risk AI systems, the providers of such systems may process special categories of personal data..."',
    remediation:
      "If your system processes special category data (health, biometric, political opinions, etc.), " +
      "add a `special_category_data` field to your data governance document describing the processing basis.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "data-governance",
      paths: ["docs/compliance/", "docs/data-governance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No data governance document found to check for special category data handling.",
      );
    }

    // This check only applies if the system processes special category data
    const processesSpecial =
      doc.field("special_category_data").exists() ||
      doc.field("specialCategoryData").exists() ||
      doc.field("processes_sensitive_data").exists();

    if (!processesSpecial) {
      // System doesn't process special category data — skip
      throw new SkipTest("System does not process special category data — check not applicable.");
    }

    if (
      !doc.hasField("special_category_legal_basis") &&
      !doc.hasField("specialCategoryLegalBasis")
    ) {
      throw new ComplianceError(
        "System processes special category data but no legal basis documented. " +
          "Add `special_category_legal_basis` field.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-010-005-01",
    framework: "eu-ai-act",
    article: "10.5",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Data minimisation principle is documented",
    obligation: "OBL-EU-AI-ACT-010-005",
    legalText:
      "Article 10(3): data sets must be free of errors and complete, and have appropriate statistical properties.",
    remediation:
      "Add a `data_minimisation` field to your data governance document explaining how data collection is limited to what is necessary.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "data-governance",
      paths: ["docs/compliance/", "docs/data-governance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No data governance document found.");
    }
    if (!doc.hasField("data_minimisation") && !doc.hasField("data_minimization")) {
      throw new ComplianceError(
        "Data governance document missing: data minimisation documentation.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-010-006-01",
    framework: "eu-ai-act",
    article: "10.6",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Data quality criteria are defined",
    obligation: "OBL-EU-AI-ACT-010-006",
    legalText:
      "Article 10(3): training, validation and testing data sets must meet quality criteria for their intended purpose.",
    remediation:
      "Add a `data_quality_criteria` field to your data governance document specifying the criteria used to assess data quality.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "data-governance",
      paths: ["docs/compliance/", "docs/data-governance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No data governance document found.");
    }
    if (
      !doc.hasField("data_quality_criteria") &&
      !doc.hasField("dataQualityCriteria") &&
      !doc.hasField("quality_criteria")
    ) {
      throw new ComplianceError(
        "Data governance document missing: data quality criteria definition.",
      );
    }
  },
);
