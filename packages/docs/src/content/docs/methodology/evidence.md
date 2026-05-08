---
title: Evidence Model
description: How Rulestatus collects, hashes, and scores evidence.
---

## Evidence types

Rulestatus collects four types of evidence:

| Type | Collector | What it checks |
|---|---|---|
| **Document** | `FilesystemCollector` | YAML/JSON/MD files in specified paths |
| **Structured** | `FilesystemCollector` | Named files (e.g. `bias_assessment.yaml`) anywhere under evidence paths |
| **Config** | `FilesystemCollector` | Config files (e.g. `config/transparency.yaml`) |
| **API** | `ApiCollector` | HTTP endpoints on the running system |
| **Manual** | `ManualCollector` | `.rulestatus/attestations/<ASSERT-ID>.yaml` |

## Evidence hashing

Every document loaded is hashed with SHA-256 at collection time. The hash is included in the JSON report alongside the file path and a count of redacted fields.

This enables a complete audit chain:
```
git commit → CI run → evidence hash per rule → bundle hash → Sigstore attestation
```

An auditor can verify that a specific file version produced a specific finding.

## Confidence levels

Each rule result carries a confidence level:

| Level | Meaning |
|---|---|
| `strong` | Required fields present with expected values |
| `moderate` | Fields present but some expected values missing or partial |
| `weak` | Document found but minimal evidence within it |

Rules use `system.evidence.setConfidence("weak" | "moderate")` before returning to downgrade confidence.

## Secrets redaction

Before recording evidence sources in the audit trail, Rulestatus redacts:
- Fields matching sensitive key names (`password`, `secret`, `token`, `api_key`, ...)
- Values matching secret patterns (API keys, JWTs, DB connection strings, ...)

The `redactedFields` count in each evidence source shows how many fields were redacted. Rules receive unredacted data for field checks; only the audit trail is redacted.

## Manual attestation

For checks that cannot be automated (e.g. "prove human oversight exists"), Rulestatus uses `manual()` as a fallback in the check chain. When all automated checks fail and only `manual()` remains, the result is `MANUAL` rather than `FAIL`.

To satisfy a MANUAL result:
```bash
rulestatus attest ASSERT-EU-AI-ACT-014-001-01
```

This creates `.rulestatus/attestations/<ASSERT-ID>.yaml`. Fill it in, commit to git, and subsequent runs will find it.
