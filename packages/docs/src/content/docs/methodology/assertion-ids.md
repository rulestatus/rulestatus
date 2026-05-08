---
title: Assertion IDs
description: Naming conventions for Rulestatus assertion identifiers.
---

## Format

```
ASSERT-<FRAMEWORK>-<ARTICLE>-<SEQ>[-<VARIANT>]-<VERSION>
```

## Framework prefixes

| Prefix | Framework |
|---|---|
| `EU-AI-ACT` | EU AI Act (Regulation 2024/1689) |
| `ISO-42001` | ISO/IEC 42001:2023 |
| `NIST-AIRMF` | NIST AI Risk Management Framework 1.0 |

## Article/clause codes

- EU AI Act: article number zero-padded to 3 digits — `009`, `010`, `015`
- ISO 42001: `CL4`, `CL5`, ... `CL10`
- NIST AI RMF: function abbreviation — `GV` (GOVERN), `MP` (MAP), `MS` (MEASURE), `MG` (MANAGE)

## Sequence

Three-digit sequence within the article/clause, optionally suffixed with a letter variant (`A`, `B`) for assertions within the same sub-article.

## Version

`01` for the initial assertion. Incremented when the assertion logic changes in a backward-incompatible way.

## Examples

| ID | Meaning |
|---|---|
| `ASSERT-EU-AI-ACT-009-001-01` | EU AI Act Art. 9, assertion 1, version 1 |
| `ASSERT-EU-AI-ACT-009-002-B-01` | EU AI Act Art. 9, assertion 2B (variant B), version 1 |
| `ASSERT-ISO-42001-CL8-001-01` | ISO 42001 Clause 8, assertion 1, version 1 |
| `ASSERT-NIST-AIRMF-GV-001-01` | NIST AI RMF GOVERN function, assertion 1, version 1 |
| `ASSERT-NIST-AIRMF-MS-003-01` | NIST AI RMF MEASURE function, assertion 3, version 1 |
