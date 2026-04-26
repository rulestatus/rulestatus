import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as p from "@clack/prompts";
import { Command } from "commander";

interface Template {
  path: string;
  description: string;
  articles: string;
  content: string;
}

const TEMPLATES: Record<string, Template> = {
  "risk-register": {
    path: "docs/risk_register.yaml",
    description: "Risk register with identified risks",
    articles: "Art. 9.2",
    content: `# Risk Register — EU AI Act Article 9(2)(a)(b)(c)
# Each risk requires: id, dimension, source, description, severity, likelihood, mitigation, status
version: "1.0"
system: "TODO: Your AI system name"

risks:
  # Article 9(2)(a): must cover all three dimensions — health, safety, fundamental_rights
  - id: RISK-001
    dimension: health           # health | safety | fundamental_rights
    source: known               # known | emerging
    description: "TODO: Describe the risk to health (e.g. misclassification impacts on healthcare decisions)"
    severity: high              # low | medium | high | critical
    likelihood: medium          # low | medium | high
    mitigation: "TODO: Describe how this risk is mitigated"
    status: open                # open | mitigated | monitored | residual

  - id: RISK-002
    dimension: safety
    source: known
    description: "TODO: Describe the risk to safety"
    severity: high
    likelihood: medium
    mitigation: "TODO: Describe how this risk is mitigated"
    status: open

  - id: RISK-003
    dimension: fundamental_rights
    source: known
    description: "TODO: Describe the risk to fundamental rights (e.g. potential bias in automated decisions)"
    severity: high
    likelihood: medium
    mitigation: "TODO: Describe how this risk is mitigated"
    status: open

  # Article 9(2)(b): must include at least one emerging risk or foreseeable misuse scenario
  - id: RISK-004
    dimension: safety
    source: emerging            # source: emerging OR category: misuse satisfies this requirement
    category: misuse
    description: "TODO: Describe a foreseeable misuse scenario (e.g. use outside intended population)"
    severity: high
    likelihood: medium
    mitigation: "TODO: Describe safeguards against this misuse"
    status: open

  # Article 9(2)(c): at least one residual risk must be documented
  - id: RISK-005
    dimension: fundamental_rights
    source: emerging
    description: "TODO: Describe a risk that cannot be fully eliminated after mitigation"
    severity: medium
    likelihood: low
    mitigation: "TODO: Describe partial mitigation measures in place"
    status: residual            # status: residual required on at least one entry
    residual_risk: "TODO: Explain why this risk cannot be fully eliminated"
`,
  },

  "risk-management": {
    path: "docs/risk-management/risk-management.yaml",
    description: "Risk management system documentation",
    articles: "Art. 9.1–9.3",
    content: `# Risk Management System — EU AI Act Article 9(1)(2)(3)
# Must be reviewed within the last 12 months (review_date) and describe a continuous process (review_cycle)

# Article 9.1 — System identification
system_name: "TODO: Your AI system name"

# Article 9.1 — Intended use (satisfies 9.1 intended_use check)
intended_use: "TODO: Describe the intended use of this AI system"
use_cases:
  - "TODO: Specific use case 1"
  - "TODO: Specific use case 2"

# Article 9.1 — Identified risks (summary; see docs/risk_register.yaml for full register)
identified_risks:
  - "TODO: Risk category 1 — brief description"
  - "TODO: Risk category 2 — brief description"

# Article 9.1 — Mitigation measures
mitigation_measures:
  - "TODO: Mitigation measure 1"
  - "TODO: Mitigation measure 2"

# Article 9.1 — Review date (must be within last 12 months to pass ASSERT-EU-AI-ACT-009-001-01)
review_date: "TODO: YYYY-MM-DD"

# Article 9.3 — Continuous iterative process
review_cycle: quarterly       # quarterly | semi-annual | annual | continuous
`,
  },

  "model-card": {
    path: "model/model_card.yaml",
    description: "Model card with training data and architecture",
    articles: "Art. 10, 11",
    content: `# Model Card — EU AI Act Articles 10, 11
# Satisfies: training data documentation (10.1), representativeness (10.3),
#             model architecture (11.1), performance metrics (11.1)

model_type: "TODO: e.g. XGBoost classifier | Neural network | Transformer"
model_name: "TODO: Your model name"
version: "1.0"                  # Article 11.1: version required
date: "TODO: YYYY-MM-DD"        # Article 11.1: date required
provider: "TODO: Organisation name and registered address"

intended_use: "TODO: Describe the intended purpose of this AI system"

limitations:
  - "TODO: Known limitation 1 (e.g. geographic scope)"
  - "TODO: Known limitation 2 (e.g. population coverage, edge cases)"

# Article 10.1 — Training data documentation
training_data:
  sources:
    - "TODO: Dataset 1 — name, origin, size, time period"
    - "TODO: Dataset 2 — name, origin, size, time period"
  size: "TODO: e.g. 1M records"
  time_period: "TODO: e.g. 2020–2024"

# Article 10.3 — Representativeness
dataset_info:
  representativeness: "TODO: Explain how training data is representative of the intended deployment population"
  special_category_data: false  # TODO: true if processing health, biometric, political opinions etc.

# Article 11.1 — Performance metrics
metrics:
  precision: 0.0    # TODO: fill in
  recall: 0.0       # TODO: fill in
  f1: 0.0           # TODO: fill in
  auc_roc: 0.0      # TODO: fill in if applicable

model_performance:
  benchmark: "TODO: Name of evaluation benchmark or held-out dataset"
  accuracy: 0.0     # TODO: fill in

# Article 11.1 — Model architecture
model_architecture: "TODO: Describe model architecture and key design decisions"

# Article 11.2 — Applicable standards
standards:
  - "TODO: e.g. ISO/IEC 42001:2023"
`,
  },

  "data-governance": {
    path: "docs/compliance/data-governance.yaml",
    description: "Data governance documentation",
    articles: "Art. 10",
    content: `# Data Governance — EU AI Act Article 10
# Satisfies: 10.1 training data, 10.2 bias examination, 10.3 data sources + representativeness,
#             10.4 special category data, 10.5 data minimisation, 10.6 data quality criteria

# Article 10.1 — Training data documentation
training_data:
  description: "TODO: Describe training datasets used"
  sources: []  # TODO: list data sources

# Article 10.2 — Bias examination (see also docs/bias_assessment.yaml for full report)
bias_examination: "TODO: Describe the bias examination methodology and summary findings for this dataset"

# Article 10.3 — Data sources
data_sources:
  - name: "TODO: Dataset name"
    origin: "TODO: Where this data comes from"
    size: "TODO: Size of dataset"
    collection_period: "TODO: When data was collected"

# Article 10.3 — Representativeness
representativeness: "TODO: Explain how the data is representative of the intended deployment population"

# Article 10.4 — Special category data
special_category_data: false  # TODO: set true if processing health, biometric, political opinions etc.
# special_category_legal_basis: "TODO: Legal basis (GDPR Art. 9) if special_category_data is true"

# Article 10.5 — Data minimisation
data_minimisation: "TODO: Explain how data collection is limited to what is strictly necessary for the purpose"

# Article 10.6 — Data quality criteria
data_quality_criteria:
  - "TODO: Criterion 1 — e.g. No missing values in key fields"
  - "TODO: Criterion 2 — e.g. Labels verified by domain experts"
  - "TODO: Criterion 3 — e.g. Balanced class distribution within ±5%"
`,
  },

  "bias-assessment": {
    path: "docs/bias_assessment.yaml",
    description: "Bias examination report",
    articles: "Art. 10.2",
    content: `# Bias Assessment — EU AI Act Article 10(2)(f)
# Article 10(2)(f): examination of biases likely to affect health/safety or fundamental rights
# Minimum 3 protected characteristics required (ASSERT-EU-AI-ACT-010-002-02)

system: "TODO: AI system name"
assessment_date: "TODO: YYYY-MM-DD"
assessor: "TODO: Name or team responsible for assessment"

# Minimum 3 characteristics required; include all that are applicable
characteristics_evaluated:
  - gender
  - race
  - age
  - disability        # TODO: remove any that are not applicable
  - nationality       # TODO: add others: religion, ethnicity, sexual_orientation, socioeconomic_status

methodology: "TODO: Describe how bias was measured (e.g. equalised odds, demographic parity, disparate impact)"

findings:
  - characteristic: gender
    metric: "TODO: e.g. Equal opportunity difference"
    value: 0.0          # TODO: measured value
    threshold: 0.05     # TODO: acceptable threshold for your use case
    status: "TODO: pass | fail | under investigation"
    notes: "TODO: Any notes or caveats on this finding"

mitigation_measures:
  - "TODO: Describe any corrective measures applied (e.g. re-weighting, fairness constraints, data augmentation)"

next_review_date: "TODO: YYYY-MM-DD"
`,
  },

  "technical-doc": {
    path: "docs/compliance/technical-documentation.yaml",
    description: "Technical documentation (Annex IV)",
    articles: "Art. 11",
    content: `# Technical Documentation — EU AI Act Article 11 + Annex IV
# Minimum 10 of 15 Annex IV sections required (ASSERT-EU-AI-ACT-011-001-02)
# All 15 are included here — fill in what applies and remove nothing

system_name: "TODO: Your AI system name"
version: "1.0"                  # Article 11.1: version required
date: "TODO: YYYY-MM-DD"        # Article 11.1: date required

# Annex IV 1(a) — General description
general_description: "TODO: High-level description of the AI system, its purpose, and how it works"

# Annex IV 1(b) — Intended purpose
intended_purpose: "TODO: Specific intended purpose as defined by the provider"

# Annex IV 1(c) — Development process
development_process: "TODO: Describe development process, team composition, and validation approach"

# Annex IV 1(d) — Training methodology
training_methodology: "TODO: Describe training approach, algorithms, and hyperparameter choices"

# Annex IV 2(f) — Performance metrics
performance_metrics:
  precision: 0.0    # TODO: fill in
  recall: 0.0       # TODO: fill in
  accuracy: 0.0     # TODO: fill in
  # Add any other metrics relevant to your system

# Annex IV 2(g) — Monitoring
monitoring: "TODO: Describe how the system is monitored in production (drift detection, accuracy tracking, anomaly alerts)"

# Annex IV 2(h) — Robustness
robustness:
  adversarial_testing: "TODO: Describe adversarial testing approach and cadence"
  distribution_shift: "TODO: How distribution shift is detected and handled"

# Annex IV 2(i) — Accuracy
accuracy: 0.0       # TODO: top-level accuracy metric

# Annex IV 2(j) — Cybersecurity
cybersecurity:
  pen_testing: "TODO: Describe penetration testing cadence (e.g. annual third-party)"
  access_control: "TODO: Describe access control measures for model endpoints"

# Annex IV 2(k) — Human oversight
human_oversight: "TODO: Describe human oversight mechanisms — when, who, and how humans intervene"

# Annex IV 3 — Limitations
limitations:
  - "TODO: Known limitation 1"
  - "TODO: Known limitation 2"

# Annex IV 4 — Applicable standards
standards:
  - "TODO: e.g. ISO/IEC 42001:2023"

# Annex IV 5 — Post-market monitoring
post_market: "TODO: Describe post-market surveillance plan (monitoring cadence, KPIs, incident thresholds)"

# Annex IV 6 — Changes
changes: "TODO: Summary of significant changes from previous version, or 'Initial version'"

# Annex IV 7 — Compliance declaration
compliance_declaration: "TODO: Statement that this system has been assessed against applicable EU AI Act requirements"

# Article 11.1 — Model architecture (also satisfies Art. 11 model architecture check)
model_architecture: "TODO: Describe model type, architecture, and key design decisions"

# Article 13 — Capabilities (for deployer disclosure)
capabilities: "TODO: Describe what the system can do and its performance envelope"
`,
  },

  "transparency-config": {
    path: "config/transparency.yaml",
    description: "Transparency and AI disclosure configuration",
    articles: "Art. 13.1, 13.4",
    content: `# Transparency Configuration — EU AI Act Article 13
# Article 13(1): operation must be sufficiently transparent; AI-generated content must be disclosed

# Article 13.1 — AI disclosure (ASSERT-EU-AI-ACT-013-001-01 requires enabled: true)
ai_disclosure:
  enabled: true         # Must be true; set false only if disclosure is handled via API headers instead
  mechanism: "TODO: Describe how users are informed output is AI-generated (e.g. UI label, API header)"

# Article 13.4 — Provider contact information
provider_contact:
  name: "TODO: Organisation legal name"
  address: "TODO: Registered address"
  email: "TODO: compliance@yourcompany.com"
  eu_representative: "TODO: Name of EU authorised representative (required if provider is outside EU)"
`,
  },

  "instructions-for-use": {
    path: "docs/compliance/instructions-for-use.yaml",
    description: "Instructions for use for deployers",
    articles: "Art. 13.2–13.4",
    content: `# Instructions for Use — EU AI Act Article 13(2)(3)
# Must include: intended_purpose, known_limitations, performance_metrics, provider_contact

system_name: "TODO: Your AI system name"
version: "1.0"

# Article 13.2 — Intended purpose
intended_purpose: "TODO: Describe the intended purpose and approved deployment context"

# Article 13.3 — Capabilities and limitations
capabilities: "TODO: Describe what the system can do and its performance envelope"

known_limitations:
  - "TODO: Limitation 1 (e.g. geographic scope)"
  - "TODO: Limitation 2 (e.g. population coverage, conditions where model should not be used)"

# Article 13.2 — Performance characteristics
performance_metrics:
  accuracy: "TODO: e.g. 98.4%"
  precision: "TODO: e.g. 98.2%"
  recall: "TODO: e.g. 96.4%"

# Article 13.4 — Provider contact
provider_contact:
  name: "TODO: Organisation legal name"
  address: "TODO: Registered address"
  email: "TODO: compliance@yourcompany.com"

# Human oversight requirements for deployers
human_oversight_requirements: "TODO: Describe when and how deployers must ensure human review of outputs"

# Deployer support
deployer_support: "TODO: How deployers can report issues or request help"
`,
  },
};

const TEMPLATE_NAMES = Object.keys(TEMPLATES);

export function cmdGenerate(): Command {
  return new Command("generate")
    .description("Generate compliance artifact templates")
    .argument("[template]", `Template to generate. One of: ${TEMPLATE_NAMES.join(", ")}`)
    .option("--output <path>", "Override default output path")
    .option("--all", "Generate all templates")
    .addHelpText(
      "after",
      `\nAvailable templates:\n${Object.entries(TEMPLATES)
        .map(
          ([name, t]) =>
            `  ${name.padEnd(22)} ${t.articles.padEnd(14)} ${t.description}  →  ${t.path}`,
        )
        .join("\n")}`,
    )
    .action(async (template: string | undefined, opts: { output?: string; all?: boolean }) => {
      if (opts.all) {
        await generateAll();
        return;
      }

      if (!template) {
        p.intro("rulestatus generate — compliance artifact templates");
        const choice = await p.select({
          message: "Which template would you like to generate?",
          options: [
            ...TEMPLATE_NAMES.map((name) => ({
              value: name,
              label: name,
              hint: `${TEMPLATES[name].articles} — ${TEMPLATES[name].description}`,
            })),
            { value: "__all__", label: "all", hint: "Generate all templates at once" },
          ],
        });

        if (p.isCancel(choice)) {
          p.outro("Aborted.");
          process.exit(0);
        }

        if (choice === "__all__") {
          await generateAll();
          return;
        }

        await generateOne(choice as string, undefined);
        return;
      }

      if (!TEMPLATES[template]) {
        console.error(
          `Unknown template: "${template}"\nAvailable: ${TEMPLATE_NAMES.join(", ")}`,
        );
        process.exit(1);
      }

      await generateOne(template, opts.output);
    });
}

async function generateOne(name: string, outputOverride: string | undefined): Promise<void> {
  const tmpl = TEMPLATES[name];
  if (!tmpl) return;

  const outPath = outputOverride ?? tmpl.path;

  if (existsSync(outPath)) {
    const overwrite = await p.confirm({
      message: `${outPath} already exists. Overwrite?`,
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      console.log(`Skipped ${outPath}`);
      return;
    }
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, tmpl.content, "utf-8");
  p.outro(`Created ${outPath}  (${tmpl.articles})`);
}

async function generateAll(): Promise<void> {
  p.intro("Generating all compliance artifact templates…");
  const created: string[] = [];
  const skipped: string[] = [];

  for (const [name, tmpl] of Object.entries(TEMPLATES)) {
    if (existsSync(tmpl.path)) {
      const overwrite = await p.confirm({
        message: `${tmpl.path} already exists. Overwrite?`,
        initialValue: false,
      });
      if (p.isCancel(overwrite) || !overwrite) {
        skipped.push(tmpl.path);
        continue;
      }
    }

    mkdirSync(dirname(tmpl.path), { recursive: true });
    writeFileSync(tmpl.path, tmpl.content, "utf-8");
    created.push(tmpl.path);
    console.log(`  ✓ ${tmpl.path}`);
    void name;
  }

  const summary = [
    created.length > 0 ? `Created ${created.length} template(s).` : "",
    skipped.length > 0 ? `Skipped ${skipped.length} existing file(s).` : "",
  ]
    .filter(Boolean)
    .join(" ");

  p.outro(`${summary}\nFill in every TODO field, then run: rulestatus run`);
}
