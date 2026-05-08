---
title: NIST AI RMF
description: 18 assertions covering all 4 functions of the NIST AI Risk Management Framework 1.0.
---

## Overview

The NIST AI Risk Management Framework (AI RMF 1.0) provides a structured approach to managing AI risks. Required for US federal procurement and increasingly expected by enterprise buyers doing vendor security reviews.

**Applies to:** `actor: provider` (any risk level)

**18 assertions** across all 4 core functions: GOVERN, MAP, MEASURE, MANAGE.

## Enable

```yaml
frameworks:
  - nist-ai-rmf
```

## Coverage

| Function | Title | Assertions |
|---|---|---|
| **GOVERN** | Policies, accountability, culture | 5 |
| **MAP** | Context, risks, impacts | 4 |
| **MEASURE** | Analysis, benchmarks, evaluation | 5 |
| **MANAGE** | Prioritize, respond, monitor | 4 |

### GOVERN

| ID | Check |
|---|---|
| ASSERT-NIST-AIRMF-GV-001-01 | AI risk policy exists with governance commitments |
| ASSERT-NIST-AIRMF-GV-002-01 | Risk tolerance thresholds defined |
| ASSERT-NIST-AIRMF-GV-003-01 | AI risk roles and responsibilities assigned |
| ASSERT-NIST-AIRMF-GV-004-01 | AI risk communication plan documented |
| ASSERT-NIST-AIRMF-GV-005-01 | Third-party AI policy exists |

### MAP

| ID | Check |
|---|---|
| ASSERT-NIST-AIRMF-MP-001-01 | System context and intended use documented |
| ASSERT-NIST-AIRMF-MP-002-01 | External factors documented |
| ASSERT-NIST-AIRMF-MP-003-01 | Capabilities and limitations documented |
| ASSERT-NIST-AIRMF-MP-004-01 | Likelihood and impact assessments documented |

### MEASURE

| ID | Check |
|---|---|
| ASSERT-NIST-AIRMF-MS-001-01 | Evaluation criteria for trustworthiness defined |
| ASSERT-NIST-AIRMF-MS-002-01 | System performance evaluated and documented |
| ASSERT-NIST-AIRMF-MS-003-01 | Fairness and bias metrics documented per population group |
| ASSERT-NIST-AIRMF-MS-004-01 | Security and adversarial robustness evaluated |
| ASSERT-NIST-AIRMF-MS-005-01 | Risks from third-party components documented |

### MANAGE

| ID | Check |
|---|---|
| ASSERT-NIST-AIRMF-MG-001-01 | Risk treatment plan with prioritized decisions |
| ASSERT-NIST-AIRMF-MG-002-01 | Residual risks identified and accepted |
| ASSERT-NIST-AIRMF-MG-003-01 | Incident response and escalation procedures documented |
| ASSERT-NIST-AIRMF-MG-004-01 | Deployed system monitored for performance and risk |

## Key artifacts

Rulestatus looks for these in `docs/ai-rmf/`, `docs/compliance/`, and `docs/`:

`ai-risk-policy`, `risk-tolerance`, `ai-rmf-roles`, `ai-communication-plan`, `vendor-risk`, `ai-system-card`, `ai-risk-assessment`, `bias-examination`, `security`, `risk-treatment-plan`, `incident-response`, `monitoring-plan`
