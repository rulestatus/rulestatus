import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

rule(
  {
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
      "Create a risk management document in docs/risk-management/ or compliance/. " +
      "It must include: system_name, identified_risks, mitigation_measures, review_date.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "risk-management",
      paths: ["docs/risk-management/", "compliance/", "docs/compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No risk management document found. Expected in docs/risk-management/ or compliance/",
      );
    }
    if (!doc.hasField("system_name") && !doc.hasField("systemName")) {
      throw new ComplianceError("Risk management document missing: system name");
    }
    if (!doc.hasField("identified_risks") && !doc.hasField("identifiedRisks")) {
      throw new ComplianceError("Risk management document missing: identified risks");
    }
    if (!doc.hasField("mitigation_measures") && !doc.hasField("mitigationMeasures")) {
      throw new ComplianceError("Risk management document missing: mitigation measures");
    }
    if (!doc.hasField("review_date") && !doc.hasField("reviewDate")) {
      throw new ComplianceError("Risk management document missing: review date");
    }
    const reviewDate = doc.field("review_date").exists()
      ? doc.field("review_date")
      : doc.field("reviewDate");
    if (!reviewDate.withinMonths(12)) {
      throw new ComplianceError(
        "Risk management document has not been reviewed in the last 12 months. " +
          `Last review: ${reviewDate}`,
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-009-001-02",
    framework: "eu-ai-act",
    article: "9.1",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Risk management document covers intended use cases",
    obligation: "OBL-EU-AI-ACT-009-001",
    legalText:
      "Article 9(1): risk management must be maintained in relation to the AI system's intended purpose.",
    remediation:
      "Add an `intended_use` or `use_cases` field to your risk management document describing the system's intended purpose.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "risk-management",
      paths: ["docs/risk-management/", "compliance/", "docs/compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No risk management document found.");
    }
    if (!doc.hasField("intended_use") && !doc.hasField("use_cases") && !doc.hasField("useCases")) {
      throw new ComplianceError(
        "Risk management document does not describe intended use cases. " +
          "Add an `intended_use` or `use_cases` field.",
      );
    }
  },
);

rule(
  {
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
      "Ensure your risk register contains at least one entry for each of: health, safety, fundamental_rights. " +
      "Add a `dimension` field to each risk entry with one of these values.",
  },
  async (system) => {
    const register = await system.evidence.loadStructured("risk_register");
    if (!register) {
      throw new ComplianceError(
        "No risk register found. Expected at docs/risk_register.json or docs/risk_register.yaml.",
      );
    }

    const risks = register.risks as Array<Record<string, unknown>> | undefined;
    if (!risks || risks.length === 0) {
      throw new ComplianceError("Risk register contains no risk entries.");
    }

    const dimensions = new Set(risks.map((r) => String(r.dimension ?? "")));
    const required = new Set(["health", "safety", "fundamental_rights"]);
    const missing = [...required].filter((d) => !dimensions.has(d));

    if (missing.length > 0) {
      throw new ComplianceError(
        `Risk register missing required dimensions: ${missing.join(", ")}. ` +
          "Article 9(2)(a) requires all three: health, safety, fundamental_rights.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-009-002-B-01",
    framework: "eu-ai-act",
    article: "9.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Risk register includes emerging risks and foreseeable misuse scenarios",
    obligation: "OBL-EU-AI-ACT-009-002-B",
    legalText:
      'Article 9(2)(b): "estimation and evaluation of the risks that may emerge when the high-risk AI system is used in accordance with its intended purpose and under conditions of reasonably foreseeable misuse."',
    remediation:
      "Add risk entries to your register with `source: emerging` or `category: misuse`. " +
      "Consider: distribution shift, adversarial inputs, unintended downstream use, feedback loops amplifying bias.",
  },
  async (system) => {
    const register = await system.evidence.loadStructured("risk_register");
    if (!register) {
      throw new ComplianceError("No risk register found.");
    }

    const risks = register.risks as Array<Record<string, unknown>> | undefined;
    if (!risks || risks.length === 0) {
      throw new ComplianceError("Risk register contains no risk entries.");
    }

    const hasEmerging = risks.some(
      (r) =>
        String(r.source ?? "").toLowerCase() === "emerging" ||
        String(r.category ?? "").toLowerCase() === "misuse",
    );

    if (!hasEmerging) {
      throw new ComplianceError(
        "Risk register has no emerging risk or misuse scenario entries. " +
          "Article 9(2)(b) requires analysis of risks that may emerge during use, including foreseeable misuse.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-009-003-01",
    framework: "eu-ai-act",
    article: "9.3",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Risk management is described as a continuous iterative process",
    obligation: "OBL-EU-AI-ACT-009-003",
    legalText:
      'Article 9(1): "The risk management system shall be understood as a continuous iterative process..."',
    remediation:
      "Add a `review_cycle` field to your risk management document (e.g. 'quarterly', 'continuous') " +
      "or include language indicating ongoing review.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "risk-management",
      paths: ["docs/risk-management/", "compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No risk management document found.");
    }
    if (!doc.hasField("review_cycle") && !doc.hasField("reviewCycle")) {
      throw new ComplianceError(
        "Risk management document does not specify a review cycle. " +
          "Add a `review_cycle` field (e.g. 'quarterly') to demonstrate continuous management.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-009-004-01",
    framework: "eu-ai-act",
    article: "9.4",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Testing procedures with representative data are documented",
    obligation: "OBL-EU-AI-ACT-009-004",
    legalText:
      'Article 9(4)(a): "testing of the high-risk AI system, to identify the most appropriate risk management measures... shall be performed on the basis of data relevant for the intended purpose."',
    remediation:
      "Create a test plan document in docs/ or compliance/ with a `representative_data` or `test_datasets` field. " +
      "Document how training/test data was selected to be representative.",
  },
  async (system) => {
    const testPlan = await system.evidence.loadStructured("test_plan");
    if (testPlan) {
      if (!testPlan.representative_data && !testPlan.testDatasets) {
        throw new ComplianceError(
          "Test plan found but missing representative data documentation. " +
            "Add `representative_data` field.",
        );
      }
      return;
    }

    const doc = await system.evidence.findDocument({
      category: "testing-procedures",
      paths: ["docs/", "compliance/", "docs/compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No testing procedures document found. Create a test plan with representative data documentation.",
      );
    }
    if (
      !doc.hasField("representative_data") &&
      !doc.hasField("test_datasets") &&
      !doc.hasField("testDatasets")
    ) {
      throw new ComplianceError(
        "Testing procedures document missing: representative data documentation.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-009-005-01",
    framework: "eu-ai-act",
    article: "9.5",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Residual risks are identified and documented",
    obligation: "OBL-EU-AI-ACT-009-005",
    legalText:
      'Article 9(2)(c): "evaluation of other possibly arising risks based on the analysis of data gathered from the post-market monitoring system."',
    remediation:
      "Add residual risk entries to your risk register with `status: residual` or a `residual_risk` field.",
  },
  async (system) => {
    const register = await system.evidence.loadStructured("risk_register");
    if (!register) {
      throw new ComplianceError("No risk register found.");
    }

    const risks = register.risks as Array<Record<string, unknown>> | undefined;
    if (!risks) return;

    const hasResidual = risks.some(
      (r) => String(r.status ?? "").toLowerCase() === "residual" || r.residual_risk != null,
    );

    if (!hasResidual) {
      throw new ComplianceError(
        "No residual risks documented. Add entries with `status: residual` or `residual_risk` field.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-009-008-01",
    framework: "eu-ai-act",
    article: "9.8",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Serious incident reporting procedure is documented",
    obligation: "OBL-EU-AI-ACT-009-008",
    legalText:
      "Article 9 + Article 73: providers must establish procedures for reporting serious incidents.",
    remediation:
      "Create an incident response procedure document in docs/ or config/incident_response.yaml " +
      "with fields for reporting_contact, escalation_timeline, and regulatory_authority.",
  },
  async (system) => {
    const config = await system.evidence.loadConfig("incident_response");
    if (config) return;

    const doc = await system.evidence.findDocument({
      category: "incident-response",
      paths: ["docs/", "compliance/", "docs/compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No serious incident reporting procedure found. " +
          "Create docs/incident-response.md or config/incident_response.yaml.",
      );
    }
  },
);
