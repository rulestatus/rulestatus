---
title: EU AI Act
description: 43 assertions for high-risk AI providers under Regulation (EU) 2024/1689.
---

## Overview

Regulation (EU) 2024/1689 — the EU AI Act — establishes obligations for providers of high-risk AI systems. Rulestatus encodes these obligations as executable checks against your documentation and configuration.

**Applies to:** `actor: provider`, `risk_level: high-risk`

**43 assertions** across Articles 6, 9, 10, 11, 13, 14, 15.

## Enable

```yaml
frameworks:
  - eu-ai-act
```

## Coverage

| Article | Title | Assertions | Severity |
|---|---|---|---|
| **Art. 6** | Classification | 3 | CRITICAL / MAJOR |
| **Art. 9** | Risk Management System | 8 | CRITICAL / MAJOR / MINOR |
| **Art. 10** | Data Governance | 7 | CRITICAL / MAJOR |
| **Art. 11** | Technical Documentation | 8 | CRITICAL / MAJOR / MINOR |
| **Art. 13** | Transparency | 5 | CRITICAL / MAJOR |
| **Art. 14** | Human Oversight | 4 | CRITICAL / MAJOR |
| **Art. 15** | Accuracy, Robustness, Cybersecurity | 8 | CRITICAL / MAJOR / MINOR |

## Key artifacts

| Artifact | Path | Used by |
|---|---|---|
| Risk register | `docs/risk_register.yaml` | Art. 9 |
| Model card | `model/model_card.yaml` | Art. 10, 11 |
| Bias assessment | `docs/bias_assessment.yaml` | Art. 10 |
| Technical documentation | `docs/compliance/technical-documentation.yaml` | Art. 11 |
| Transparency config | `config/transparency.yaml` | Art. 13 |
| Instructions for use | `docs/compliance/instructions-for-use.yaml` | Art. 13 |
| Human override config | `config/human_oversight.yaml` | Art. 14 |
| Cybersecurity config | `config/cybersecurity.yaml` | Art. 15 |

## Generate templates

```bash
rulestatus generate --all
```

Generates all artifacts above with inline comments explaining every field.
