# Rulestatus — Roadmap

## Current State (April 2026)

Core engine is functional: EU AI Act Articles 6, 9, 10, 11, 13, 14, 15 are encoded as executable tests. CLI commands `run`, `init`, `explain`, `generate`, `report`, `bundle`, `attest` work. Reporters: console, JSON, SARIF, PDF, badge, JUnit XML. Evidence collectors: filesystem, config, model card, API probe, manual. GitHub Action (`action.yml`) runs per-framework, uploads retained artifacts, and optionally attests via Sigstore. JSON reports include CI provenance (run ID, SHA, actor) when running in GitHub Actions. All reporters use evidence-readiness framing with legal disclaimers.

**What is already audit-grade (not gaps):**
- Evidence hashing + attestation: `rulestatus attest` computes SHA-256, writes `.sha256` + `.attestation.json`, and optionally submits to Sigstore/Rekor via `gh attestation create` or `cosign`. Immutable, OIDC-backed.
- System boundary declaration: `.rulestatus.yaml` requires `name`, `actor`, `riskLevel`, `domain`, `intendedUse`. Engine filters rules by actor and risk level.
- Over-claim guardrails: evidence-readiness language ("evidence gap" not "non-compliant"), mandatory disclaimer on every output surface, hardcoded `disclaimer` field in attestation JSON.
- Audit trail: JSON report captures all rule IDs, timestamps, durations, and CI provenance block per run.

**Genuine remaining gaps (addressed in Phase 2 below):**
- No per-evidence-item hashing at collection time — attestation covers the output bundle, not individual source files evaluated during the run.
- Binary pass/fail with no confidence or evidence strength model.
- No per-rule evidence trace in results — `explain` shows static remediation, not what was found at runtime.
- No secrets/PII redaction in evidence collectors.

---

## Phase 1 — MVP Polish (Weeks 1–4)

Focus: make the tool actually usable on a real project from a cold start.

### P1.1 — Bootstrap: `rulestatus generate` command

The single biggest adoption blocker. Running on a real project today returns FAIL for everything because no artifacts exist. The generate command creates compliant templates so teams have a path from red to green.

```
rulestatus generate risk-register       → docs/risk_register.json
rulestatus generate model-card          → model/model_card.yaml
rulestatus generate data-governance     → docs/data_governance.yaml
rulestatus generate technical-doc       → docs/technical_documentation.yaml
rulestatus generate transparency-config → config/transparency.yaml
rulestatus generate risk-entry          → (appends entry to existing risk_register.json)
```

Each generated file must include inline comments explaining what each field means and what auditors look for. Emit a message like `Run rulestatus run to see which fields still need filling in.`

### P1.2 — Enrich `explain` with dynamic failure context

Currently `explain` only shows static remediation text from the rule definition. It should also surface what it actually found (or didn't find) at the time of the last run. Requires passing evidence context into the result object so `explain` can print:

```
WHY YOU FAILED
  Scanned: docs/risk-management/, compliance/, docs/compliance/
  Found: docs/risk_register.json
  Missing field: mitigation_measures
```

This also closes the per-rule evidence trace gap: once evidence context flows into `RuleResult`, auditors can replay exactly which files each rule evaluated and what the engine saw. Without this, the top-level audit trail exists (run timestamp, rule IDs, CI provenance) but the evidence-to-finding chain per rule is not reconstructable.

### P1.3 — Fix console reporter double-render bug ✓ Done

`ConsoleReporter` was called unconditionally before the format loop, then the loop skipped `"console"`. Effect: console always rendered regardless of the requested formats. Fixed by moving console rendering into the loop alongside all other formats.

### P1.6 — Evidence readiness framing and legal disclaimers ✓ Done

All report outputs (console, PDF, JSON) now use evidence-readiness language ("evidence found / evidence gap") rather than compliance language ("pass / fail"). Mandatory disclaimer added to every output surface clarifying that results are not legal advice and do not constitute a conformity assessment.

### P1.4 — JUnit XML export ✓ Done

`--format junit` added to `cmdRun` and `cmdReport`. Results grouped into `<testsuite>` per article; FAIL/WARN → `<failure>`, MANUAL → `<error>`, SKIP → `<skipped/>`.

### P1.5 — Update PRD code examples from Python to TypeScript ✓ Done

Stage 4 code example rewritten to match the actual `rule()` registration style. SDK directory structure updated to reflect `src/` layout with `.ts` extensions. Install command changed from `pip install` to `bun install -g`. Success metrics updated from `CLI installs (pip)` to `CLI installs (bun/npm)`. Provenance chain diagram updated to show the TypeScript `rule()` call instead of a Python function name.

---

## Phase 2 — Depth & Auditor Trust (Weeks 5–10)

Focus: make the tool produce output auditors actually accept as evidence.

### P2.1 — Evidence Bundle ✓ Done

`rulestatus bundle` packages all compliance artifacts into a `.tar.gz` archive using Bun's native gzip (no external deps). Output: `manifest.json` + evidence files snapshot + last-run summary. Default output: `.rulestatus/<system-name>-<timestamp>.tar.gz`.

### P2.2 — Obligation → Assertion Methodology

The hardest and most important part of the product to get right. Create an internal specification (can live in `docs/methodology/`) that defines:

- Who the legal analysts are and what qualifies them
- How long one article takes end-to-end
- How ambiguity is resolved and by whom
- What makes an assertion "auditor-grade" vs best-effort
- How disagreements between analysts are handled
- Peer review requirement before any assertion ships

Without this, one wrong assertion gives auditors grounds to dismiss the tool entirely.

### P2.3 — Separate obligation and assertion registries from code

Currently obligations and assertions are embedded directly in TypeScript framework files. Stage 2 and Stage 3 of the pipeline produce structured YAML artifacts that legal analysts can read without touching code. This is architecturally correct and important for the peer review process.

```
src/frameworks/euAiAct/
  obligations/
    article9.yaml    ← OBL-EU-AI-ACT-009-* entries
    article10.yaml
  assertions/
    article9.yaml    ← ASSERT-EU-AI-ACT-009-* specs
    article10.yaml
  rules/
    article9.ts      ← compiled from assertion specs
```

Legal analysts edit YAML; engineers encode YAML to TypeScript tests. Clear separation, full provenance.

### P2.4 — Reduce runtime API probe surface

`apiProbe.ts` exists and Article 13/14 rules use it. In practice, most target systems don't expose clean local APIs in CI. Bias evidence collection toward document/config/schema checks (80%) with API probing as a fallback only. Where runtime checks are required, provide a `manual` fallback that marks the assertion as `MANUAL` rather than `FAIL`.

### P2.6 — Legal review credential

The single most important business milestone before enterprise sales. Get a named law firm, notified body, or qualified compliance professional to formally review the EU AI Act assertion library and endorse the methodology. Display their name and review date in every PDF report footer.

Without this, the ceiling on sales is "useful developer tool." With it, the product can be presented in enterprise procurement and security reviews as having been validated by qualified legal professionals. This is not optional for the Auditor Platform tier.

Deliverable: a written statement from the reviewer that can be referenced in reports and on the website.

### P2.7 — CI run as audit trail; annotate JSON report with run provenance ✓ Done

1. JSON reports now include a `ci` block (`runId`, `sha`, `actor`, `repository`, `runUrl`) when `GITHUB_ACTIONS=true`.
2. `action.yml` uploads the full output directory as a retained artifact via `actions/upload-artifact@v4` (365-day retention by default).
3. `upload-artifacts` input (default `true`) and `retention-days` input added. `artifact-url` output exposed for downstream steps.

### P2.8 — Attestation for MANUAL checks via committed files + Sigstore ✓ Done

`rulestatus attest` handles two modes:

**ASSERT-ID mode** (`rulestatus attest ASSERT-EU-AI-ACT-013-001-01`): generates `.rulestatus/attestations/<ASSERT-ID>.yaml` — a structured YAML template the user fills in and commits. The git commit provides identity, timestamp, and immutability. Idempotent: skips if already exists.

**File mode** (`rulestatus attest bundle.tar.gz`): computes SHA-256, writes `<file>.sha256` and `<file>.attestation.json`. With `--provider github`: calls `gh attestation create` (Sigstore/Rekor, OIDC-backed). With `--provider cosign`: calls `cosign attest`. Auto-selects `github` provider when `GITHUB_ACTIONS=true`.

`action.yml` has `attest` input (default `false`, requires `id_token: write`); when enabled, bundles and attests after each run.

### P2.9 — Per-evidence-item hashing at collection time

Current attestation covers the output bundle (`rulestatus attest bundle.tar.gz` → SHA-256 + Sigstore). What it cannot prove: which specific version of `docs/risk_register.json` was on disk when a rule evaluated it.

Extend `EvidenceRegistry` to record a SHA-256 digest and file path for every document it loads. Attach this as an `evidenceSources` array to `RuleResult`. Include in JSON report output.

This closes the chain: `git commit` → `CI run` → `evidence hash per rule` → `bundle hash` → `Sigstore attestation`. Any auditor can verify that a specific file version produced a specific finding.

### P2.10 — Evidence strength / confidence levels on findings

The rule engine is binary: a document either exists and has the required fields or it doesn't. This misses the "weak signal" case where a file is present but barely satisfies the check (e.g. a risk register with one entry, a bias assessment covering one demographic).

Add a `confidence` field to `RuleResult` with values `strong | moderate | weak`. Rules set confidence based on how thoroughly evidence satisfies the obligation, not just whether it's present. Surface in console output and PDF report. Auditors can then distinguish a robust control from a minimum-viable one without rejecting the tool's output entirely.

### P2.11 — Secrets and PII redaction in evidence collectors

`FilesystemCollector` reads files verbatim and their content flows into JSON reports and bundles. A risk register or model card containing API keys, connection strings, or personal data will be captured unfiltered.

Add a redaction pass in `EvidenceRegistry` before any document content is serialized into a result or report:
- Strip values matching common secret patterns (API key formats, connection strings, bearer tokens)
- Flag fields named `password`, `secret`, `token`, `key` as `[REDACTED]`
- Add a `redactedFields` count to the evidence source record so omissions are visible to auditors

This is a data governance requirement before the tool can be run in regulated environments.

### P2.5 — `rulestatus update` command

Check for new versions of the rule library. Regulation amendments create new/modified/deprecated assertions. Teams need to know when to re-run and what changed.

```
$ rulestatus update
  Checking for rule library updates...
  eu-ai-act: 2 new assertions, 1 modified (art-9-2-c), 0 deprecated
  Run `rulestatus run` to see your updated compliance status.
```

---

## Phase 3 — Platform & Expansion (Weeks 11–16+)

### P3.1 — Additional frameworks

Priority order based on ICP (seed/Series A AI startups selling into EU enterprises):

1. ISO/IEC 42001 — directly complementary to EU AI Act, auditors ask for both
2. NIST AI RMF — required for US federal and enterprise sales
3. Colorado SB 21-169 — first US state law with EU-like obligations
4. NYC Local Law 144 — hiring AI, narrower but concrete
5. China - Generative AI Interim Measures
6. China - Algorithm Recommendation Provisions
7. China - Deep Synthesis Provisions
8. South Korea — AI Basic Act
9. Singapore — Model AI Governance Framework / AI Verify
10. Japan — AI Promotion Act 
11. ASEAN AI Governance Framework
12. OECD AI Principles

Each framework needs the full Stage 1–4 pipeline treatment, not just test stubs.

### P3.2 — Explicit ICP targeting

The first paying user is: a seed/Series A AI startup selling into EU enterprises, being asked for EU AI Act readiness in security reviews. They have no compliance team, their engineers can fix FAIL messages, and they will pay to avoid a $30M/1.5%-of-revenue fine.

This should be reflected in:
- `rulestatus init` flow (ask about enterprise sales context, not just actor/risk-level)
- `explain` output (frame remediation in terms of "what your enterprise customer will ask for")
- Landing page messaging
- Pricing page (the fear is regulatory risk, not compliance overhead)

### P3.3 — VS Code extension

Real-time compliance linting as engineers write model cards, risk registers, and configs. Surface WARN/FAIL inline with squiggles. `explain` on hover. Low effort to implement given SARIF output already works — VS Code reads SARIF natively via the `errorlens`/`sarif-viewer` ecosystem.

### P3.4 — Docs site + open-source launch

- Framework reference: every assertion ID, its legal basis, its evidence spec
- "Getting started in 5 minutes" (requires P1.1 generate command to be true)
- Contribution guide: how to propose new assertions or flag incorrect ones
- Methodology overview (public-facing version of P2.2)

### P3.5 — Open question: LegalXML standard

Raised in PRD §4 Stage 1. Whether to adopt LegalXML/Akoma Ntoso for the obligation registry format or keep a custom YAML schema. Decision affects interoperability with legal tools and how legal analysts import regulation text. Needs input from whoever the first legal analyst partner is.

---

## Deferred / Under Evaluation

- **SaaS dashboard** — multi-project view, team seats, evidence vault hosting. Only makes sense after CLI has paying users.
- **Auditor Platform tier** — white-label reports, multi-client management. Requires at least one auditor partner engaged first.
- **Obligation graph visualization** — the dependency graph from Stage 2 is powerful for understanding which obligations cascade. Useful for the dashboard but over-engineered for CLI.
- **Benchmark data / percentile scoring** — "your system is in the 73rd percentile for EU AI Act readiness." Requires distribution (100+ teams running). Build the data model now, surface it later.
