# Rulestatus — Roadmap

## Current State (May 2026)

Core engine is functional and publicly launched. EU AI Act (43 assertions), ISO/IEC 42001 (19 assertions), NIST AI RMF (18 assertions), and Colorado AI Act / SB 24-205 (12 assertions) are encoded as executable tests. CLI commands `run`, `init`, `explain`, `generate`, `report`, `bundle`, `attest`, `export-registry` work. Reporters: console, JSON, SARIF, PDF, badge, JUnit XML. Evidence collectors: filesystem, config, model card, API probe, manual. GitHub Action (`action.yml`) runs per-framework, uploads retained artifacts, and optionally attests via Sigstore. JSON reports include CI provenance (run ID, SHA, actor) when running in GitHub Actions. All reporters use evidence-readiness framing with legal disclaimers.

Docs site live at rulestatus.com (Astro Starlight, deployed on Netlify). Framework reference pages auto-generated at build time from `RULE_REGISTRY` — always in sync with rule source. CONTRIBUTING.md covers assertion review process and framework contribution guide. Phases 1, 2, and 3.1–3.5 complete. All four frameworks carry `cluster` tags; `--all` runs show cross-framework `↳ Also satisfies:` annotations derived at runtime from rule definitions — no static mapping table.

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
rulestatus generate --framework eu-ai-act   → 16 templates (docs/, model/, config/)
rulestatus generate --framework iso-42001   → ~10 templates (docs/aims/, docs/iso42001/)
rulestatus generate --framework nist-ai-rmf → ~9 templates (docs/nist-ai-rmf/)
rulestatus generate --all                   → all frameworks at once
```

Templates are auto-derived from rule definitions via `templateExtractor.ts` — the same DSL that the engine executes also drives template generation. Adding a new rule automatically adds its fields to the relevant output file. All three node kinds are handled: `Doc` (path-based documents), `Structured` (YAML with required array shape), `ModelCard` (`model/model_card.yaml`), and `Config` (`config/*.yaml`). Each generated file includes inline comments with the assertion ID that requires each field.

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

### P2.5 — `rulestatus update` command ✓ Done

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
3. ~~Colorado SB 24-205~~ — done
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

### P3.2 — Explicit ICP targeting ✓ Done

The first paying user is: a seed/Series A AI startup selling into EU enterprises, being asked for EU AI Act readiness in security reviews. They have no compliance team, their engineers can fix FAIL messages, and they will pay to avoid a $30M/1.5%-of-revenue fine.

- ✓ `rulestatus init` — opens with "What's driving this?" context question; enterprise-review path pre-selects correct defaults and ends with a list of the four articles enterprise security reviews focus on; scans repo for existing compliance artifacts (risk registers, model cards, bias assessments, etc.) and pre-fills evidence paths — generates only what's missing
- ✓ `explain` — new "WHY THIS BLOCKS DEALS" section per article, framed around procurement friction not legal text; also fixed to load all three frameworks
- ✓ Landing page messaging — ICP-targeted hero copy ("your enterprise customer will ask for this before signing")
- Pricing page — deferred to P3.4b (SaaS platform track)

### P3.3 — Demo repo ("the sales deck repo") ✓ Done (dogfooding)

A public GitHub repository that runs Rulestatus against a realistic high-risk AI system (fraud detection model) and publishes the results. The product sells itself when a prospect can fork it and see their own situation reflected.

Deliverables:
- Public repo with a realistic but fictional fraud detection model — model card, risk register, bias assessment, technical docs, all pre-filled with plausible content
- GitHub Actions workflow running `rulestatus run --format sarif,pdf` on every push
- SARIF output uploaded to GitHub Code Scanning (gaps visible as PR annotations)
- PDF evidence readiness report published as a GitHub Pages artifact
- README explaining what each gap means and how to fix it — mirrors the enterprise review conversation

This is marketing infrastructure, not a code feature. It should be the first link sent to any prospect asking "can you show me what this looks like on a real project?"

### P3.3b — VS Code extension

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

**Pricing model (decided now, implemented in Phase 4):** charge per AI system (asset), not per seat. One AI system = one `.rulestatus.yaml`. Rationale: the unit of value is "this system is evidence-ready for regulators," not "this engineer ran a command." Per-attestation pricing is an alternative for high-volume use cases (e.g. a consultancy running audits for clients). Do not charge per seat — compliance tools with per-seat pricing die in procurement because the buyer (legal/compliance) isn't the user (engineering).

Tiers:
- **Free** — 1 AI system, filesystem collector, CLI only
- **Pro** — unlimited systems, Confluence + Google Drive connectors, PDF reports with provider branding, amendment notifications
- **Enterprise** — all connectors, audit portal (P4.4), SSO, SLA

### P3.5 — Framework interoperability layer ✓ Done

EU AI Act, ISO 42001, and NIST AI RMF overlap significantly. A user running all three today sees three separate reports with redundant gaps. The interoperability layer maps assertions across frameworks and surfaces shared coverage.

```
  EU AI Act
    Art. 9 (Risk Management)
      PASS   ASSERT-EU-AI-ACT-009-002-A-01   Risk register exists and is populated
      ↳ Also satisfies: ISO 42001 8.2, NIST AI RMF MAP 5.1
```

Implementation: `cluster?: string | undefined` added to `RuleMeta` and `RuleResult`. Each rule file is the single source of truth — no secondary mapping table. 12 obligation clusters span all three frameworks: `ai-risk-management`, `incident-response`, `training-data`, `bias-fairness`, `technical-documentation`, `performance-monitoring`, `security-robustness`, `ai-policy-governance`, `roles-responsibilities`, `transparency-disclosure`, `human-oversight`, `impact-assessment`. The engine passes `cluster` through to results; the console reporter derives cross-framework annotations at render time by grouping PASS/ATTESTED results by cluster and finding peers from other frameworks.

Console multi-framework output groups by framework → article. After each article group, if any passing rule has cluster peers in other frameworks, a `↳ Also satisfies:` line is printed. Adding a new framework with cluster-tagged rules automatically participates — no reporter changes needed.

This is the main argument against "framework fatigue" and makes the multi-framework value prop clear to buyers who are asked about both EU AI Act and ISO 42001 in the same security review.

### P3.6 — MANUAL check workflow ✓ Done

`rulestatus run` currently surfaces MANUAL results but has no way to track them across runs. After `rulestatus attest ASSERT-ID`, the attestation file is written — but the next `rulestatus run` still shows MANUAL with no indication it has been attested. If 30% of checks are MANUAL and none of them resolve, the tool feels broken.

The fix: after each run, cross-reference MANUAL results against existing attestation files in `.rulestatus/attestations/`. If a valid attestation exists, surface it as `ATTESTED` (not MANUAL) with the attestation date and attester identity. If the attestation is older than a configurable threshold (`attest_expiry`), downgrade back to MANUAL with a "re-attest required" message.

```
  Art. 14 - Human Oversight
    ATTESTED  ASSERT-EU-AI-ACT-014-001-01  Human oversight mechanisms documented
      -> Attested by: philipp@company.com on 2026-04-01 (expires 2026-10-01)
    MANUAL    ASSERT-EU-AI-ACT-014-002-01  Override endpoint documented
      -> No attestation found. Run: rulestatus attest ASSERT-EU-AI-ACT-014-002-01
```

Deliverables:
- ✓ `ATTESTED` result status in the runner and all reporters
- ✓ Attestation lookup in `engine.ts` — checks `.rulestatus/attestations/<ASSERT-ID>.yaml` after MANUAL result; upgrades to ATTESTED if valid, shows expiry warning if expired
- ✓ Default expiry 365 days — configurable via `attestExpiry` on config; expired attestations revert to MANUAL with message pointing to `rulestatus attest <ID>`
- ✓ SARIF: ATTESTED mapped to `level: "none"` so it doesn't trigger PR blocks
- ✓ Summary line includes attested count only when > 0: `3 passed | 1 gap | 2 attested | 0 manual`
- ✓ `src/core/attestation.ts` — pure loader with TODO-value detection; 11 unit tests in `tests/unit/attestation.test.ts`

### P3.7 — Open question: LegalXML standard

Raised in PRD §4 Stage 1. Whether to adopt LegalXML/Akoma Ntoso for the obligation registry format or keep a custom YAML schema. Decision affects interoperability with legal tools and how legal analysts import regulation text. Needs input from whoever the first legal analyst partner is.

---

## Phase 4 — SaaS Platform (post-launch)

Commercial product built on top of the open-source CLI. Do not start until the CLI has ≥500 installs and ≥1 paying team — otherwise building before learning what buyers actually want.

**Strategic direction — Evidence Pipeline, not Validator:** The CLI is a validator (it checks what exists). The SaaS product must be an evidence pipeline (it helps teams produce, store, route, and prove evidence). The difference: a validator tells you what's missing; a pipeline closes the loop by ingesting evidence from where it actually lives (Confluence, Jira, Google Docs), tracking it over time, and delivering it to whoever needs it (auditors, enterprise procurement, notified bodies). Every Phase 4 feature should move the product further along the pipeline, not just add more checks.

### P4.0 — Evidence ingestion connectors

The `FilesystemCollector` assumes structured YAML/JSON exists in the repo. In practice, evidence lives in Confluence, Notion, Google Docs, Jira, and Slack. Until connectors exist, the tool requires engineers to manually maintain YAML files — which is fine for the ICP (engineers) but blocks expansion to compliance officer buyers.

Connectors extract structured evidence fields from unstructured sources using an LLM extraction layer. Each connector maps to the same `EvidenceRegistry` interface — no changes to rules or reporters required.

Priority order:
1. Confluence — most common enterprise wiki, holds most policy documents
2. Google Drive / Docs — common at seed/Series A
3. Jira — for risk register and incident tracking evidence
4. Notion — common at startups

Pricing: connectors are the first natural paid feature. Free tier: filesystem only. Pro: Confluence + Google Drive. Enterprise: all connectors + custom mapping.

Do not start until: CLI has ≥200 installs and at least one team has hit the "we have the docs but not in YAML" blocker in a sales conversation.

### P4.1 — Policy editor

A web UI that visualizes the `CheckNode` tree for each assertion and lets compliance officers adjust thresholds, mark exceptions, and annotate results — without touching the CLI or YAML files. This is the bridge between the engineer ICP (who runs the CLI) and the compliance officer buyer (who owns the outcome).

Key views:
- Per-assertion detail: legal text → CheckNode tree → last run result → evidence files examined
- Exception workflow: mark an assertion as "accepted risk" with justification and expiry date — surfaces as `EXCEPTED` in CLI runs (similar to ATTESTED for MANUAL checks)
- Threshold editor: for numeric checks (e.g. bias assessment requires ≥3 protected characteristics), allow org-level overrides with audit trail

This is what makes the product defensible against "we'll just use the CLI for free." The editor requires the SaaS backend for state storage and audit trail.

### P4.2 — Amendment service (first paid feature)

When a regulation is amended, Pro+ teams get assertion updates within days. Free users get them on the next release cycle. This is the clearest standalone paid value: recurring, high-stakes, impossible to self-serve reliably.

Requires: rule versioning system, release pipeline, notification service (email/webhook).

### P4.3 — Dashboard

Multi-project compliance overview, historical trend per framework, per-article drill-down, team activity. Auth + multi-tenant project storage + read API over run results. Single most important SaaS feature for team buyers.

### P4.4 — Evidence vault

Hosted secure storage for evidence bundles, attestations, and audit artifacts. Replaces the local `.rulestatus/` directory with a tamper-evident cloud store. Signed URLs for external auditor access (feeds P4.4).

### P4.5 — Audit portal

Read-only external access for auditors and enterprise customers doing vendor security reviews. Auditor gets a URL → logs in → sees compliance history, evidence bundles, attestations. No PDF email chain. This is the trigger for Team tier conversion.

### P4.6 — Benchmark data + industry percentile scoring

Anonymised, aggregated compliance scores across the user base. "Your system is in the 73rd percentile for EU AI Act readiness." Requires distribution (500+ teams). Build the data model in P4.2; surface the benchmarks in Auditor Platform tier once data exists.

---

## Deferred / Under Evaluation

- **Obligation graph visualization** — dependency graph showing which obligations cascade from others. Powerful for the dashboard, over-engineered for CLI. Revisit in P4.2.
- **SaaS dashboard, evidence vault, audit portal, benchmark data** — all now scoped in Phase 4. Not deferred, just sequenced after CLI distribution is established.
- **Auditor Platform tier** — requires at least one auditor partner engaged first. Start conversations once P3.4a (docs site) is live.
