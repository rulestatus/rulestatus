import { anyOf, config, doc, modelCard, structured } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS_DOCS = ["docs/compliance/", "docs/technical/", "docs/", "model/"];
const PATHS_INCIDENT = ["docs/compliance/", "docs/", "compliance/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-CO-SB24205-1702-001-01",
    framework: "colorado-sb24-205",
    cluster: "technical-documentation",
    article: "§6-1-1702",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "Model card documents intended use, limitations, and known discrimination risks",
    obligation: "OBL-CO-SB24205-1702-001",
    legalText:
      "§6-1-1702(2)(a): Developer shall make available to deployers documentation of the high-risk AI system's intended uses, limitations, and known or reasonably foreseeable risks of algorithmic discrimination.",
    remediation:
      "Add `intended_uses` (or `intendedUse`), `limitations`, and `known_risks` (or `discrimination_risks`) fields to your model card.",
    check: modelCard()
      .requireAny("intended_uses", "intendedUse", "intended_use")
      .requireAny("limitations", "known_limitations")
      .requireAny("known_risks", "discrimination_risks", "algorithmic_risks"),
  },

  {
    id: "ASSERT-CO-SB24205-1702-002-01",
    framework: "colorado-sb24-205",
    cluster: "training-data",
    article: "§6-1-1702",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "Dataset documentation covers data sources, governance, and potential biases",
    obligation: "OBL-CO-SB24205-1702-002",
    legalText:
      "§6-1-1702(2)(a): Developer shall make available documentation including data governance measures, the source of training data, and potential biases in the data.",
    remediation:
      "Create docs/technical/dataset-documentation.yaml with `data_sources`, `data_governance`, and `potential_biases` fields.",
    check: doc("dataset-documentation")
      .inPaths(["docs/technical/", "docs/compliance/", "model/", "docs/"])
      .formats([...FMTS])
      .requireAny("data_sources", "training_data", "dataSources")
      .requireAny("data_governance", "dataGovernance", "governance")
      .requireAny("potential_biases", "known_biases", "biases"),
  },

  {
    id: "ASSERT-CO-SB24205-1702-003-01",
    framework: "colorado-sb24-205",
    cluster: "bias-fairness",
    article: "§6-1-1702",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "Bias and algorithmic discrimination evaluation results are documented",
    obligation: "OBL-CO-SB24205-1702-003",
    legalText:
      "§6-1-1702(2)(a): Developer shall provide evaluation documentation and performance metrics, including results of bias testing.",
    remediation:
      "Add evaluation results to your bias assessment or create docs/compliance/bias-examination.yaml with `evaluation_results` and `test_results` fields.",
    check: anyOf(
      structured("bias_assessment").requireAny(
        "evaluation_results",
        "test_results",
        "group_metrics",
        "fairness_metrics",
      ),
      doc("bias-examination")
        .inPaths(["docs/compliance/", "docs/", "docs/technical/"])
        .formats([...FMTS])
        .requireAny("evaluation_results", "test_results", "bias_results"),
    ),
  },

  {
    id: "ASSERT-CO-SB24205-1702-004-01",
    framework: "colorado-sb24-205",
    cluster: "bias-fairness",
    article: "§6-1-1702",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "Discrimination risk mitigation measures are documented",
    obligation: "OBL-CO-SB24205-1702-004",
    legalText:
      "§6-1-1702(2)(a): Developer shall provide documentation of measures taken to mitigate known or reasonably foreseeable risks of algorithmic discrimination.",
    remediation:
      "Add `mitigation_measures` or `bias_mitigations` to your bias assessment or technical documentation.",
    check: anyOf(
      structured("bias_assessment").requireAny(
        "mitigation_measures",
        "mitigations",
        "bias_mitigations",
      ),
      doc("technical-documentation")
        .inPaths(PATHS_DOCS)
        .formats([...FMTS])
        .requireAny("discrimination_mitigation", "bias_mitigation", "mitigation_measures"),
    ),
  },

  {
    id: "ASSERT-CO-SB24205-1702-005-01",
    framework: "colorado-sb24-205",
    cluster: "transparency-disclosure",
    article: "§6-1-1702",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "Public statement on algorithmic discrimination risk management is documented",
    obligation: "OBL-CO-SB24205-1702-005",
    legalText:
      "§6-1-1702(2)(b): Developer shall publish a statement on its website summarizing the types of high-risk AI systems it develops and its governance and risk management approach.",
    remediation:
      "Create docs/compliance/discrimination-risk-statement.yaml with `high_risk_systems` and `discrimination_risk_management` fields. This statement must also be published on your public website.",
    check: doc("discrimination-risk-statement")
      .inPaths(["docs/compliance/", "docs/", "public/"])
      .formats([...FMTS])
      .requireAny("high_risk_systems", "highRiskSystems")
      .requireAny("discrimination_risk_management", "risk_management_approach"),
  },

  {
    id: "ASSERT-CO-SB24205-1702-006-01",
    framework: "colorado-sb24-205",
    cluster: "incident-response",
    article: "§6-1-1702",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "Incident reporting procedure for algorithmic discrimination is documented",
    obligation: "OBL-CO-SB24205-1702-006",
    legalText:
      "§6-1-1702(2)(c): Developer shall, within 90 days of discovering algorithmic discrimination, disclose to the Colorado Attorney General and all known deployers/developers.",
    remediation:
      "Add `discrimination_reporting` or `ag_notification` fields to your incident response config or document, including the 90-day notification timeline.",
    check: anyOf(
      config("incident_response").requireAny(
        "algorithmic_discrimination",
        "discrimination_reporting",
        "ag_notification",
      ),
      doc("incident-response")
        .inPaths(PATHS_INCIDENT)
        .formats([...FMTS])
        .requireAny(
          "discrimination_reporting",
          "ag_notification",
          "algorithmic_discrimination_reporting",
        ),
    ),
  },
];
