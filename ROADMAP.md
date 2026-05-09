# Rulestatus — Roadmap

## Current State (May 2026)

Core engine is functional and publicly launched. EU AI Act (43 assertions), ISO/IEC 42001 (19 assertions), and NIST AI RMF (18 assertions) are encoded as executable tests. CLI commands `run`, `init`, `explain`, `generate`, `report`, `bundle`, `attest`, `export-registry` work. Reporters: console, JSON, SARIF, PDF, badge, JUnit XML. Evidence collectors: filesystem, config, model card, API probe, manual. GitHub Action (`action.yml`) runs per-framework, uploads retained artifacts, and optionally attests via Sigstore. JSON reports include CI provenance (run ID, SHA, actor) when running in GitHub Actions. All reporters use evidence-readiness framing with legal disclaimers.

Docs site live at rulestatus.com (Astro Starlight, deployed on Netlify). Framework reference pages auto-generated at build time from `RULE_REGISTRY` — always in sync with rule source. CONTRIBUTING.md covers assertion review process and framework contribution guide. Phases 1, 2, and 3.4a complete.

**What is already audit-grade (not gaps):**
- Evidence hashing + attestation: `rulestatus attest` computes SHA-256, writes `.sha256` + `.attestation.json`, and optionally submits to Sigstore/Rekor via `gh attestation create` or `cosign`. Immutable, OIDC-backed.
- System boundary declaration: `.rulestatus.yaml` requires `name`, `actor`, `riskLevel`, `domain`, `intendedUse`. Engine filters rules by actor and risk level.
- Over-claim guardrails: evidence-readiness language ("evidence gap" not "non-compliant"), mandatory disclaimer on every output surface, hardcoded `disclaimer` field in attestation JSON.
- Audit trail: JSON report captures all rule IDs, timestamps, durations, and CI provenance block per run.

**Genuine remaining gaps (addressed in Phase 2 below):**
- ~~No per-evidence-item hashing at collection time~~ — closed by P2.9.
- ~~Binary pass/fail with no confidence or evidence strength model~~ — closed by P2.10.
- No per-rule evidence trace in results — `explain` shows static remediation, not what was found at runtime. (P1.2 added dynamic failure context; full per-rule trace now in `evidenceSources` via P2.9.)
- ~~No secrets/PII redaction in evidence collectors~~ — closed by P2.11.

---

## Phase 1 — MVP Polish (Weeks 1–4)

Focus: make the tool actually usable on a real project from a cold start.

### P1.1 — Bootstrap: `rulestatus generate` command ✓ Done

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

### P1.2 — Enrich `explain` with dynamic failure context ✓ Done

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

### P2.3 — Separate obligation and assertion registries from code ✓ Done (superseded by P2.12 + P2.13)

Originally implemented as hand-written YAML files in `obligations/` and `assertions/`. Superseded: after P2.12 introduced the builder DSL, the YAML was redundant parallel maintenance. P2.13 replaced the static files with a generated export command.

### P2.4 — Reduce runtime API probe surface ✓ Done

Article 14 rules (`014-001-01`, `014-003-01`) previously had API probes as the first check in `anyOf`, causing spurious failures in CI where the system isn't running. Fixed: config/doc checks now come first, API probe moved to second-to-last, `manual()` added as final fallback. All-fail now yields `MANUAL` (human attestation required) instead of `FAIL`. Article 13's `013-001-01` fn escape hatch was already correct — it only probes the API when `hasApi()` is true and already falls through to `requireManual` when no response is returned.

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

### P2.9 — Per-evidence-item hashing at collection time ✓ Done

`EvidenceRegistry` records a SHA-256 digest, file path, and `redactedFields` count for every document loaded. Attached as `evidenceSources: EvidenceSource[]` on `RuleResult`; included in JSON report output. SHA-256 computed at read time in `FilesystemCollector`. Per-rule tracking via `resetForRule()` / `snapshotSources()` on the registry — sources accumulate during rule execution, snapshot taken after.

This closes the chain: `git commit` → `CI run` → `evidence hash per rule` → `bundle hash` → `Sigstore attestation`. Any auditor can verify that a specific file version produced a specific finding.

### P2.10 — Evidence strength / confidence levels on findings ✓ Done

`confidence: "strong" | "moderate" | "weak"` added to `RuleResult`. Defaults to `"strong"`. Rules call `system.evidence.setConfidence("weak" | "moderate")` to downgrade before returning. Engine reads confidence via `registry.getConfidence()` after rule execution and resets per rule. Surfaced in console output (badge shown for non-strong results) and included in JSON report. Auditors can distinguish a robust control from a minimum-viable one.

### P2.11 — Secrets and PII redaction in evidence collectors ✓ Done

`src/evidence/redact.ts` added. `redactData()` walks structured objects recursively: fields matching sensitive key names (`password`, `secret`, `token`, `key`, `api_key`, `credential`, etc.) and values matching secret patterns (OpenAI keys, GitHub tokens, JWTs, DB connection strings) are replaced with `"[REDACTED]"`. Applied in `EvidenceRegistry` when building `evidenceSources` records — rules still receive unredacted data for field checks, but the audit trail records `redactedFields` count per source so omissions are visible to auditors. Required before running in regulated environments.

### P2.13 — `rulestatus export-registry` command ✓ Done

`src/cli/cmdExportRegistry.ts` added. Hand-written YAML obligation/assertion files deleted. The command walks `RULE_REGISTRY`, serializes each `CheckNode` tree to YAML, and writes two files per framework:

```
registry/eu-ai-act/assertions.yaml    (43 assertions — one per rule)
registry/eu-ai-act/obligations.yaml   (34 obligations — deduplicated by obligationId)
```

Each assertion entry includes: id, obligationId, article, title, severity, appliesTo, legalText, remediation, structured `check` (mirrors the builder DSL), reviewStatus. Each obligation entry lists its `assertionIds`. The `reviewStatus: not-reviewed` field gives legal analysts a review workflow hook. Files are regenerated on demand — never edited manually.

### P2.12 — TypeScript builder DSL for rule checks ✓ Done

Rules previously expressed logic as imperative `async (system) => { ... }` functions. All six EU AI Act article files (`article6.ts`, `article9.ts`, `article10.ts`, `article11.ts`, `article13.ts`, `article14.ts`, `article15.ts`) migrated to a declarative builder DSL. `src/core/check.ts` provides builder classes (`Doc`, `Structured`, `Config`, `ModelCard`, `Api`, `AnyOf`, etc.) with factory functions (`doc()`, `structured()`, `config()`, `modelCard()`, `api()`, `anyOf()`). `src/core/executor.ts` interprets the resulting `CheckNode` tree at runtime. Rules with conditional logic that cannot be expressed declaratively (hard-fail if config present but disabled; skip-if-field-absent) retain an `fn` escape hatch. The DSL is both executable and statically inspectable — the YAML registries from P2.3 can now be generated from the same `CheckNode` tree rather than maintained separately.

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

### P3.1 — Additional frameworks ✓ ISO/IEC 42001 Done ✓ NIST AI RMF Done

**ISO/IEC 42001:2023** — AI Management System standard added. 7 clause files covering all mandatory AIMS clauses:

```
src/frameworks/iso42001/
  clause4.ts   — Context: AIMS scope, interested parties (2 rules)
  clause5.ts   — Leadership: AI policy, roles and responsibilities (3 rules)
  clause6.ts   — Planning: risks/opportunities, AI objectives (2 rules)
  clause7.ts   — Support: competence, awareness, document control (3 rules)
  clause8.ts   — Operation: risk assessment, impact assessment, lifecycle, controls (4 rules)
  clause9.ts   — Performance evaluation: monitoring, audit program, management review (3 rules)
  clause10.ts  — Improvement: corrective action, continual improvement (2 rules)
```

19 assertions, 18 obligations. Uses same builder DSL and executor as EU AI Act. `appliesTo: { actor: "provider" }` with no `riskLevel` — applies regardless of EU AI Act classification. Key AIMS artifacts: `aims-scope`, `ai-policy`, `aims-roles`, `ai-risk-assessment`, `ai-impact-assessment`, `ai-objectives`, `monitoring-plan`, `audit-program`, `management-review`, `corrective-action`.

**NIST AI RMF 1.0** — all 4 core functions added. 5 module files:

```
src/frameworks/nistAiRmf/
  govern.ts  — GOVERN: AI risk policy, risk tolerance, roles, communication, third-party policy (5 rules)
  map.ts     — MAP: system context/intended use, external factors, capabilities/limitations, likelihood/impact (4 rules)
  measure.ts — MEASURE: eval criteria, performance docs, fairness/bias metrics, security/adversarial robustness, third-party components (5 rules)
  manage.ts  — MANAGE: risk treatment plan, residual risks, incident response, production monitoring (4 rules)
```

18 assertions, 18 obligations. Same builder DSL. `appliesTo: { actor: "provider" }` with no `riskLevel`. Key artifacts: `ai-risk-policy`, `risk-tolerance`, `ai-rmf-roles`, `ai-system-card`, `bias-examination`, `security` docs, `risk-treatment-plan`, `incident-response`, `monitoring-plan`. All use `docs/ai-rmf/` as primary path.

Priority order for remaining frameworks (seed/Series A AI startups selling into EU enterprises):

1. ~~ISO/IEC 42001~~ — done
2. ~~NIST AI RMF~~ — done
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

### P3.4a — Docs site + open-source launch (rulestatus.com) ✓ Done

Full CLI and rule library are open-source (Apache 2.0). The docs site is the conversion surface — engineers find it, run it, then their company buys SaaS.

Deliverables:
- ✓ `rulestatus.com` landing page — ICP-targeted messaging: "your enterprise customer will ask for this before signing"
- ✓ Framework reference: every assertion ID, legal basis, evidence spec — auto-generated at build time from `RULE_REGISTRY` via `packages/docs/scripts/generate-docs.ts`. Never manually maintained.
- ✓ Getting started guide: `bun install -g rulestatus` → green run in under 10 minutes
- ✓ Contribution guide (`CONTRIBUTING.md`): how to propose new assertions, flag incorrect ones, add a framework, review criteria
- ✓ Methodology overview: public-facing pipeline — how law becomes a test, evidence model, assertion ID conventions
- ✓ Deployed on Netlify with auto-deploy on push to main and deploy previews on PRs

Implementation notes:
- Astro Starlight (`packages/docs/`) with `netlify.toml` at `base = packages/docs`
- `bun run build` runs `generate-docs.ts` first, which imports `RULE_REGISTRY` directly — framework pages are always in sync with the rule source
- Hand-written pages: quickstart, configuration, GitHub Actions, output formats, all methodology pages
- Auto-generated pages: all three framework reference pages, commands reference, config schema reference

### P3.4b — SaaS platform (Phase 4 track)

Separate track from P3.4a. See Phase 4 below.

### P3.5 — Open question: LegalXML standard

Raised in PRD §4 Stage 1. Whether to adopt LegalXML/Akoma Ntoso for the obligation registry format or keep a custom YAML schema. Decision affects interoperability with legal tools and how legal analysts import regulation text. Needs input from whoever the first legal analyst partner is.

---

## Phase 4 — SaaS Platform (post-launch)

Commercial product built on top of the open-source CLI. Do not start until the CLI has ≥500 installs and ≥1 paying team — otherwise building before learning what buyers actually want.

### P4.1 — Amendment service (first paid feature)

When a regulation is amended, Pro+ teams get assertion updates within days. Free users get them on the next release cycle. This is the clearest standalone paid value: recurring, high-stakes, impossible to self-serve reliably.

Requires: rule versioning system, release pipeline, notification service (email/webhook).

### P4.2 — Dashboard

Multi-project compliance overview, historical trend per framework, per-article drill-down, team activity. Auth + multi-tenant project storage + read API over run results. Single most important SaaS feature for team buyers.

### P4.3 — Evidence vault

Hosted secure storage for evidence bundles, attestations, and audit artifacts. Replaces the local `.rulestatus/` directory with a tamper-evident cloud store. Signed URLs for external auditor access (feeds P4.4).

### P4.4 — Audit portal

Read-only external access for auditors and enterprise customers doing vendor security reviews. Auditor gets a URL → logs in → sees compliance history, evidence bundles, attestations. No PDF email chain. This is the trigger for Team tier conversion.

### P4.5 — Benchmark data + industry percentile scoring

Anonymised, aggregated compliance scores across the user base. "Your system is in the 73rd percentile for EU AI Act readiness." Requires distribution (500+ teams). Build the data model in P4.2; surface the benchmarks in Auditor Platform tier once data exists.

---

## Deferred / Under Evaluation

- **Obligation graph visualization** — dependency graph showing which obligations cascade from others. Powerful for the dashboard, over-engineered for CLI. Revisit in P4.2.
- **SaaS dashboard, evidence vault, audit portal, benchmark data** — all now scoped in Phase 4. Not deferred, just sequenced after CLI distribution is established.
- **Auditor Platform tier** — requires at least one auditor partner engaged first. Start conversations once P3.4a (docs site) is live.
