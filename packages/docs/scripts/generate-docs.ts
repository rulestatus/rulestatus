/**
 * Generates docs pages from CLI source. Run before astro build.
 *
 * Outputs:
 *   src/content/docs/frameworks/eu-ai-act.md
 *   src/content/docs/frameworks/iso-42001.md
 *   src/content/docs/frameworks/nist-ai-rmf.md
 *   src/content/docs/reference/commands.md
 *   src/content/docs/reference/config-schema.md
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Side-effect imports register rules into RULE_REGISTRY
import "../../cli/src/frameworks/euAiAct/index.js";
import "../../cli/src/frameworks/iso42001/index.js";
import "../../cli/src/frameworks/nistAiRmf/index.js";
import { RULE_REGISTRY, type RuleMeta } from "../../cli/src/core/rule.js";

const DOCS = join(import.meta.dir, "../src/content/docs");

// ── helpers ───────────────────────────────────────────────────────────────────

function severityBadge(s: string): string {
  const map: Record<string, string> = {
    critical: "danger",
    major: "caution",
    minor: "note",
    info: "tip",
  };
  return map[s] ?? "note";
}

function groupBy<T>(arr: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  }
  return m;
}

function articleSort(a: string, b: string): number {
  const parse = (s: string) => s.split(".").map(Number);
  const [a1 = 0, a2 = 0] = parse(a);
  const [b1 = 0, b2 = 0] = parse(b);
  return a1 !== b1 ? a1 - b1 : a2 - b2;
}

function appliesToStr(a: Record<string, string>): string {
  return Object.entries(a)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

// ── framework page ────────────────────────────────────────────────────────────

interface FrameworkMeta {
  id: string;
  title: string;
  description: string;
  intro: string;
  articleLabel: string;
}

const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: "eu-ai-act",
    title: "EU AI Act",
    description: "Executable assertions for high-risk AI providers under Regulation (EU) 2024/1689.",
    intro: `The EU AI Act (Regulation (EU) 2024/1689) is the world's first comprehensive AI law.
It applies primarily to **providers** of **high-risk AI systems** as defined in Annex III.
Rulestatus encodes the documentation and evidence obligations from Articles 6, 9, 10, 11, 13, 14, and 15
as executable checks.

All checks apply to \`actor: provider, riskLevel: high-risk\` unless otherwise noted.`,
    articleLabel: "Article",
  },
  {
    id: "iso-42001",
    title: "ISO/IEC 42001",
    description: "Executable assertions for AI Management System providers under ISO/IEC 42001:2023.",
    intro: `ISO/IEC 42001:2023 is the international standard for AI Management Systems (AIMS).
It follows the same high-level structure (HLS) as ISO 27001 and ISO 9001, covering context, leadership,
planning, support, operation, performance evaluation, and improvement.

Rulestatus encodes all mandatory AIMS clauses. Checks apply to \`actor: provider\` regardless of EU AI Act risk level.`,
    articleLabel: "Clause",
  },
  {
    id: "nist-ai-rmf",
    title: "NIST AI RMF",
    description: "Executable assertions covering all 4 core functions of the NIST AI Risk Management Framework 1.0.",
    intro: `The NIST AI Risk Management Framework 1.0 (NIST AI RMF) provides a voluntary framework
for managing AI risks across four core functions: **GOVERN**, **MAP**, **MEASURE**, and **MANAGE**.

Rulestatus encodes documentation and evidence requirements from all four functions.
Checks apply to \`actor: provider\` regardless of EU AI Act risk level.`,
    articleLabel: "Function",
  },
];

function generateFrameworkPage(fw: FrameworkMeta, rules: RuleMeta[]): string {
  const byArticle = groupBy(rules, (r) => r.article);
  const articles = [...byArticle.keys()].sort(articleSort);

  const counts = {
    critical: rules.filter((r) => r.severity === "critical").length,
    major: rules.filter((r) => r.severity === "major").length,
    minor: rules.filter((r) => r.severity === "minor").length,
  };

  const lines: string[] = [
    `---`,
    `title: "${fw.title}"`,
    `description: "${fw.description}"`,
    `---`,
    ``,
    `import { Badge } from '@astrojs/starlight/components';`,
    ``,
    fw.intro,
    ``,
    `## Summary`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Total assertions | **${rules.length}** |`,
    `| Critical | ${counts.critical} |`,
    `| Major | ${counts.major} |`,
    `| Minor | ${counts.minor} |`,
    ``,
    `## Assertions by ${fw.articleLabel}`,
    ``,
  ];

  for (const article of articles) {
    const articleRules = byArticle.get(article)!;
    const label = fw.articleLabel === "Article" ? `Article ${article}` : `Clause ${article}`;

    // Use the first rule's title as a section subtitle if it gives context
    lines.push(`### ${label}`);
    lines.push(``);

    for (const rule of articleRules) {
      lines.push(`#### \`${rule.id}\``);
      lines.push(``);
      lines.push(`**${rule.title}**`);
      lines.push(``);

      lines.push(
        `| Severity | Applies to |`,
        `|---|---|`,
        `| <Badge text="${rule.severity.toUpperCase()}" variant="${severityBadge(rule.severity)}" /> | ${appliesToStr(rule.appliesTo)} |`,
        ``,
      );

      if (rule.legalText) {
        lines.push(`> ${rule.legalText.replace(/\n/g, "\n> ")}`);
        lines.push(``);
      }

      if (rule.description) {
        lines.push(rule.description);
        lines.push(``);
      }

      if (rule.remediation) {
        lines.push(`**How to fix:** ${rule.remediation}`);
        lines.push(``);
      }

      lines.push(`---`);
      lines.push(``);
    }
  }

  return lines.join("\n");
}

// ── commands page ─────────────────────────────────────────────────────────────

function generateCommandsPage(): string {
  return `---
title: Commands
description: Complete CLI command reference for rulestatus.
---

## \`rulestatus init\`

Interactively creates a \`.rulestatus.yaml\` configuration file.

\`\`\`bash
rulestatus init
rulestatus init --actor provider --risk-level high-risk --frameworks eu-ai-act
\`\`\`

The first prompt asks **what's driving the setup** — enterprise security review, EU market deployment, internal audit, or exploring. The answer pre-selects the right defaults and produces a context-aware summary at the end.

For the enterprise security review path, the outro lists the four articles most commonly requested in EU AI vendor security reviews (Articles 9, 10, 11, 13) and the exact commands to fix each gap.

| Option | Default | Description |
|---|---|---|
| \`--actor\` | context-dependent | Actor type: \`provider\`, \`deployer\`, \`importer\`, \`distributor\` |
| \`--risk-level\` | context-dependent | Risk level: \`prohibited\`, \`high-risk\`, \`limited-risk\`, \`minimal-risk\` |
| \`--frameworks\` | context-dependent | Comma-separated frameworks to enable |
| \`--name\` | (prompt) | AI system name |

---

## \`rulestatus run\`

Run compliance checks and print results to the console (and optionally write report files).

\`\`\`bash
rulestatus run
rulestatus run --framework eu-ai-act --format console,json,sarif
rulestatus run --article 9 --severity critical
\`\`\`

| Option | Default | Description |
|---|---|---|
| \`--framework\` | all | Limit to one framework (e.g. \`eu-ai-act\`, \`iso-42001\`, \`nist-ai-rmf\`) |
| \`--article\` | all | Run only rules for this article/clause number |
| \`--severity\` | all | Run only rules at this severity or higher |
| \`--format\` | \`console\` | Output formats: \`console\`, \`json\`, \`sarif\`, \`pdf\`, \`badge\`, \`junit\` |
| \`--output\` | \`./compliance-reports\` | Output directory for report files |

Exits non-zero when any result at or above \`severity_gate.fail_on\` fails.

---

## \`rulestatus generate\`

Scaffold a compliance artifact template with inline field explanations.

\`\`\`bash
rulestatus generate                      # interactive picker
rulestatus generate risk-register
rulestatus generate --all                # scaffold everything at once
\`\`\`

| Template | Output path | Covers |
|---|---|---|
| \`risk-register\` | \`docs/risk_register.yaml\` | Art. 9.2 |
| \`risk-management\` | \`docs/risk-management/risk-management.yaml\` | Art. 9.1–9.3 |
| \`model-card\` | \`model/model_card.yaml\` | Art. 10, 11 |
| \`data-governance\` | \`docs/compliance/data-governance.yaml\` | Art. 10 |
| \`bias-assessment\` | \`docs/bias_assessment.yaml\` | Art. 10.2 |
| \`technical-doc\` | \`docs/compliance/technical-documentation.yaml\` | Art. 11 (Annex IV) |
| \`transparency-config\` | \`config/transparency.yaml\` | Art. 13.1, 13.4 |
| \`instructions-for-use\` | \`docs/compliance/instructions-for-use.yaml\` | Art. 13.2–13.4 |

---

## \`rulestatus explain\`

Show legal basis, last-run context, and remediation steps for a specific assertion.

\`\`\`bash
rulestatus explain ASSERT-EU-AI-ACT-009-001-01
\`\`\`

Prints the legal text, what the last run found (or didn't find), and the exact fix to apply. For EU AI Act rules, also shows **WHY THIS BLOCKS DEALS** — a plain-English explanation of why that specific gap stalls enterprise procurement.

---

## \`rulestatus report\`

Re-render a saved JSON results file in another format without re-running checks.

\`\`\`bash
rulestatus report compliance-reports/eu-ai-act-2025-01-01.json --format pdf
rulestatus report results.json --format sarif --output my-report.sarif
\`\`\`

| Option | Default | Description |
|---|---|---|
| \`--format\` | \`pdf\` | Output format: \`console\`, \`pdf\`, \`sarif\`, \`junit\`, \`badge\` |
| \`--output\` | \`compliance-report.<ext>\` | Output file path |

---

## \`rulestatus bundle\`

Package all compliance artifacts into an audit-ready \`.tar.gz\` archive.

\`\`\`bash
rulestatus bundle
rulestatus bundle --output artifacts/my-system-2025-01-01.tar.gz
\`\`\`

The archive contains:
- \`manifest.json\` — system metadata, framework list, last-run summary
- \`evidence/\` — all docs, config, model card, risk register files from your config paths
- \`reports/last-run.json\` — last run results with evidence hashes

| Option | Default | Description |
|---|---|---|
| \`--output\` | \`.rulestatus/<name>-<timestamp>.tar.gz\` | Output path |
| \`--name\` | system name from config | Bundle name prefix |

---

## \`rulestatus attest\`

Cryptographically sign a compliance artifact, or generate a manual sign-off template for a specific assertion.

\`\`\`bash
# Cryptographic attestation of a bundle file
rulestatus attest .rulestatus/my-system-2025-01-01.tar.gz
rulestatus attest bundle.tar.gz --provider github   # Sigstore via gh CLI (CI)
rulestatus attest bundle.tar.gz --provider cosign

# Manual sign-off template for a MANUAL-status assertion
rulestatus attest ASSERT-EU-AI-ACT-013-001-01
\`\`\`

In **file mode**, writes \`<file>.sha256\` and \`<file>.attestation.json\`. With \`--provider github\` or \`cosign\`, submits to Sigstore/Rekor for OIDC-backed proof.

In **ASSERT-ID mode**, writes \`.rulestatus/attestations/<ASSERT-ID>.yaml\` — a YAML template you fill in and commit. The git commit provides identity, timestamp, and immutability.

| Option | Default | Description |
|---|---|---|
| \`--provider\` | \`github\` in CI, \`none\` otherwise | Signing provider: \`github\`, \`cosign\`, \`none\` |
| \`--output\` | \`<file>.attestation.json\` | Output path for attestation JSON |

---

## \`rulestatus export-registry\`

Export all assertions and obligations as YAML files for legal review or integration.

\`\`\`bash
rulestatus export-registry
rulestatus export-registry --framework eu-ai-act --output ./my-registry
\`\`\`

Outputs per framework:
- \`registry/<framework>/assertions.yaml\` — one entry per assertion with full metadata
- \`registry/<framework>/obligations.yaml\` — deduplicated obligations listing their assertion IDs

| Option | Default | Description |
|---|---|---|
| \`--output\` | \`registry/\` | Output directory |
| \`--framework\` | all | Limit to one framework |

These files are generated — never edit them manually. Regenerate after any rule change.

---

## Global options

| Option | Description |
|---|---|
| \`--config <path>\` | Path to \`.rulestatus.yaml\` (default: auto-detected) |
| \`--version\` | Print version |
| \`--help\` | Show help |
`;
}

// ── config schema page ────────────────────────────────────────────────────────

function generateConfigSchemaPage(): string {
  return `---
title: Configuration Schema
description: Complete .rulestatus.yaml schema reference.
---

Rulestatus is configured via a \`.rulestatus.yaml\` file in your project root.
Run \`rulestatus init\` to create one interactively.

## Full example

\`\`\`yaml
system:
  name: "My Fraud Detection Model v1.0"
  actor: provider           # provider | deployer | importer | distributor
  risk_level: high-risk     # prohibited | high-risk | limited-risk | minimal-risk
  domain: "financial services"
  intended_use: "Automated fraud scoring for card transactions"
  api_base_url: "https://api.yourcompany.com"  # optional — used by API probe checks

frameworks:
  - eu-ai-act
  - iso-42001
  - nist-ai-rmf

evidence:
  docs_path: ./docs/compliance/   # scanned for documentation artifacts
  model_card: ./model/model_card.yaml
  risk_register: ./docs/risk_register.yaml
  config_path: ./config/          # scanned for transparency/config checks

reporting:
  format:
    - console
    - json
    - sarif
  output_dir: ./compliance-reports/
  badge: false                    # also write compliance-badge.svg

severity_gate:
  fail_on: critical   # exit non-zero when any critical check fails
  warn_on: major      # print warning for major failures (does not fail CI)
\`\`\`

---

## \`system\`

Describes your AI system. Used to filter which checks apply.

| Field | Type | Required | Description |
|---|---|---|---|
| \`name\` | string | yes | Human-readable system name, included in every report |
| \`actor\` | string | yes | Your role: \`provider\`, \`deployer\`, \`importer\`, \`distributor\` |
| \`risk_level\` | string | yes | EU AI Act risk classification: \`prohibited\`, \`high-risk\`, \`limited-risk\`, \`minimal-risk\` |
| \`domain\` | string | no | Business domain (e.g. \`healthcare\`, \`financial services\`) |
| \`intended_use\` | string | no | Free-text description of the system's purpose |
| \`api_base_url\` | string | no | Base URL for API probe checks (Article 14 human oversight endpoints) |

---

## \`frameworks\`

List of frameworks to run. Available values:

| Value | Description |
|---|---|
| \`eu-ai-act\` | EU AI Act — Articles 6, 9, 10, 11, 13, 14, 15 |
| \`iso-42001\` | ISO/IEC 42001:2023 — Clauses 4–10 |
| \`nist-ai-rmf\` | NIST AI RMF 1.0 — GOVERN, MAP, MEASURE, MANAGE |

---

## \`evidence\`

Paths where Rulestatus looks for compliance artifacts.

| Field | Default | Description |
|---|---|---|
| \`docs_path\` | \`./docs/compliance/\` | Directory scanned for documentation artifacts (risk registers, model cards, etc.) |
| \`model_card\` | _(empty)_ | Path to model card YAML |
| \`risk_register\` | _(empty)_ | Path to risk register JSON or YAML |
| \`config_path\` | \`./config/\` | Directory scanned for configuration files (transparency config, etc.) |
| \`api_base_url\` | _(empty)_ | Base URL for API probe checks (overrides \`system.api_base_url\`) |

---

## \`reporting\`

Controls how results are output.

| Field | Default | Description |
|---|---|---|
| \`format\` | \`[console]\` | List of output formats. Options: \`console\`, \`json\`, \`sarif\`, \`pdf\`, \`badge\`, \`junit\` |
| \`output_dir\` | \`./compliance-reports/\` | Directory for report files |
| \`badge\` | \`false\` | Always write \`compliance-badge.svg\` regardless of format list |

---

## \`severity_gate\`

Controls when rulestatus exits non-zero (fails CI).

| Field | Default | Description |
|---|---|---|
| \`fail_on\` | \`critical\` | Exit non-zero if any result at this severity or above fails |
| \`warn_on\` | \`major\` | Print a warning for results at this severity (does not fail CI) |

Severity levels in order: \`critical\` > \`major\` > \`minor\` > \`info\`.
`;
}

// ── main ──────────────────────────────────────────────────────────────────────

for (const fw of FRAMEWORKS) {
  const rules = RULE_REGISTRY.filter((r) => r.framework === fw.id);
  const content = generateFrameworkPage(fw, rules);
  const filename = fw.id === "iso-42001" ? "iso-42001.mdx" : `${fw.id}.mdx`;
  writeFileSync(join(DOCS, "frameworks", filename), content);
  console.log(`  generated frameworks/${filename}  (${rules.length} assertions)`);
}

// Rename .md → .mdx for framework pages (Astro needs MDX for Badge imports)
import { existsSync, unlinkSync } from "node:fs";
for (const fw of FRAMEWORKS) {
  const md = join(DOCS, "frameworks", `${fw.id}.md`);
  if (existsSync(md)) {
    unlinkSync(md);
    console.log(`  removed legacy ${fw.id}.md`);
  }
}

writeFileSync(join(DOCS, "reference", "commands.md"), generateCommandsPage());
console.log("  generated reference/commands.md");

writeFileSync(join(DOCS, "reference", "config-schema.md"), generateConfigSchemaPage());
console.log("  generated reference/config-schema.md");

console.log("\nDone. Run bun run dev to preview.");
