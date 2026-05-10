# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Rulestatus is "ESLint for AI law" — a compliance testing framework that encodes AI regulations (EU AI Act, ISO 42001, NIST AI RMF, Colorado SB 24-205) as executable assertions against documentation and configuration artifacts. It produces audit-grade signed attestations and integrates into CI/CD pipelines via SARIF output for GitHub Code Scanning.

## Monorepo Structure

- `packages/cli/` — Main TypeScript CLI application (the published `rulestatus` npm package)
- `packages/docs/` — Astro Starlight documentation site (auto-generates framework reference pages from `RULE_REGISTRY`)
- `config/` — Template configuration files for compliance frameworks
- `model/` — Model card templates
- `.rulestatus.yaml` — Active configuration for self-compliance testing

## Commands

All commands run from the repo root using **Bun** (>=1.1.0) and **pnpm** workspaces.

```bash
# Development
bun test              # Run all CLI tests
bun lint              # Biome format/lint check
bun lint:fix          # Auto-fix lint issues
bun typecheck         # TypeScript strict mode check
bun build             # Compile CLI to dist/rulestatus.js

# Run a single test file
cd packages/cli && bun test tests/unit/engine.test.ts

# CLI from source
cd packages/cli && bun dev <command>

# Docs site
bun docs:dev          # Local dev server
bun docs:build        # Static build
```

## Architecture

### Data Flow

```
.rulestatus.yaml → Engine → RULE_REGISTRY → EvidenceRegistry → RuleResult[] → Reporters
```

1. `loadConfig()` parses `.rulestatus.yaml` into `RulestatusConfig`
2. `Engine` lazily imports framework modules; importing them triggers side-effect `rule()` calls that populate `RULE_REGISTRY`
3. `Engine.collectRules()` filters the registry by framework, severity, actor, and risk_level
4. For each rule, a `SystemContext` (config + `EvidenceRegistry`) is created and the rule's `check` or `fn` is executed
5. Results aggregate into a `RunReport`, which reporters render to console/JSON/SARIF/PDF/JUnit/badge

### Key Files

| File | Purpose |
|------|---------|
| `src/cli/main.ts` | Commander.js entry point, registers all subcommands |
| `src/core/engine.ts` | `Engine` class — loads frameworks, filters rules, runs checks |
| `src/core/rule.ts` | `RULE_REGISTRY` global + `rule()` registration function |
| `src/core/check.ts` | Builder DSL — `Doc`, `Structured`, `Config`, `ModelCard`, `Api`, `SystemField`, `Manual`, `AnyOf` |
| `src/core/executor.ts` | Executes a single check against `SystemContext` |
| `src/evidence/registry.ts` | `EvidenceRegistry` — caches, hashes, and probes artifacts |
| `src/config/schema.ts` | Zod schemas for `.rulestatus.yaml` |
| `src/frameworks/` | One subdirectory per regulation; each module registers rules on import |

### Adding a New Rule

Rules are registered declaratively in a framework module using the builder DSL:

```typescript
rule({
  id: 'ASSERT-EU-ART13-001-A-1',   // ASSERT-<FRAMEWORK>-<ARTICLE>-<SEQ>[-VARIANT]-<VERSION>
  framework: 'eu-ai-act',
  article: 'Article 13',
  severity: SEVERITY.CRITICAL,
  appliesTo: { actors: ['provider'], riskLevels: ['high-risk'] },
  title: 'Transparency information disclosed',
  obligation: '...',
  remediation: '...',
  legalText: '...',
  cluster: 'transparency',         // cross-framework interop tag
  check: Doc.required('transparency_notice').atPath('docs/').inFormat('md'),
});
```

### Assertion ID Convention

`ASSERT-<FRAMEWORK>-<ARTICLE>-<SEQ>[-VARIANT]-<VERSION>`

Examples: `ASSERT-EU-ART9-003-A-1`, `ASSERT-ISO-C6-001-1`, `ASSERT-NIST-GOV-002-1`

### Confidence & Severity Model

- **Severity**: `CRITICAL` (blocks legal use) → `MAJOR` → `MINOR` → `INFO`
- **Confidence**: `strong` / `moderate` / `weak` — reflects evidence quality, reported to auditors
- CI gates in `.rulestatus.yaml`: `fail_on: critical`, `warn_on: major`
- Exit code 1 when critical gaps are found

### Reporters

Each reporter in `src/reporters/` receives a `RunReport` and writes to stdout or a file. Output formats: `console`, `json`, `sarif`, `junit`, `pdf`, `badge` (SVG).

### Evidence Collection

`EvidenceRegistry` provides typed methods that the builder DSL and imperative rule functions call:

- `findDocument(paths)` — filesystem search, parses MD/YAML/JSON/PDF/DOCX
- `loadStructured(path)` — YAML/JSON with shape validation
- `systemField(key)` — reads from `SystemContext` (system name, actor, risk_level, domain)
- `probe(url)` — HTTP endpoint probe with timeout/retry
- `requireManual(description)` — flags assertion as needing human review

## Tech Stack

- **Runtime**: Bun (>=1.1.0); Node.js >=18 for distributed package
- **Language**: TypeScript with strict mode
- **CLI framework**: Commander.js + @clack/prompts
- **Linter/formatter**: Biome (replaces ESLint + Prettier)
- **Test runner**: Bun's native test runner (Jest-compatible API)
- **PDF generation**: pdfkit
- **Docs**: Astro Starlight

## GitHub Action

`action.yml` defines the `rulestatus` composite action. The `.github/workflows/compliance.yml` workflow runs `rulestatus run --format sarif,json,pdf` on every PR and uploads SARIF to GitHub Code Scanning.
