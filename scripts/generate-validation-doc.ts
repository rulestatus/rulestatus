/**
 * Generates docs/methodology/assertion-validation.md from live RULE_REGISTRY
 * and test suite metrics. Run: bun scripts/generate-validation-doc.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// Side-effect imports populate RULE_REGISTRY
import "../packages/cli/src/frameworks/euAiAct/index.js";
import "../packages/cli/src/frameworks/iso42001/index.js";
import "../packages/cli/src/frameworks/nistAiRmf/index.js";
import "../packages/cli/src/frameworks/coloradoSb24205/index.js";
import { FRAMEWORK_BASELINES, RULE_REGISTRY } from "../packages/cli/src/core/rule.js";

const ROOT = import.meta.dir + "/..";
const OUT = join(ROOT, "docs/methodology/assertion-validation.md");

// ── gather test metrics ───────────────────────────────────────────────────────

const testResult = await $`bun test`
  .cwd(join(ROOT, "packages/cli"))
  .quiet()
  .nothrow();

let testFiles = 0;
let testsPassed = 0;
let testsFailed = 0;

// bun test prints summary to stderr: "25 pass\n0 fail\nRan 25 tests across 4 files."
const summary = testResult.stderr.toString() + testResult.stdout.toString();
const passMatch = summary.match(/(\d+) pass/);
const failMatch = summary.match(/(\d+) fail/);
const fileMatch = summary.match(/across (\d+) files?/);
if (passMatch) testsPassed = Number(passMatch[1]);
if (failMatch) testsFailed = Number(failMatch[1]);
if (fileMatch) testFiles = Number(fileMatch[1]);

// ── aggregate assertion stats ─────────────────────────────────────────────────

interface FrameworkStats {
  id: string;
  label: string;
  total: number;
  critical: number;
  major: number;
  minor: number;
  info: number;
  articles: Set<string>;
  clusters: Set<string>;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "iso-42001": "ISO/IEC 42001",
  "nist-ai-rmf": "NIST AI RMF",
  "colorado-sb24-205": "Colorado SB 24-205",
};

const statsMap = new Map<string, FrameworkStats>();

for (const rule of RULE_REGISTRY) {
  if (!statsMap.has(rule.framework)) {
    statsMap.set(rule.framework, {
      id: rule.framework,
      label: FRAMEWORK_LABELS[rule.framework] ?? rule.framework,
      total: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
      articles: new Set(),
      clusters: new Set(),
    });
  }
  const s = statsMap.get(rule.framework)!;
  s.total++;
  if (rule.severity === "critical") s.critical++;
  else if (rule.severity === "major") s.major++;
  else if (rule.severity === "minor") s.minor++;
  else if (rule.severity === "info") s.info++;
  s.articles.add(rule.article);
  if (rule.cluster) s.clusters.add(rule.cluster);
}

const frameworks = [...statsMap.values()];
const totalAssertions = frameworks.reduce((n, f) => n + f.total, 0);
const totalCritical = frameworks.reduce((n, f) => n + f.critical, 0);
const totalMajor = frameworks.reduce((n, f) => n + f.major, 0);
const totalMinor = frameworks.reduce((n, f) => n + f.minor, 0);

const allClusters = new Set(RULE_REGISTRY.flatMap((r) => (r.cluster ? [r.cluster] : [])));

const today = new Date().toISOString().slice(0, 10);

// ── render document ───────────────────────────────────────────────────────────

const doc = `# Assertion Validation Methodology

> Auto-generated ${today} from RULE_REGISTRY and test suite.
> Manually maintained sections are marked with **[HUMAN INPUT REQUIRED]**.

This document describes how Rulestatus validates that each assertion correctly encodes
its underlying regulatory obligation. It satisfies SCT-1.5 (assertion validation
methodology documentation) and scopes the evidence submitted to external legal counsel
for review (SCT-1.6).

---

## 1. Assertion Library — Current State

| Framework | Baseline | Assertions | Critical | Major | Minor | Articles/Clauses |
|---|---|---|---|---|---|---|
${frameworks
  .map((f) => {
    const baseline = FRAMEWORK_BASELINES[f.id];
    const baselineStr = baseline ? baseline.publishedDate : "—";
    return `| ${f.label} | ${baselineStr} | **${f.total}** | ${f.critical} | ${f.major} | ${f.minor} | ${f.articles.size} |`;
  })
  .join("\n")}
| **Total** | | **${totalAssertions}** | ${totalCritical} | ${totalMajor} | ${totalMinor} | |

**Cross-framework obligation clusters:** ${allClusters.size} clusters spanning all frameworks:
${[...allClusters]
  .sort()
  .map((c) => `\`${c}\``)
  .join(", ")}

---

## 2. Test Suite Coverage

| Metric | Value |
|---|---|
| Test files | ${testFiles} |
| Tests passing | **${testsPassed}** |
| Tests failing | ${testsFailed} |
| Test runner | Bun native (Jest-compatible API) |

Test files cover:

| File | What is tested |
|---|---|
| \`tests/unit/engine.test.ts\` | Rule filtering (framework, actor, severity), PASS/FAIL/MANUAL/SKIP result types |
| \`tests/unit/rule.test.ts\` | RULE_REGISTRY population, rule registration side effects |
| \`tests/unit/attestation.test.ts\` | Attestation file parsing, expiry logic, TODO-value detection, ATTESTED/MANUAL upgrade |
| \`tests/unit/filesystemCollector.test.ts\` | Document discovery, stem-matching preference, path ordering |

**Gap:** No per-assertion integration tests that run each rule against a known-good and
known-bad fixture. This is the primary test coverage gap and the main risk noted for
SCT-1.5. See Section 5 (Known Gaps).

---

## 3. Assertion Authoring Process

Each assertion follows the four-stage pipeline described in \`docs/methodology/review-process.md\`:

1. **Stage 1 — Obligation identification**: The regulatory text is read at the article/clause
   level. The specific obligation (what the system or provider must *do or produce*) is
   extracted as a single sentence. Ambiguous text is flagged for legal counsel review.

2. **Stage 2 — Evidence specification**: The obligation is mapped to an evidence artifact:
   a document (Doc check), structured field (Structured check), config file (Config check),
   model card field (ModelCard check), API endpoint (Api check), or manual attestation
   (Manual check). The check DSL in \`src/core/check.ts\` encodes this mapping.

3. **Stage 3 — Implementation**: The rule is coded in \`src/frameworks/<framework>/\`.
   The assertion ID follows the convention \`ASSERT-<FW>-<ARTICLE>-<SEQ>-<VERSION>\`.
   A \`cluster\` tag maps the assertion to its cross-framework obligation group.

4. **Stage 4 — Self-compliance verification**: \`rulestatus run\` is run on this repo.
   If the assertion fires incorrectly on a known-compliant artifact, the check is revised.

---

## 4. Review Status

### 4.1 Internal review

All ${totalAssertions} assertions have been authored and self-reviewed by Philipp Nagel
(Founder, Rulestatus) against the primary regulation texts. The \`reviewStatus\` field
in the exported registry (\`rulestatus export-registry\`) reflects the current review state.

Run \`rulestatus export-registry\` to inspect the full registry with \`reviewStatus\` fields.

### 4.2 External legal review **[HUMAN INPUT REQUIRED]**

| Field | Value |
|---|---|
| Reviewer name | **TBD** (SCT-0.5 — engagement pending) |
| Reviewer firm | **TBD** |
| Review date | **TBD** |
| Frameworks reviewed | EU AI Act, ISO/IEC 42001, NIST AI RMF, Colorado SB 24-205 |
| Assertions reviewed | ${totalAssertions} |
| Written opinion | **TBD** — will appear in PDF report footer once received |

*Update this section when SCT-0.5 (legal counsel engagement) is complete.*

---

## 5. Known Gaps and False Positive/Negative Categories

### 5.1 Structural false positive categories

| Category | Description | Affected assertions |
|---|---|---|
| Wrong file matched | Engine finds a file in the search path whose name doesn't match the expected document category | Mitigated by stem-matching fix (2026-05-10) |
| Field alias mismatch | User uses a field name not in the alias list | Mitigated by extensive alias lists in check DSL |
| YAML parse failure | Malformed user YAML silently prevents field check | Engine logs parse errors; assertion degrades to FAIL with message |

### 5.2 Structural false negative categories

| Category | Description | Affected assertions |
|---|---|---|
| Runtime obligation | Obligation requires runtime system behavior (e.g. Art. 12 logging) | Excluded by design; documented in "Articles not covered" |
| Content quality | Document exists and has the required field, but content is a placeholder | Not detected; engine checks field presence, not content quality |
| Delegation gap | Implementing act not yet published (e.g. Art. 7 Annex III updates) | Excluded by design; documented in "Articles not covered" |

### 5.3 Missing per-assertion fixture tests **[HUMAN INPUT REQUIRED]**

The test suite covers engine mechanics but does not include per-assertion pass/fail
fixture tests. These would run each rule against a minimal known-good YAML file
(should PASS) and a minimal known-bad file (should FAIL). This is the highest-priority
test gap to close before the legal review (SCT-1.6).

*To be addressed in a follow-up development cycle.*

---

## 6. Ongoing Monitoring

Assertion quality is monitored through:

1. **GitHub Issues** — users file issues with labels \`false-positive\` or \`false-negative\`.
   Triaged quarterly per the monitoring plan (\`docs/aims/monitoring-plan.yaml\`).

2. **Self-compliance run** — \`rulestatus run\` on this repo on every push. Any regression
   (assertion that fires incorrectly on the tool's own docs) is caught immediately in CI.

3. **Regulatory monitoring** — implementing acts tracked per
   \`docs/methodology/regulatory-monitoring.md\`. Affected assertions updated within
   30 days of a critical implementing act publication.

4. **External counsel feedback loop** — once SCT-1.6 is complete, legal counsel
   findings feed directly into assertion updates with conventional commit type \`fix:\`
   or \`feat:\` and a CHANGELOG entry referencing the legal opinion.
`;

writeFileSync(OUT, doc);
console.log(`Generated: docs/methodology/assertion-validation.md`);
console.log(`  ${totalAssertions} assertions across ${frameworks.length} frameworks`);
console.log(`  ${testsPassed} tests passing across ${testFiles} test files`);
