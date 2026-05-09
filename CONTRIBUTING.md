# Contributing to Rulestatus

Rulestatus is open source (Apache 2.0). Contributions that improve the accuracy of assertions, add new frameworks, or fix bugs are welcome.

## Types of contribution

### Flag an incorrect assertion

If an assertion makes a wrong claim about what a regulation requires — wrong article reference, wrong field name, wrong severity, wrong applies-to — open a GitHub issue with:

- The assertion ID (e.g. `ASSERT-EU-AI-ACT-009-002-B-01`)
- The specific claim you believe is incorrect
- A reference to the regulation text that contradicts it (article number + quote)

Legal corrections carry the highest bar. Include the source text.

### Propose a new assertion

Open an issue with:

1. **Framework and article** — which regulation, which provision
2. **Obligation** — one sentence: what must an organization demonstrably do or have?
3. **Evidence spec** — what artifact proves it? Which file paths? Which fields must be present?
4. **Legal text** — the exact quote from the regulation
5. **Applies to** — which actor types and risk levels does this apply to?

Assertions that cannot be checked via document structure (i.e. require human judgment to verify) should be `MANUAL` checks, not `FAIL` checks.

### Add a framework

Adding a new regulatory framework means encoding all its evidence obligations as `rule()` calls. Before starting:

1. Open an issue to discuss scope — which articles/clauses, which actor types
2. Read through an existing framework (`packages/cli/src/frameworks/euAiAct/`) to understand the pattern
3. Every assertion needs: `id`, `framework`, `article`, `severity`, `appliesTo`, `title`, `legalText`, `remediation`, and either a `check` (builder DSL) or `fn` (imperative fallback)

New framework files go in `packages/cli/src/frameworks/<frameworkId>/`. Register them in `packages/cli/src/cli/cmdExportRegistry.ts` and `packages/cli/src/cli/cmdRun.ts`.

### Fix a bug or improve the CLI

Standard GitHub flow: fork → branch → PR. Run `bun test` before submitting.

---

## Development setup

```bash
git clone https://github.com/rulestatus/rulestatus
cd rulestatus
bun install

# Run tests
bun test

# Run the CLI from source
cd packages/cli
bun src/cli/main.ts run

# Build the docs site
bun run docs:build
```

## Builder DSL quick reference

Most checks use the declarative builder DSL defined in `packages/cli/src/core/check.ts`.

```typescript
import { anyOf, doc, structured, config, modelCard, api } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

rule({
  id: "ASSERT-EU-AI-ACT-009-001-01",
  framework: "eu-ai-act",
  article: "9.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider", riskLevel: "high-risk" },
  title: "Risk management system documentation exists",
  obligation: "OBL-EU-AI-ACT-009-001",
  legalText: "Article 9(1): ...",
  remediation: "Create a risk management document in docs/risk-management/...",
  check: doc("risk-management")
    .inPaths(["docs/risk-management/", "compliance/"])
    .formats(["yaml", "md", "pdf"])
    .requireAny("system_name", "systemName")
    .requireAny("mitigation_measures", "mitigationMeasures")
    .withinMonths(12),
});
```

Use `anyOf(...)` when multiple evidence paths can satisfy an obligation. Use an imperative `fn` only when the logic cannot be expressed with the builder (conditional field checks, skip-if-absent, etc.).

## Assertion ID conventions

```
ASSERT-<FRAMEWORK>-<ARTICLE>-<SEQ>[-<VARIANT>]-<VERSION>
```

- Framework: `EU-AI-ACT`, `ISO-42001`, `NIST-AIRMF`
- Article: zero-padded to 3 digits for EU AI Act (`009`), clause prefix for ISO 42001 (`CL8`), function for NIST AI RMF (`GV`, `MP`, `MS`, `MG`)
- Sequence: three-digit number, optionally suffixed with a letter for sub-article variants
- Version: `01` initially, incremented on breaking logic changes

See [Assertion IDs](https://rulestatus.com/methodology/assertion-ids/) for full conventions.

## Review criteria

PRs that add or modify assertions are reviewed against:

1. **Legal accuracy** — does the assertion correctly represent what the regulation requires?
2. **Evidence specificity** — are the file paths and field names realistic for a real project?
3. **Severity calibration** — `critical` = blocks legal use; `major` = significant gap; `minor` = best practice
4. **No overclaiming** — assertions must check for evidence, not make legal conclusions

New framework additions require a legal review before merging. If you have legal expertise in a specific regulation and want to be a reviewer, mention it in your issue.
