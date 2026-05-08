---
title: Output Formats
description: All report output formats and when to use them.
---

## console

Default. Colored terminal output grouped by article.

```bash
rulestatus run
rulestatus run --format console
```

## json

Machine-readable results with full provenance.

```bash
rulestatus run --format json
```

Includes: all rule results, evidence sources with SHA-256 hashes, confidence levels, CI provenance block (run ID, SHA, actor when running in GitHub Actions).

## sarif

SARIF 2.1.0 — GitHub Code Scanning and IDE integration.

```bash
rulestatus run --format sarif
```

Upload to GitHub Code Scanning to get inline PR annotations.

## junit

JUnit-compatible XML. Use with test reporting tools.

```bash
rulestatus run --format junit
```

Results grouped into `<testsuite>` per article. FAIL/MAJOR → `<failure>`, MANUAL → `<error>`, SKIP → `<skipped/>`.

## pdf

Evidence Readiness Report — formatted PDF for auditors.

```bash
rulestatus run --format pdf
```

Includes: executive summary, per-article results, evidence sources, legal disclaimer, run provenance.

## badge

SVG badge for README or dashboard.

```bash
rulestatus run --format badge
```

Output: `compliance-badge.svg` — green (all pass), yellow (warnings), red (critical gaps).

## Multiple formats

```bash
rulestatus run --format console,json,sarif
```
