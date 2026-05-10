# Regulatory Monitoring Process

This document describes the process for tracking regulatory changes that may affect
the Rulestatus assertion library. It satisfies SCT-2.1 (interpretation versioning —
documented process for tracking implementing acts).

## Scope

Covered regulations and their current baseline versions (from `FRAMEWORK_BASELINES`
in `packages/cli/src/core/rule.ts`):

| Framework | Citation | Baseline Date |
|---|---|---|
| EU AI Act | Regulation (EU) 2024/1689/EU | 2024-08-01 |
| ISO/IEC 42001 | ISO/IEC 42001:2023 | 2023-12-01 |
| NIST AI RMF | NIST AI RMF 1.0 | 2023-01-26 |
| Colorado SB 24-205 | Colorado SB 24-205 | 2024-05-17 |

## Monitoring Sources

The following sources are monitored for regulatory changes:

**EU AI Act:**
- Official Journal of the EU (OJ): https://eur-lex.europa.eu — search for acts under
  Regulation (EU) 2024/1689 (implementing acts, delegated acts, corrigenda)
- European AI Office: https://digital-strategy.ec.europa.eu/en/policies/european-ai-office
- AI Act Explorer (unofficial, useful for tracking): https://artificialintelligenceact.eu

**ISO/IEC 42001:**
- ISO website for amendments and corrigenda to ISO/IEC 42001:2023
- ISO/IEC JTC 1/SC 42 working group publications

**NIST AI RMF:**
- NIST AI Resource Center: https://airc.nist.gov
- NIST AI RMF profiles and playbook updates

**Colorado SB 24-205:**
- Colorado General Assembly: https://leg.colorado.gov
- Colorado AG guidance and enforcement notices

## Monitoring Cadence

| Frequency | Action |
|---|---|
| Weekly | Scan EU AI Office news feed and OJ alerts for new implementing acts |
| Monthly | Review ISO/IEC 42001 and NIST AI RMF update pages |
| Per regulatory event | Triage impact within 5 business days of a published implementing act |
| Annually | Full review of all four frameworks against current regulation text |

## Impact Assessment Process

When a regulatory change is detected:

1. **Identify affected assertions** — run `rulestatus export-registry --framework <fw>`
   and compare the exported `legalText` fields against the new regulation text.

2. **Classify the change:**
   - **Critical** — changes what constitutes compliance (e.g., new mandatory evidence
     requirement); requires assertion update within 30 days.
   - **Clarification** — confirms existing interpretation; no assertion change needed;
     update `legalText` if wording improved.
   - **New article/section** — new regulatory requirement not yet covered; add new
     assertions; update FRAMEWORK_BASELINES baseline date.
   - **Repeal/amendment** — existing assertion becomes incorrect; deprecate or update.

3. **Update assertions** — modify the affected rule file(s) in `src/frameworks/`.
   Commit message must reference the implementing act number and article.

4. **Update FRAMEWORK_BASELINES** — update `publishedDate` in `packages/cli/src/core/rule.ts`
   to the date of the implementing act.

5. **Release** — ship a new version following the release checklist in
   `docs/aims/operational-procedures.yaml`. CHANGELOG entry must note which assertions
   were affected and which implementing act triggered the change.

6. **User notification** — `rulestatus update` informs users of the new version.
   Release notes describe which assertions changed and why.

## Version Locking and Auditability

Each rulestatus release is pinned to specific regulation versions via `FRAMEWORK_BASELINES`.
The `meta.regulatoryBaselines` field in JSON reports and PDF cover page record which
version of each regulation the run evaluated against. This allows auditors to reconstruct
the regulatory interpretation in force at the time of any past run.

Users who need to audit against a specific regulation version should pin their
`rulestatus` dependency version (e.g., `"rulestatus": "1.2.0"` in package.json)
and not auto-update past a regulation amendment release.
