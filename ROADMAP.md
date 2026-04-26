# Rulestatus — Roadmap

## Current State (April 2026)

Core engine is functional: EU AI Act Articles 6, 9, 10, 11, 13, 14, 15 are encoded as executable tests. CLI commands `run`, `init`, `explain`, `report` work. Reporters: console, JSON, SARIF, PDF, badge. Evidence collectors: filesystem, config, model card, API probe, manual. GitHub Action (`action.yml`) exists.

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

This is what makes `explain` the killer feature the review identified.

### P1.3 — Fix console reporter double-render bug

`cmdRun.ts` lines 62–65: both branches of the `if (!formats.includes("console"))` block call `ConsoleReporter.render()`. The condition is inverted — console is rendered twice in some cases and the format selection logic is wrong.

### P1.4 — Open question: JUnit XML export

Raised in PRD §6. JUnit XML enables native GitHub/GitLab test result annotations (not just SARIF). Decision needed: add a `junit` format to `cmdRun` or defer to Phase 2.

### P1.5 — Update PRD code examples from Python to TypeScript

PRD §4 (Stage 4) shows Python SDK examples. The implementation is TypeScript/Bun. Before open-source launch this inconsistency will confuse contributors and evaluators.

---

## Phase 2 — Depth & Auditor Trust (Weeks 5–10)

Focus: make the tool produce output auditors actually accept as evidence.

### P2.1 — Evidence Bundle

Auditors don't trust ephemeral CI runs. They want a timestamped, versioned, immutable artifact that proves what was checked and what was found.

Introduce `rulestatus bundle` (or add `--bundle` flag to `run`) that produces a signed evidence package:

```
compliance-evidence-2026-04-26/
  manifest.json          ← hash of every input file used
  report.json            ← full run results with provenance chain
  evidence/
    risk_register.json   ← snapshot of the actual file checked
    model_card.yaml
    ...
  signature.json         ← timestamp + tool version + config hash
```

This is the artifact that goes to auditors, not a PDF report.

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
