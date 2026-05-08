---
title: Configuration
description: All .rulestatus.yaml fields explained.
---

Rulestatus is configured via `.rulestatus.yaml` in your project root.

## Minimal config

```yaml
system:
  name: "My AI System v1.0"
  actor: provider
  risk_level: high-risk
  domain: financial-services
  intended_use: "Automated credit scoring"

frameworks:
  - eu-ai-act
```

## Full config

```yaml
system:
  name: "My AI System v1.0"
  actor: provider               # provider | deployer | importer | distributor
  risk_level: high-risk         # prohibited | high-risk | limited-risk | minimal-risk
  domain: financial-services
  intended_use: "Automated credit scoring for retail banking"

frameworks:
  - eu-ai-act
  - iso-42001
  - nist-ai-rmf

evidence:
  docs_path: ./docs/compliance/
  model_card: ./model/model_card.yaml
  risk_register: ./docs/risk_register.yaml
  config_path: ./config/
  api_base_url: http://localhost:8080   # optional — for API probe checks

reporting:
  format: [console, json, sarif]  # console | json | sarif | junit | pdf | badge
  output_dir: ./compliance-reports/

severity_gate:
  fail_on: critical   # exit code 1 if any critical gap
  warn_on: major
```

## Fields

### `system`

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Human-readable system name |
| `actor` | Yes | Your role: `provider`, `deployer`, `importer`, or `distributor` |
| `risk_level` | Yes | `prohibited`, `high-risk`, `limited-risk`, or `minimal-risk` |
| `domain` | No | Application domain (appears in reports) |
| `intended_use` | No | Free-text description (appears in reports) |

### `frameworks`

List of frameworks to check. Options: `eu-ai-act`, `iso-42001`, `nist-ai-rmf`.

### `evidence`

Paths to your compliance artifacts. All paths are relative to the project root.

### `severity_gate`

`fail_on: critical` causes `rulestatus run` to exit with code 1 if any critical gap is found — useful for blocking CI pipelines.
