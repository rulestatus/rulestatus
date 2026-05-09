---
title: Commands
description: Complete CLI command reference for rulestatus.
---

## `rulestatus init`

Interactively creates a `.rulestatus.yaml` configuration file.

```bash
rulestatus init
rulestatus init --actor provider --risk-level high-risk --frameworks eu-ai-act
```

| Option | Default | Description |
|---|---|---|
| `--actor` | `provider` | Actor type: `provider`, `deployer`, `importer`, `distributor` |
| `--risk-level` | `high-risk` | Risk level: `prohibited`, `high-risk`, `limited-risk`, `minimal-risk` |
| `--frameworks` | `eu-ai-act` | Comma-separated frameworks to enable |
| `--name` | (prompt) | AI system name |

---

## `rulestatus run`

Run compliance checks and print results to the console (and optionally write report files).

```bash
rulestatus run
rulestatus run --framework eu-ai-act --format console,json,sarif
rulestatus run --article 9 --severity critical
```

| Option | Default | Description |
|---|---|---|
| `--framework` | all | Limit to one framework (e.g. `eu-ai-act`, `iso-42001`, `nist-ai-rmf`) |
| `--article` | all | Run only rules for this article/clause number |
| `--severity` | all | Run only rules at this severity or higher |
| `--format` | `console` | Output formats: `console`, `json`, `sarif`, `pdf`, `badge`, `junit` |
| `--output` | `./compliance-reports` | Output directory for report files |

Exits non-zero when any result at or above `severity_gate.fail_on` fails.

---

## `rulestatus generate`

Scaffold a compliance artifact template with inline field explanations.

```bash
rulestatus generate                      # interactive picker
rulestatus generate risk-register
rulestatus generate --all                # scaffold everything at once
```

| Template | Output path | Covers |
|---|---|---|
| `risk-register` | `docs/risk_register.yaml` | Art. 9.2 |
| `risk-management` | `docs/risk-management/risk-management.yaml` | Art. 9.1–9.3 |
| `model-card` | `model/model_card.yaml` | Art. 10, 11 |
| `data-governance` | `docs/compliance/data-governance.yaml` | Art. 10 |
| `bias-assessment` | `docs/bias_assessment.yaml` | Art. 10.2 |
| `technical-doc` | `docs/compliance/technical-documentation.yaml` | Art. 11 (Annex IV) |
| `transparency-config` | `config/transparency.yaml` | Art. 13.1, 13.4 |
| `instructions-for-use` | `docs/compliance/instructions-for-use.yaml` | Art. 13.2–13.4 |

---

## `rulestatus explain`

Show legal basis, last-run context, and remediation steps for a specific assertion.

```bash
rulestatus explain ASSERT-EU-AI-ACT-009-001-01
```

Prints the legal text, what the last run found (or didn't find), and the exact fix to apply.

---

## `rulestatus report`

Re-render a saved JSON results file in another format without re-running checks.

```bash
rulestatus report compliance-reports/eu-ai-act-2025-01-01.json --format pdf
rulestatus report results.json --format sarif --output my-report.sarif
```

| Option | Default | Description |
|---|---|---|
| `--format` | `pdf` | Output format: `console`, `pdf`, `sarif`, `junit`, `badge` |
| `--output` | `compliance-report.<ext>` | Output file path |

---

## `rulestatus bundle`

Package all compliance artifacts into an audit-ready `.tar.gz` archive.

```bash
rulestatus bundle
rulestatus bundle --output artifacts/my-system-2025-01-01.tar.gz
```

The archive contains:
- `manifest.json` — system metadata, framework list, last-run summary
- `evidence/` — all docs, config, model card, risk register files from your config paths
- `reports/last-run.json` — last run results with evidence hashes

| Option | Default | Description |
|---|---|---|
| `--output` | `.rulestatus/<name>-<timestamp>.tar.gz` | Output path |
| `--name` | system name from config | Bundle name prefix |

---

## `rulestatus attest`

Cryptographically sign a compliance artifact, or generate a manual sign-off template for a specific assertion.

```bash
# Cryptographic attestation of a bundle file
rulestatus attest .rulestatus/my-system-2025-01-01.tar.gz
rulestatus attest bundle.tar.gz --provider github   # Sigstore via gh CLI (CI)
rulestatus attest bundle.tar.gz --provider cosign

# Manual sign-off template for a MANUAL-status assertion
rulestatus attest ASSERT-EU-AI-ACT-013-001-01
```

In **file mode**, writes `<file>.sha256` and `<file>.attestation.json`. With `--provider github` or `cosign`, submits to Sigstore/Rekor for OIDC-backed proof.

In **ASSERT-ID mode**, writes `.rulestatus/attestations/<ASSERT-ID>.yaml` — a YAML template you fill in and commit. The git commit provides identity, timestamp, and immutability.

| Option | Default | Description |
|---|---|---|
| `--provider` | `github` in CI, `none` otherwise | Signing provider: `github`, `cosign`, `none` |
| `--output` | `<file>.attestation.json` | Output path for attestation JSON |

---

## `rulestatus export-registry`

Export all assertions and obligations as YAML files for legal review or integration.

```bash
rulestatus export-registry
rulestatus export-registry --framework eu-ai-act --output ./my-registry
```

Outputs per framework:
- `registry/<framework>/assertions.yaml` — one entry per assertion with full metadata
- `registry/<framework>/obligations.yaml` — deduplicated obligations listing their assertion IDs

| Option | Default | Description |
|---|---|---|
| `--output` | `registry/` | Output directory |
| `--framework` | all | Limit to one framework |

These files are generated — never edit them manually. Regenerate after any rule change.

---

## Global options

| Option | Description |
|---|---|
| `--config <path>` | Path to `.rulestatus.yaml` (default: auto-detected) |
| `--version` | Print version |
| `--help` | Show help |
