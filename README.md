# Rulestatus

**Find AI compliance errors before they block your enterprise deals.**

When an enterprise customer asks for EU AI Act readiness, you don't send them a consultant's report — you send them a signed attestation generated from your CI pipeline.

```
  Rulestatus v1.0 — EU AI Act (2024/1689)
  System: Acme Fraud Detection Model v2.1
  Actor: provider | Risk level: high-risk
  ──────────────────────────────────────────────────

  Art. 9 - Risk Management
    PASS   ASSERT-EU-AI-ACT-009-001-01   Risk management system documentation exists
    FAIL   ASSERT-EU-AI-ACT-009-002-B-01  Risk register includes emerging risks
      -> No risk entries with source: emerging or category: misuse found.
      -> Run: rulestatus generate --framework eu-ai-act

  Art. 10 - Data Governance
    PASS   ASSERT-EU-AI-ACT-010-002-01   Bias examination documented
    FAIL   ASSERT-EU-AI-ACT-010-002-02   Bias assessment covers ≥3 protected characteristics
      -> Found: [gender, race]. Missing at least one of: age, disability, nationality.

  ──────────────────────────────────────────────────
  Results: 38 passed | 5 gaps | 0 warnings | 2 attested | 1 manual
  Critical evidence gaps: 2 — pipeline BLOCKED
  Note: evidence present ≠ legally compliant. Not legal advice or a conformity assessment.
```

Rulestatus is a CI/CD tool for AI compliance. It runs executable checks against your documentation and configuration, fails the build when required evidence is missing, and produces a signed attestation your legal and procurement teams can hand to auditors.

Think of it as **"Terraform plan for AI law"** — the diff between what your system documents and what the regulation requires.

> **Disclaimer:** Rulestatus checks whether required documentation and configuration is present and correctly structured. Evidence present does not constitute a legal determination of compliance. Conformity assessment for high-risk AI systems under Article 43 may require evaluation by a notified body. Treat reports as due diligence documentation, not compliance certificates.

**Docs:** [rulestatus.com](https://rulestatus.com)

---

## Install

```bash
# Requires Bun ≥ 1.1
bun install -g rulestatus

# or npm
npm install -g rulestatus
```

---

## Quick start

```bash
# 1. Create .rulestatus.yaml — scans for existing compliance docs and pre-fills paths
rulestatus init

# 2. Generate templates for whatever's missing
rulestatus generate --all

# 3. Fill in every TODO, then run
rulestatus run

# 4. Drill into any gap
rulestatus explain ASSERT-EU-AI-ACT-009-002-B-01

# 5. Produce a signed attestation for your enterprise customer
rulestatus attest --bundle
```

`init` scans your repo for existing compliance artifacts (risk registers, model cards, bias assessments, etc.), pre-fills evidence paths from what it finds, and suggests only the `generate` commands for what's missing.

Once `rulestatus run` passes, `rulestatus attest` produces a cryptographically signed bundle your enterprise customer or auditor can verify — no PDF email chain required.

---

## The attestation workflow

The most valuable output Rulestatus produces isn't the console report — it's the attestation.

```bash
# Package all compliance artifacts into an audit-ready archive
rulestatus bundle

# Sign it (uses Sigstore — no key management required)
rulestatus attest .rulestatus/acme-fraud-model-2025-01-15.tar.gz

# Or generate a manual attestation for a specific check
rulestatus attest ASSERT-EU-AI-ACT-009-001-01
```

The signed bundle contains a manifest, all evidence files, and the last-run summary with SHA-256 hashes. When a customer's security team asks for evidence, you send them the bundle URL — not a screenshot.

---

## Commands

| Command | Description |
|---|---|
| `rulestatus init` | Interactive setup — creates `.rulestatus.yaml` |
| `rulestatus run` | Run all evidence checks |
| `rulestatus run --framework eu-ai-act` | Run checks for one framework |
| `rulestatus run --article 9` | Run checks for a specific article |
| `rulestatus run --severity critical` | Run only critical checks |
| `rulestatus run --format pdf` | Output a PDF evidence readiness report |
| `rulestatus generate --framework <fw>` | Generate all templates for one framework |
| `rulestatus generate --all` | Generate all templates for all frameworks |
| `rulestatus explain <ASSERT-ID>` | Show legal basis, last run result, and fix guidance |
| `rulestatus attest <file\|ASSERT-ID>` | Sign a bundle or generate a manual attestation |
| `rulestatus bundle` | Package all compliance artifacts into an audit-ready `.tar.gz` |
| `rulestatus report <file>` | Re-render a saved JSON results file in another format |
| `rulestatus update` | Check for a newer version of the rule library |
| `rulestatus export-registry` | Export obligation + assertion YAML registry from rule definitions |

### Templates (`rulestatus generate`)

Templates are auto-derived from rule definitions — adding a new rule automatically adds its fields to the relevant template. Run `--framework <fw>` to see what gets generated for your framework:

| Framework | Templates generated | Key outputs |
|---|---|---|
| `eu-ai-act` | 16 templates | `docs/risk_register.yaml`, `model/model_card.yaml`, `config/transparency.yaml`, `docs/compliance/technical-documentation.yaml`, and more |
| `iso-42001` | ~10 templates | `docs/aims/aims-scope.yaml`, `docs/iso42001/ai-policy.yaml`, and more |
| `nist-ai-rmf` | ~9 templates | `docs/nist-ai-rmf/govern.yaml`, `docs/nist-ai-rmf/map.yaml`, and more |

Each generated file includes inline comments showing which assertion ID requires each field and what auditors look for.

---

## GitHub Actions

Add this to your repo and compliance gaps show up as PR annotations — the same way linting errors do.

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
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Run Rulestatus
        id: compliance
        uses: rulestatus/action@v1
        with:
          frameworks: eu-ai-act
          severity-gate: critical
          report-format: sarif

      - name: Upload to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: ${{ steps.compliance.outputs.sarif-file }}
```

Evidence gaps appear as annotations directly on pull requests. Reports are retained as artifacts for 365 days.

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
  - iso-42001
  - nist-ai-rmf

evidence:
  docs_path: ./docs/compliance/
  model_card: ./model/model_card.yaml
  risk_register: ./docs/risk_register.yaml
  config_path: ./config/

reporting:
  format: [console, sarif]      # console | json | sarif | junit | pdf | badge
  output_dir: ./compliance-reports/

severity_gate:
  fail_on: critical             # exit code 1 if any critical gap found
  warn_on: major
```

---

## What's checked

### EU AI Act — 43 assertions

High-risk AI providers under Regulation (EU) 2024/1689, Articles 6, 9, 10, 11, 13, 14, 15.

| Article | Checks |
|---|---|
| **Art. 6** | Risk level classification, Annex III category, prohibited use documentation |
| **Art. 9** | Risk management system, risk register (health/safety/rights dimensions, emerging risks, residual risks), testing procedures, incident reporting |
| **Art. 10** | Training data documentation, bias examination (≥3 protected characteristics), data representativeness, data minimisation, quality criteria |
| **Art. 11** | Technical documentation (all 15 Annex IV sections), model architecture, performance metrics, versioning, applicable standards |
| **Art. 13** | AI disclosure, instructions for use (intended purpose, limitations, performance), provider contact |
| **Art. 14** | Human oversight mechanisms, override endpoints, meaningful intervention |
| **Art. 15** | Accuracy benchmarks, robustness testing, cybersecurity measures, access control, fallback plans, per-group fairness metrics, third-party security assessment |

### ISO/IEC 42001:2023 — 19 assertions

AI Management System providers, Clauses 4–10.

| Clause | Checks |
|---|---|
| **Cl. 4** | AIMS scope, organizational context, interested parties |
| **Cl. 5** | AI policy (purpose, commitments, approval), roles and responsibilities |
| **Cl. 6** | AIMS-level risks and opportunities, measurable AI objectives |
| **Cl. 7** | Competence requirements, awareness program, document control |
| **Cl. 8** | AI risk assessment, AI impact assessment, lifecycle stages, operational controls |
| **Cl. 9** | Monitoring and measurement, internal audit program, management review |
| **Cl. 10** | Corrective action procedure, continual improvement plan |

### NIST AI RMF 1.0 — 18 assertions

All 4 core functions: GOVERN, MAP, MEASURE, MANAGE.

| Function | Checks |
|---|---|
| **GOVERN** | AI risk policy, risk tolerance, roles and responsibilities, risk communication, third-party AI policy |
| **MAP** | System context and intended use, external factors, capabilities and limitations, likelihood and impact documentation |
| **MEASURE** | Evaluation criteria, performance documentation, fairness and bias metrics, security and adversarial robustness, third-party component risks |
| **MANAGE** | Risk treatment plan, residual risks, incident response and escalation, production monitoring |

---

## Output formats

| Format | Use |
|---|---|
| `console` | Default — coloured terminal output grouped by article |
| `json` | Machine-readable results with full provenance and evidence hashes |
| `sarif` | GitHub Code Scanning / IDE integration |
| `junit` | JUnit-compatible XML for test reporting tools |
| `pdf` | Evidence Readiness Report for auditors |
| `badge` | SVG badge for README or dashboard |

---

## License

Apache 2.0. See [LICENSE](LICENSE).
