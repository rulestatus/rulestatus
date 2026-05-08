---
title: Configuration Schema
description: Complete .rulestatus.yaml schema reference.
---

See [Configuration](/getting-started/configuration/) for annotated examples.

## Schema

```yaml
system:
  name: string            # required
  actor: provider | deployer | importer | distributor   # required
  risk_level: prohibited | high-risk | limited-risk | minimal-risk  # required
  domain: string          # optional
  intended_use: string    # optional
  api_base_url: string    # optional — overrides evidence.api_base_url

frameworks:               # required — list of frameworks to check
  - eu-ai-act
  - iso-42001
  - nist-ai-rmf

evidence:
  docs_path: string       # default: ./docs/compliance/
  model_card: string      # default: ./model/model_card.yaml
  risk_register: string   # default: ./docs/risk_register.yaml
  config_path: string     # default: ./config/
  api_base_url: string    # base URL for API probe checks

reporting:
  format: array           # console | json | sarif | junit | pdf | badge
  output_dir: string      # default: ./compliance-reports/

severity_gate:
  fail_on: critical | major | minor   # exit code 1 if gap at this level+
  warn_on: critical | major | minor   # non-blocking warning threshold
```
