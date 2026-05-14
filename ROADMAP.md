# Rulestatus — Roadmap

## Strategic Direction

**What this product actually is:**

Not a CLI. A regulation execution engine — the only system in existence that translates AI law (EU AI Act, ISO 42001, NIST AI RMF, Colorado SB 24-205) into versioned, executable, testable assertions.

The CLI is a demo client. The assertion library is the product. The moat is law-to-code translation that consultants, auditors, and GRC vendors still do by hand in spreadsheets.

**Positioning:** OPA for AI regulation.

**What this means for the roadmap:**

Phase ordering shifts. The self-compliance track (building trust infrastructure) was Phase 4 behavior done first. The correct sequence is adoption → dependency → blessing → infrastructure. Every decision below follows that sequence.

**What to stop:**

- Treating SCT self-compliance docs as primary work. They are credibility signals for later stages, not adoption drivers.
- Selling seriousness (regulatory coverage, AIMS, SCT maturity). Start selling relief (saves 20 audit hours per engagement).

---

## GTM Track — Auditor First (replaces engineer-first PLG)

**Why auditors, not engineers:**

Engineers don't buy compliance tools. GRC leads, legal, and CTOs under procurement pressure do. Bottom-up PLG works for observability — not for regulatory liability. The correct motion for this category is top-down, starting with the professionals whose job is AI compliance.

**Path:** auditor adoption → assertions get blessed → sell blessed engine to platforms (Drata, Vanta) from leverage, not supplication.

### GTM-1 — Auditor Fit (0–90 days)

Goal: one paying audit firm customer.

- Identify 3–5 ISO 42001 / EU AI Act audit firms (Big 4 advisory practices, boutique AI law firms, notified body prep consultants)
- Build `--format auditor-report`: maps assertion failures → remediation tasks the auditor hands to their client; includes evidence sources, assertion IDs, remediation steps
- Pricing anchor: find out what one ISO 42001 audit engagement costs in analyst hours; price at 20% of that as a flat per-engagement fee
- Kill metric: one auditor closes a client engagement 50% faster using Rulestatus
- **GTM-1a — Messaging overhaul** (do first, unblocks everything else):
  - Homepage hero: "Install → run → see exactly what you're missing" — replace regulatory coverage copy with time-to-clarity copy
  - Drop 80% of framework/AIMS/SCT content from front page; move to reference docs
  - Replace "compliance tool" / "evidence readiness" with "AI system linter" across: docs site, README, `--help` output, `rulestatus init` prompts, PR annotation messages
  - Rationale: engineers understand linting, not AIMS. Even auditors recommending the tool to clients need a one-line pitch that lands. Wrong framing kills word-of-mouth.

**Stop:** self-compliance theater. Energy that went to own AIMS docs goes here.

### GTM-2 — Assertion Blessing (90–180 days)

Goal: assertions formally validated by paying auditors.

- Auditor customers find wrong interpretations → fix fast → tight feedback loop
- Offer co-authorship credit on assertion library to 1–2 firms willing to review
- Add `reviewStatus` + reviewer attribution to assertion provenance metadata (already in `export-registry` output)
- Target: one audit firm says "we require clients to run Rulestatus before engagement starts"

This is the event that unlocks P2.6 (legal review credential) and makes the assertion library defensible.

### GTM-3 — Auditor SaaS (6–12 months)

Goal: recurring revenue, not per-engagement fees.

- Hosted dashboard: auditor firm manages N client systems, sees gaps centrally
- Assertion subscription: regulatory updates pushed automatically when law changes
- Evidence storage: clients upload artifacts, auditors review in-app
- Pricing: per-seat for auditor firms or per-client-system managed

Kill metric: 3 audit firms on monthly retainer.

### GTM-4 — Infrastructure Layer (12–24 months)

Goal: become the reference implementation.

- API/SDK: sell assertion engine to Drata, Vanta, OneTrust — from leverage after blessing
- Enterprise direct: AI companies pay for hosted compliance + continuous monitoring
- Regulatory reference: regulators cite assertion IDs in official guidance (long shot, high leverage)

---

## Current State (May 2026)

Core engine functional and publicly launched. EU AI Act (44 assertions), ISO/IEC 42001 (19 assertions), NIST AI RMF (18 assertions), Colorado SB 24-205 (14 assertions). CLI commands `run`, `init`, `explain`, `generate`, `report`, `bundle`, `attest`, `export-registry`, `export-methodology` work. Reporters: console, JSON, SARIF, PDF, badge, JUnit XML, annotations. Evidence collectors: filesystem, config, model card, API probe, manual. GitHub Action (`action.yml`) runs per-framework, uploads retained artifacts, optionally attests via Sigstore. JSON reports include CI provenance when running in GitHub Actions. All reporters use evidence-readiness framing with legal disclaimers.

Docs site live at rulestatus.com (Astro Starlight, Netlify). Framework reference pages auto-generated from `RULE_REGISTRY`. Phases 1, 2, and 3 complete (P3.8–P3.10 shipped 2026-05-10). Cross-framework `cluster` tags with runtime `↳ Also satisfies:` annotations.

SCT-0 through SCT-2.4 complete (2026-05-10). Self-compliance run: **37/37 PASS** (ISO 42001 + NIST AI RMF; EU AI Act skipped — system is `limited-risk`).

**What is audit-grade today:**
- Evidence hashing + attestation via Sigstore/Rekor
- System boundary declaration in `.rulestatus.yaml`
- Over-claim guardrails: evidence-readiness language on every output surface
- Audit trail: JSON report with rule IDs, timestamps, CI provenance per run
- Per-evidence-item hashing (P2.9), confidence levels (P2.10), secrets redaction (P2.11)

---

## Phase 1 — MVP Polish (Weeks 1–4) ✓ Complete

### P1.1 — Bootstrap: `rulestatus generate` command ✓ Done

The single biggest adoption blocker. Running on a real project today returns FAIL for everything because no artifacts exist. The generate command creates compliant templates so teams have a path from red to green.

```
rulestatus generate --framework eu-ai-act   → 16 templates (docs/, model/, config/)
rulestatus generate --framework iso-42001   → ~10 templates (docs/aims/, docs/iso42001/)
rulestatus generate --framework nist-ai-rmf → ~9 templates (docs/nist-ai-rmf/)
rulestatus generate --all                   → all frameworks at once
```

Templates are auto-derived from rule definitions via `templateExtractor.ts`. Adding a new rule automatically adds its fields to the relevant output file. Each generated file includes inline comments with the assertion ID that requires each field.

### P1.2 — Enrich `explain` with dynamic failure context ✓ Done

```
WHY YOU FAILED
  Scanned: docs/risk-management/, compliance/, docs/compliance/
  Found: docs/risk_register.json
  Missing field: mitigation_measures
```

### P1.3 — Fix console reporter double-render bug ✓ Done

### P1.4 — JUnit XML export ✓ Done

### P1.5 — Update PRD code examples from Python to TypeScript ✓ Done

### P1.6 — Evidence readiness framing and legal disclaimers ✓ Done

---

## Phase 2 — Depth & Auditor Trust (Weeks 5–10)

### P2.1 — Evidence Bundle ✓ Done

`rulestatus bundle` packages all compliance artifacts into a `.tar.gz` archive. Output: `manifest.json` + evidence files snapshot + last-run summary.

### P2.2 — Obligation → Assertion Methodology ✓ Done

`rulestatus export-methodology` generates `docs/methodology/assertion-traceability.md` from the assertion DSL. Covers all 95 assertions across 4 frameworks.

### P2.3 — Separate obligation and assertion registries from code ✓ Done (superseded by P2.12 + P2.13)

### P2.4 — Reduce runtime API probe surface ✓ Done

### P2.5 — `rulestatus update` command ✓ Done

### P2.6 — Legal review credential

Single most important business milestone before auditor sales scale. Get a named law firm, notified body, or qualified compliance professional to formally review the EU AI Act assertion library and endorse the methodology. Display their name and review date in every PDF report footer.

Without this, sales ceiling is "useful developer tool." With it, assertions are defensible in enterprise procurement. **Now feeds directly into GTM-2 (assertion blessing).**

Deliverable: written statement from reviewer referenceable in reports and on the website.

### P2.7 — CI run as audit trail ✓ Done

### P2.8 — Attestation for MANUAL checks via committed files + Sigstore ✓ Done

### P2.9 — Per-evidence-item hashing at collection time ✓ Done

### P2.10 — Evidence strength / confidence levels on findings ✓ Done

### P2.11 — Secrets and PII redaction in evidence collectors ✓ Done

### P2.12 — TypeScript builder DSL for rule checks ✓ Done

### P2.13 — `rulestatus export-registry` command ✓ Done

---

## Self-Compliance Track (SCT) — Deprioritized relative to GTM

**Context:** SCT was built to prove self-compliance before customer deployment. This was Phase 4 (trust infrastructure) behavior done first. It is credibility infrastructure for later stages, not an adoption driver. Remaining open items (SCT-0.5, SCT-1.6, SCT-2.5, SCT-3) are valuable but do not block GTM-1. Run them in parallel with GTM work; do not let them consume GTM-1 capacity.

### SCT-0 ✓ Complete (2026-05-10)

- [x] SCT-0.1 — `docs/compliance/prohibited-uses.yaml`
- [x] SCT-0.2 — `docs/compliance/data-governance.yaml`
- [x] SCT-0.3 — `docs/bias_assessment.yaml`
- [x] SCT-0.4 — Governance roles in `docs/aims/aims-roles.yaml`
- [ ] **SCT-0.5** — Engage EU AI Act-specialized legal counsel — signed engagement letter; feeds P2.6 and GTM-2. (P0 — blocks assertion blessing)

### SCT-1 ✓ Complete (2026-05-10)

- [x] SCT-1.1 — All AIMS documentation files
- [x] SCT-1.2 — All AI RMF documentation files
- [x] SCT-1.3 — Training documentation
- [x] SCT-1.4 — Risk register
- [x] SCT-1.5 — Assertion validation methodology doc
- [ ] **SCT-1.6** — Legal review of assertion library (P2.6 delivery) — blocked on SCT-0.5

### SCT-2 ✓ Complete (2026-05-10)

- [x] SCT-2.1 — Interpretation versioning
- [x] SCT-2.2 — Regulatory currency disclaimer on all outputs
- [x] SCT-2.3 — Management review cycle documentation
- [x] SCT-2.4 — Corrective action workflow
- [ ] **SCT-2.5** — Internal audit dry run — run once SCT-1.6 complete

### SCT-3 — Assurance (deprioritized; run after GTM-2)

- [ ] SCT-3.1 — Full self-assessment, target 0 FAIL
- [ ] SCT-3.2 — External legal opinion on regulatory interpretation methodology
- [ ] SCT-3.3 — Third-party ISO 42001 gap assessment
- [ ] SCT-3.4 — Executive sign-off

---

## Phase 3 — Platform & Expansion (Weeks 11–16+)

### P3.1 — Additional frameworks ✓ ISO/IEC 42001 Done ✓ NIST AI RMF Done ✓ Colorado SB 24-205 Done

Priority order for remaining frameworks:

1. NYC Local Law 144 — hiring AI, narrower but concrete
2. China — Generative AI Interim Measures
3. China — Algorithm Recommendation Provisions
4. China — Deep Synthesis Provisions
5. South Korea — AI Basic Act
6. Singapore — Model AI Governance Framework / AI Verify
7. Japan — AI Promotion Act
8. ASEAN AI Governance Framework
9. OECD AI Principles

Each framework needs the full Stage 1–4 pipeline treatment, not just test stubs.

### P3.2 — Explicit ICP targeting ✓ Done

### P3.3 — Demo repo ("the sales deck repo") ✓ Done (dogfooding)

### P3.3b — VS Code extension

Real-time compliance linting as engineers write model cards, risk registers, and configs. Surface WARN/FAIL inline with squiggles. `explain` on hover. Low effort given SARIF output already works — VS Code reads SARIF natively via `errorlens`/`sarif-viewer`.

### P3.4a — Docs site + open-source launch (rulestatus.com) ✓ Done

### P3.4b — Auditor Report Format (replaces generic SaaS priority)

Build `--format auditor-report` as the primary commercial output, ahead of generic SaaS dashboard. This serves GTM-1 directly.

Output maps every assertion failure to:
- Remediation task (what the client must produce)
- Evidence specification (what format, what fields)
- Legal basis (which article, which obligation)
- Effort estimate (based on check type: Doc = low, Manual = high)

Auditor can hand this directly to their client as a gap remediation workplan.

**Pricing model (revised for auditor GTM):** charge per audit engagement or per client system managed. Not per seat — compliance tools with per-seat pricing die in procurement. Auditor firms pay per client they onboard; their clients pay nothing directly.

Tiers:
- **Free** — 1 AI system, filesystem collector, CLI + standard reports
- **Auditor** — unlimited client systems, `auditor-report` format, client portal, assertion subscription updates
- **Enterprise** — all connectors, SSO, custom assertion extensions, SLA

### P3.5 — Framework interoperability layer ✓ Done

Cross-framework `cluster` tags with runtime `↳ Also satisfies:` annotations. 12 obligation clusters span all frameworks.

### P3.6 — MANUAL check workflow ✓ Done

### P3.7 — Open question: LegalXML standard

Whether to adopt LegalXML/Akoma Ntoso for the obligation registry format. Needs input from first legal analyst partner — defer until GTM-2 engagement begins.

### P3.8 — GitHub PR annotation reporter ✓ Done

### P3.9 — Auditor ZIP package ✓ Done

`rulestatus bundle --auditor` produces a single tar.gz containing everything a Big 4 auditor needs: PDF + JSON reports, evidence files, attestation.json, manifest.json, README.txt with integrity verification instructions.

### P3.10 — Rulestatus Score ✓ Done

---

## Architecture & Technical Debt ✓ Complete

### ARCH-1 — Replace global `RULE_REGISTRY` with injected registry instances ✓ Done

### ARCH-2 — Separate per-rule execution context from shared evidence cache ✓ Done

### ARCH-3 — Parallel rule execution ✓ Done

### ARCH-4 — Normalize the compliance score for rule count ✓ Done

### ARCH-5 — Close type safety gaps in the rule and config interfaces ✓ Done

### ARCH-6 — Move `requireManual` out of `EvidenceRegistry` ✓ Done

---

## Phase 4 — Auditor Platform (post GTM-2)

**Gate:** do not start until one audit firm is on recurring contract and assertions have been formally reviewed. Building before GTM-2 is complete repeats the original mistake (trust infrastructure before demand infrastructure).

**Strategic direction — Evidence Pipeline, not Validator:** The CLI validates what exists. The platform is an evidence pipeline: ingest evidence from where it actually lives (Confluence, Jira, Google Docs), track it over time, deliver it to auditors and procurement reviewers. Every Phase 4 feature moves the product further along the pipeline.

### P4.0 — Evidence ingestion connectors

`FilesystemCollector` assumes structured YAML in the repo. Evidence lives in Confluence, Notion, Google Drive, Jira. Connectors extract structured evidence fields via LLM extraction, map to the same `EvidenceRegistry` interface — no rule or reporter changes required.

Priority:
1. Confluence — most common enterprise wiki
2. Google Drive / Docs — common at seed/Series A
3. Jira — risk register and incident tracking
4. Notion — common at startups

Gate: CLI has ≥200 installs and at least one team has hit the "we have the docs but not in YAML" blocker in a sales conversation.

### P4.1 — Policy editor

Web UI for compliance officers: visualize CheckNode tree, mark exceptions, adjust thresholds, annotate results without touching CLI or YAML. Bridge between engineer ICP (runs CLI) and compliance officer buyer (owns outcome).

### P4.2 — Amendment service (first paid feature)

When regulation is amended, Pro+ teams get assertion updates within days. Free users get them on the next release. Recurring, high-stakes, impossible to self-serve reliably.

### P4.3 — Auditor dashboard

Multi-client compliance overview, historical trend per framework, per-article drill-down, team activity. Primary entry point for auditor firm buyers.

### P4.4 — Evidence vault

Hosted secure storage for evidence bundles, attestations, audit artifacts. Replaces local `.rulestatus/` with tamper-evident cloud store. Signed URLs for external auditor access.

### P4.5 — Audit portal

Read-only external access for auditors and enterprise customers doing vendor security reviews. Auditor gets URL → logs in → sees compliance history, evidence bundles, attestations. No PDF email chain.

### P4.6 — Benchmark data + industry percentile scoring

Anonymised aggregated compliance scores. "Your system is in the 73rd percentile for EU AI Act readiness." Requires distribution (500+ teams). Build data model in P4.2; surface in Auditor Platform tier once data exists.

---

## Deferred / Under Evaluation

- **Obligation graph visualization** — dependency graph for dashboard. Over-engineered for CLI. Revisit in P4.2.
- **Auditor Platform tier** — now GTM-3/GTM-4 work, not deferred. Sequenced after GTM-2 assertion blessing.
- **B2B2B (Drata/Vanta/OneTrust)** — sell the assertion engine as a data source to governance platforms. Only approach after GTM-2; negotiate from leverage, not desperation.
