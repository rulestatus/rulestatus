---
title: GitHub Actions
description: Block pull requests on compliance evidence gaps.
---

## Basic setup

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

Evidence gaps appear as inline annotations on pull requests.

## With attestation (Sigstore)

```yaml
jobs:
  compliance:
    runs-on: ubuntu-latest
    permissions:
      id-token: write     # required for Sigstore OIDC
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Run Rulestatus
        uses: rulestatus/action@v1
        with:
          frameworks: eu-ai-act,iso-42001,nist-ai-rmf
          severity-gate: critical
          report-format: sarif,json
          attest: true          # bundle + Sigstore attestation
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `frameworks` | `eu-ai-act` | Comma-separated list of frameworks |
| `severity-gate` | `critical` | Exit with error on this severity or higher |
| `report-format` | `console,sarif` | Comma-separated output formats |
| `attest` | `false` | Bundle artifacts and attest via Sigstore |
| `retention-days` | `365` | Artifact retention period |

## Outputs

| Output | Description |
|---|---|
| `artifact-url` | URL of the uploaded compliance artifact |
| `result-summary` | Pass/fail summary string |
