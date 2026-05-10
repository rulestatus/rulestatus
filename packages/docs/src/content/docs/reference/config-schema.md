---
title: Configuration Schema
description: Complete .rulestatus.yaml schema reference.
---

Rulestatus is configured via a `.rulestatus.yaml` file in your project root.
Run `rulestatus init` to create one interactively.

## Full example

```yaml
system:
  name: "My Fraud Detection Model v1.0"
  actor: provider           # provider | deployer | importer | distributor
  risk_level: high-risk     # prohibited | high-risk | limited-risk | minimal-risk
  domain: "financial services"
  intended_use: "Automated fraud scoring for card transactions"
  api_base_url: "https://api.yourcompany.com"  # optional — used by API probe checks

frameworks:
  - eu-ai-act
  - iso-42001
  - nist-ai-rmf

evidence:
  docs_path: ./docs/compliance/   # scanned for documentation artifacts
  model_card: ./model/model_card.yaml
  risk_register: ./docs/risk_register.yaml
  config_path: ./config/          # scanned for transparency/config checks

reporting:
  format:
    - console
    - json
    - sarif
  output_dir: ./compliance-reports/
  badge: false                    # also write compliance-badge.svg

severity_gate:
  fail_on: critical   # exit non-zero when any critical check fails
  warn_on: major      # print warning for major failures (does not fail CI)
```

---

## `system`

Describes your AI system. Used to filter which checks apply.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human-readable system name, included in every report |
| `actor` | string | yes | Your role: `provider`, `deployer`, `importer`, `distributor` |
| `risk_level` | string | yes | EU AI Act risk classification: `prohibited`, `high-risk`, `limited-risk`, `minimal-risk` |
| `domain` | string | no | Business domain (e.g. `healthcare`, `financial services`) |
| `intended_use` | string | no | Free-text description of the system's purpose |
| `api_base_url` | string | no | Base URL for API probe checks (Article 14 human oversight endpoints) |

---

## `frameworks`

List of frameworks to run. Available values:

| Value | Description |
|---|---|
| `eu-ai-act` | EU AI Act — Articles 6, 9, 10, 11, 13, 14, 15 |
| `iso-42001` | ISO/IEC 42001:2023 — Clauses 4–10 |
| `nist-ai-rmf` | NIST AI RMF 1.0 — GOVERN, MAP, MEASURE, MANAGE |
| `colorado-sb24-205` | Colorado SB 24-205 — §§ 6-1-1702 through 6-1-1705 |

---

## `evidence`

Paths where Rulestatus looks for compliance artifacts.

| Field | Default | Description |
|---|---|---|
| `docs_path` | `./docs/compliance/` | Directory scanned for documentation artifacts (risk registers, model cards, etc.) |
| `model_card` | _(empty)_ | Path to model card YAML |
| `risk_register` | _(empty)_ | Path to risk register JSON or YAML |
| `config_path` | `./config/` | Directory scanned for configuration files (transparency config, etc.) |
| `api_base_url` | _(inherits from `system.api_base_url`)_ | Override the base URL for API probe checks in this evidence context. Takes precedence over `system.api_base_url`. |

---

## `reporting`

Controls how results are output.

| Field | Default | Description |
|---|---|---|
| `format` | `[console]` | List of output formats. Options: `console`, `json`, `sarif`, `pdf`, `badge`, `junit` |
| `output_dir` | `./compliance-reports/` | Directory for report files |
| `badge` | `false` | Always write `compliance-badge.svg` regardless of format list |

---

## `severity_gate`

Controls when rulestatus exits non-zero (fails CI).

| Field | Default | Description |
|---|---|---|
| `fail_on` | `critical` | Exit non-zero if any result at this severity or above fails |
| `warn_on` | `major` | Print a warning for results at this severity (does not fail CI) |

Severity levels in order: `critical` > `major` > `minor` > `info`.
