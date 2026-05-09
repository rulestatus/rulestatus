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

Evidence gaps appear as inline annotations on pull requests.

## With attestation (Sigstore)

```yaml
jobs:
  compliance:
    runs-on: ubuntu-latest
    permissions:
      id-token: write       # required for Sigstore OIDC
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
          attest: true          # bundle + Sigstore attestation via gh CLI
```

The bundle is hashed with SHA-256, written to `.rulestatus/`, and submitted to Sigstore/Rekor
using OIDC identity. The `artifact-url` output links to the retained artifact.

## Inputs

| Input | Default | Description |
|---|---|---|
| `frameworks` | `eu-ai-act` | Comma-separated list of frameworks to run |
| `severity-gate` | `critical` | Fail CI on this severity or higher |
| `report-format` | `sarif` | Comma-separated output formats: `console`, `json`, `sarif`, `pdf`, `badge`, `junit` |
| `config-path` | _(auto-detect)_ | Path to `.rulestatus.yaml` if not in project root |
| `output-dir` | `compliance-reports` | Directory for report output files |
| `upload-artifacts` | `true` | Upload reports as a retained GitHub Actions artifact |
| `retention-days` | `365` | Days to retain the uploaded artifact |
| `attest` | `false` | Bundle artifacts and attest via Sigstore (requires `id-token: write`) |

## Outputs

| Output | Description |
|---|---|
| `sarif-file` | Path to the first SARIF output file |
| `report-dir` | Path to the report output directory |
| `artifact-url` | URL of the uploaded GitHub Actions artifact |
