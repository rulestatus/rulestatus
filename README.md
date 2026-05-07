# Rulestatus

**ESLint for AI law.** Run `rulestatus run` in CI and get a pass/fail evidence readiness report against the EU AI Act before you deploy.

```
  Rulestatus v1.0 — EU AI Act (2024/1689)
  System: Acme Fraud Detection Model v2.1
  Actor: provider | Risk level: high-risk
  ──────────────────────────────────────────────────

  Art. 9 - Risk Management
    PASS   ASSERT-EU-AI-ACT-009-001-01   Risk management system documentation exists
    FAIL   ASSERT-EU-AI-ACT-009-002-B-01  Risk register includes emerging risks
      -> No risk entries with source: emerging or category: misuse found.

  Art. 10 - Data Governance
    PASS   ASSERT-EU-AI-ACT-010-002-01   Bias examination documented
    FAIL   ASSERT-EU-AI-ACT-010-002-02   Bias assessment covers ≥3 protected characteristics
      -> Bias assessment covers 1 characteristic (need ≥ 3).

  ──────────────────────────────────────────────────
  Results: 28 passed | 12 gaps | 2 warnings | 1 manual
  Critical evidence gaps: 4 — pipeline BLOCKED
  Note: evidence present ≠ legally compliant. Not legal advice or a conformity assessment.
```

> **Disclaimer:** Rulestatus checks whether required documentation and configuration is present and correctly structured. Evidence present does not constitute a legal determination of compliance with the EU AI Act. Conformity assessment for high-risk AI systems under Article 43 may require evaluation by a notified body. Treat reports as due diligence documentation, not compliance certificates.

---

## Install

```bash
# Requires Bun ≥ 1.1
bun install -g rulestatus
```

---

## Quick start

```bash
# 1. Create .rulestatus.yaml in your project root
rulestatus init

# 2. Generate compliance artifact templates (fills docs/ and config/)
rulestatus generate --all

# 3. Fill in every TODO field in the generated files, then run
rulestatus run

# 4. Drill into any gap
rulestatus explain ASSERT-EU-AI-ACT-009-002-B-01
```

After `init` and `generate --all`, your project will have the full document structure the EU AI Act requires. Fill in the TODOs and `rulestatus run` will turn green.

---

## Commands

| Command | Description |
|---|---|
| `rulestatus init` | Interactive setup — creates `.rulestatus.yaml` |
| `rulestatus generate [template]` | Generate a compliance artifact template |
| `rulestatus generate --all` | Generate all 8 templates at once |
| `rulestatus run` | Run all evidence checks |
| `rulestatus run --article 9` | Run checks for a specific article |
| `rulestatus run --severity critical` | Run only critical checks |
| `rulestatus run --format pdf` | Output a PDF evidence readiness report |
| `rulestatus explain <ASSERT-ID>` | Show legal basis, last run result, and fix guidance |
| `rulestatus export-registry` | Generate obligation + assertion YAML registry from rule definitions |

### Templates

| Template | Article | Output path |
|---|---|---|
| `risk-register` | Art. 9.2 | `docs/risk_register.yaml` |
| `risk-management` | Art. 9.1–9.3 | `docs/risk-management/risk-management.yaml` |
| `model-card` | Art. 10, 11 | `model/model_card.yaml` |
| `data-governance` | Art. 10 | `docs/compliance/data-governance.yaml` |
| `bias-assessment` | Art. 10.2 | `docs/bias_assessment.yaml` |
| `technical-doc` | Art. 11 | `docs/compliance/technical-documentation.yaml` |
| `transparency-config` | Art. 13.1 | `config/transparency.yaml` |
| `instructions-for-use` | Art. 13.2–13.4 | `docs/compliance/instructions-for-use.yaml` |

---

## GitHub Actions

```yaml
# .github/workflows/compliance.yml
name: AI Compliance Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Rulestatus
        uses: rulestatus/action@v1
        with:
          frameworks: eu-ai-act
          severity-gate: critical
          report-format: sarif

      - name: Upload to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: compliance-reports/eu-ai-act-${{ github.run_id }}.sarif
```

Evidence gaps appear as annotations directly on pull requests.

---

## Configuration

```yaml
# .rulestatus.yaml

system:
  name: "Acme Fraud Detection Model v2.1"
  actor: provider               # provider | deployer | importer | distributor
  risk_level: high-risk         # prohibited | high-risk | limited-risk | minimal-risk
  domain: financial-services
  intended_use: "Automated fraud detection for credit card transactions"

frameworks:
  - eu-ai-act

evidence:
  docs_path: ./docs/compliance/
  model_card: ./model/model_card.yaml
  risk_register: ./docs/risk_register.yaml
  config_path: ./config/

reporting:
  format: [console]             # console | json | sarif | junit | pdf | badge
  output_dir: ./compliance-reports/

severity_gate:
  fail_on: critical             # exit code 1 if any critical gap found
  warn_on: major
```

---

## What's checked

Add `iso-42001` to `frameworks` in `.rulestatus.yaml` to run ISO 42001 checks alongside EU AI Act:

```yaml
frameworks:
  - eu-ai-act
  - iso-42001
```



**EU AI Act** — 43 assertions for high-risk AI providers (Articles 6, 9, 10, 11, 13, 14, 15):

**ISO/IEC 42001:2023** — 19 assertions for AI Management System providers (Clauses 4–10):

| Clause | Checks |
|---|---|
| **Cl. 4** | AIMS scope, organizational context, interested parties |
| **Cl. 5** | AI policy (purpose, commitments, approval), roles and responsibilities |
| **Cl. 6** | AIMS-level risks and opportunities, measurable AI objectives |
| **Cl. 7** | Competence requirements, awareness program, document control |
| **Cl. 8** | AI risk assessment, AI impact assessment, lifecycle stages, operational controls |
| **Cl. 9** | Monitoring and measurement, internal audit program, management review |
| **Cl. 10** | Corrective action procedure, continual improvement plan |

---

## EU AI Act — what's checked

EU AI Act obligations for **high-risk AI providers** (Articles 6, 9, 10, 11, 13, 14, 15). 43 assertions covering:

| Article | Checks |
|---|---|
| **Art. 6** | Risk level classification, Annex III category, prohibited use documentation |
| **Art. 9** | Risk management system, risk register (health/safety/rights dimensions, emerging risks, residual risks), testing procedures, incident reporting |
| **Art. 10** | Training data documentation, bias examination (≥3 protected characteristics), data representativeness, data minimisation, quality criteria |
| **Art. 11** | Technical documentation (all 15 Annex IV sections), model architecture, performance metrics, versioning, applicable standards |
| **Art. 13** | AI disclosure, instructions for use (intended purpose, limitations, performance), provider contact |
| **Art. 14** | Human oversight mechanisms, override endpoints, meaningful intervention |
| **Art. 15** | Accuracy benchmarks, robustness testing (adversarial inputs), cybersecurity measures, access control, fallback plans, per-group fairness metrics, third-party security assessment |

---

## Output formats

| Format    | Use                                                   |
| --------- | ----------------------------------------------------- |
| `console` | Default — coloured terminal output grouped by article |
| `json`    | Machine-readable results with full provenance         |
| `sarif`   | GitHub Code Scanning / IDE integration                |
| `junit`   | JUnit compatible XML artifact                         |
| `pdf`     | Evidence Readiness Report for auditors                |
| `badge`   | SVG badge for README or dashboard                     |
