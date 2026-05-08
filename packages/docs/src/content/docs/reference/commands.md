---
title: Commands
description: Complete CLI command reference.
---

## `rulestatus init`

Interactive setup wizard. Creates `.rulestatus.yaml` in the current directory.

```bash
rulestatus init
```

Prompts for: system name, actor type, risk level, domain, intended use, frameworks to enable.

---

## `rulestatus run`

Run all evidence checks and output a report.

```bash
rulestatus run [options]
```

| Option | Description |
|---|---|
| `--framework <fw>` | Limit to one framework: `eu-ai-act`, `iso-42001`, `nist-ai-rmf` |
| `--article <n>` | Limit to one article (e.g. `--article 9`) |
| `--severity <s>` | Minimum severity: `critical`, `major`, `minor` |
| `--format <fmt>` | Output format: `console`, `json`, `sarif`, `junit`, `pdf`, `badge` |
| `--output <dir>` | Output directory (default: `./compliance-reports/`) |

Exit codes: `0` = no gaps at gate severity, `1` = gaps found or internal error.

---

## `rulestatus explain <ASSERT-ID>`

Show legal basis, last run result, and fix guidance for a specific assertion.

```bash
rulestatus explain ASSERT-EU-AI-ACT-009-002-B-01
```

Output includes: article, legal text, what was scanned, what was found, and exact remediation steps.

---

## `rulestatus generate [template]`

Generate a compliance artifact template.

```bash
rulestatus generate risk-register
rulestatus generate --all
```

| Template | Article | Output |
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

## `rulestatus attest`

Two modes:

**Assertion attestation** — generate a structured YAML template for manual attestation:
```bash
rulestatus attest ASSERT-EU-AI-ACT-013-001-01
```
Creates `.rulestatus/attestations/<ASSERT-ID>.yaml`. Fill in and commit to git.

**File attestation** — hash a bundle and optionally submit to Sigstore:
```bash
rulestatus attest bundle.tar.gz [--provider github|cosign]
```

---

## `rulestatus bundle`

Package all compliance artifacts into a `.tar.gz` archive.

```bash
rulestatus bundle [--output <path>]
```

Output: `.rulestatus/<system-name>-<timestamp>.tar.gz` containing `manifest.json` + all evidence files.

---

## `rulestatus report`

Re-render a previous JSON report in a different format.

```bash
rulestatus report --input compliance-reports/report.json --format pdf
```

---

## `rulestatus export-registry`

Export the full obligation and assertion registry as YAML. Used to generate the assertion reference in this docs site.

```bash
rulestatus export-registry [--framework eu-ai-act] [--output registry/]
```

Output: `registry/<framework>/assertions.yaml` and `obligations.yaml`.
