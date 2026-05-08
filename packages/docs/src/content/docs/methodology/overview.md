---
title: How law becomes a test
description: The methodology behind Rulestatus assertions — from legal text to executable check.
---

Every assertion in Rulestatus follows a four-stage pipeline from regulation to runtime check.

## Stage 1: Legal decomposition

A legal analyst reads the regulatory text and identifies discrete, verifiable obligations. One obligation = one thing an organization must demonstrably do or have.

Example — EU AI Act Article 9.4:
> "The high-risk AI system shall be tested in order to identify the most appropriate risk management measures."

Obligation: **testing procedures must be documented**.

## Stage 2: Evidence specification

For each obligation, the analyst specifies what documentary evidence satisfies it — not a legal opinion, but a structural check: does this artifact exist, and does it contain the required fields?

The evidence spec answers:
- Which file types prove this? (YAML, JSON, PDF, MD)
- Where should they live? (`docs/compliance/`, `model/`, `config/`)
- What fields must be present? (`testing_procedures`, `test_results`, ...)
- Are any fields required to have values within a time window? (e.g. updated within 12 months)

## Stage 3: Rule encoding

The evidence spec becomes a `rule()` call in TypeScript using the builder DSL:

```typescript
rule({
  id: "ASSERT-EU-AI-ACT-009-005-01",
  framework: "eu-ai-act",
  article: "ARTICLE 9.5",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Testing procedures are documented",
  obligation: "OBL-EU-AI-ACT-009-005",
  legalText: "...",
  check: anyOf(
    doc("risk-management")
      .inPaths(["docs/risk-management/", "docs/compliance/", "docs/"])
      .formats(["yaml", "md", "pdf", "docx"])
      .requireAny("testing_procedures", "test_procedures", "testing"),
    structured("risk_register")
      .requireAny("testing_procedures", "test_procedures"),
  ),
});
```

## Stage 4: Runtime execution

At `rulestatus run` time, the engine:
1. Loads rules for the configured frameworks and actor type
2. For each rule, executes the `CheckNode` tree via `executor.ts`
3. Records evidence sources with SHA-256 hashes
4. Returns PASS, FAIL, MANUAL, or SKIP with confidence level

## Assertion IDs

Format: `ASSERT-<FRAMEWORK>-<ARTICLE>-<SEQ>`

Examples:
- `ASSERT-EU-AI-ACT-009-002-B-01` — EU AI Act, Article 9, sequence 002B, version 01
- `ASSERT-ISO-42001-CL8-001-01` — ISO 42001, Clause 8, sequence 001
- `ASSERT-NIST-AIRMF-GV-001-01` — NIST AI RMF, GOVERN function, sequence 001

See [Assertion IDs](/methodology/assertion-ids/) for full naming conventions.

## What "PASS" means

A PASS means the required evidence artifact exists and contains the specified fields. It does **not** mean the organization is legally compliant. Compliance is a legal determination requiring human judgment and often a conformity assessment.

Rulestatus produces *evidence readiness* reports — documentation of what evidence exists and what is missing — not compliance certificates.
