import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Command } from "commander";
import type { ArrayReq, CheckNode, FieldReq } from "../core/check.js";
import { createRegistryWithFrameworks } from "../core/engine.js";
import { FRAMEWORK_LABEL, type RuleMeta } from "../core/rule.js";

// ── Public command ────────────────────────────────────────────────────────────

export function cmdExportMethodology(): Command {
  return new Command("export-methodology")
    .description("Generate assertion traceability methodology document from rule definitions")
    .option("--output <path>", "Output file path", "docs/methodology/assertion-traceability.md")
    .option("--framework <fw>", "Limit to one framework (e.g. eu-ai-act)")
    .action(async (opts: { output: string; framework?: string }) => {
      const registry = await createRegistryWithFrameworks([
        "eu-ai-act",
        "iso-42001",
        "nist-ai-rmf",
        "colorado-sb24-205",
      ]);
      let rules = [...registry.rules];
      if (opts.framework) rules = rules.filter((r) => r.framework === opts.framework);

      const md = buildDocument(rules);

      mkdirSync(dirname(opts.output), { recursive: true });
      writeFileSync(opts.output, md, "utf-8");

      console.log(`Methodology document written to ${opts.output}`);
      console.log(`  ${rules.length} assertions across ${countFrameworks(rules)} frameworks`);
      console.log("Regenerate with: rulestatus export-methodology");
    });
}

// ── Document builder ──────────────────────────────────────────────────────────

function buildDocument(rules: RuleMeta[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push("# Obligation → Assertion Traceability");
  lines.push("");
  lines.push(`> Generated: ${now}  `);
  lines.push("> Source of truth: `src/frameworks/*/`  ");
  lines.push("> Regenerate: `rulestatus export-methodology`  ");
  lines.push("> Do not edit manually.");
  lines.push("");
  lines.push("## About This Document");
  lines.push("");
  lines.push(
    "This document is auto-generated from the Rulestatus assertion DSL. It traces every regulatory obligation through to its encoded check, showing precisely what evidence the engine looks for, in what locations, and in what form.",
  );
  lines.push("");
  lines.push("Each assertion follows the pipeline:");
  lines.push("");
  lines.push(
    "```\nRegulation text → Obligation → Assertion ID → Evidence check → Remediation path\n```",
  );
  lines.push("");
  lines.push(
    "Assertions marked `not-reviewed` have been encoded by the Rulestatus team but have not yet received sign-off from a qualified legal professional. Do not rely on `not-reviewed` assertions as the sole basis for a conformity assessment.",
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Coverage summary table
  lines.push("## Coverage Summary");
  lines.push("");
  lines.push(
    "| Framework | Assertions | Obligations | Automated | Manual | Critical | Major | Minor | Info |",
  );
  lines.push(
    "|-----------|-----------|-------------|-----------|--------|----------|-------|-------|------|",
  );

  const byFramework = groupBy(rules, (r) => r.framework);
  for (const [fw, fwRules] of Object.entries(byFramework)) {
    const label = FRAMEWORK_LABEL[fw] ?? fw;
    const oblCount = new Set(fwRules.map((r) => r.obligation).filter(Boolean)).size;
    const automated = fwRules.filter((r) => r.check && r.check.kind !== "manual").length;
    const manual = fwRules.filter((r) => r.check?.kind === "manual" || r.fn).length;
    const critical = fwRules.filter((r) => r.severity === "critical").length;
    const major = fwRules.filter((r) => r.severity === "major").length;
    const minor = fwRules.filter((r) => r.severity === "minor").length;
    const info = fwRules.filter((r) => r.severity === "info").length;
    lines.push(
      `| ${label} | ${fwRules.length} | ${oblCount} | ${automated} | ${manual} | ${critical} | ${major} | ${minor} | ${info} |`,
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Per-framework assertion detail
  for (const [fw, fwRules] of Object.entries(byFramework)) {
    const label = FRAMEWORK_LABEL[fw] ?? fw;
    lines.push(`## ${label}`);
    lines.push("");

    const byArticle = groupBy(fwRules, (r) => r.article);
    for (const [article, articleRules] of Object.entries(byArticle)) {
      lines.push(`### ${article}`);
      lines.push("");

      for (const r of articleRules) {
        lines.push(...renderAssertion(r));
      }
    }
  }

  // Traceability matrix
  lines.push("---");
  lines.push("");
  lines.push("## Obligation → Assertion Traceability Matrix");
  lines.push("");
  lines.push("| Obligation ID | Article | Assertion IDs |");
  lines.push("|---------------|---------|---------------|");

  const oblMap = new Map<string, { article: string; ids: string[] }>();
  for (const r of rules) {
    if (!r.obligation) continue;
    if (!oblMap.has(r.obligation)) {
      oblMap.set(r.obligation, { article: r.article, ids: [] });
    }
    oblMap.get(r.obligation)?.ids.push(r.id);
  }
  for (const [oblId, { article, ids }] of oblMap) {
    lines.push(`| \`${oblId}\` | ${article} | ${ids.map((id) => `\`${id}\``).join(", ")} |`);
  }
  lines.push("");

  // Cross-framework cluster matrix
  const allClusters = [...new Set(rules.map((r) => r.cluster).filter(Boolean))].sort() as string[];
  if (allClusters.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Cross-Framework Cluster Map");
    lines.push("");
    lines.push(
      "Clusters group assertions from different frameworks addressing the same underlying obligation. A system satisfying one assertion in a cluster partially satisfies peer assertions in other frameworks.",
    );
    lines.push("");

    const frameworkKeys = Object.keys(byFramework);
    const headerCols = frameworkKeys.map((fw) => FRAMEWORK_LABEL[fw] ?? fw).join(" | ");
    lines.push(`| Cluster | ${headerCols} |`);
    lines.push(`|---------|${frameworkKeys.map(() => "---------|").join("")}`);

    for (const cluster of allClusters) {
      const cols = frameworkKeys.map((fw) => {
        const matched = rules.filter((r) => r.framework === fw && r.cluster === cluster);
        return matched.length > 0 ? matched.map((r) => `\`${r.id}\``).join("<br>") : "—";
      });
      lines.push(`| \`${cluster}\` | ${cols.join(" | ")} |`);
    }
    lines.push("");
  }

  // Statistics
  lines.push("---");
  lines.push("");
  lines.push("## Statistics");
  lines.push("");
  lines.push(`- **Total assertions:** ${rules.length}`);
  lines.push(
    `- **Total obligations:** ${new Set(rules.map((r) => r.obligation).filter(Boolean)).size}`,
  );
  lines.push(`- **Frameworks:** ${countFrameworks(rules)}`);
  lines.push(
    `- **Automated checks:** ${rules.filter((r) => r.check && r.check.kind !== "manual").length}`,
  );
  lines.push(
    `- **Manual attestation required:** ${rules.filter((r) => r.check?.kind === "manual" || r.fn).length}`,
  );
  lines.push(`- **Critical severity:** ${rules.filter((r) => r.severity === "critical").length}`);
  lines.push(`- **Major severity:** ${rules.filter((r) => r.severity === "major").length}`);
  lines.push(`- **Minor severity:** ${rules.filter((r) => r.severity === "minor").length}`);
  lines.push(
    `- **Cross-framework clusters:** ${new Set(rules.map((r) => r.cluster).filter(Boolean)).size}`,
  );
  lines.push(`- **Review status:** all assertions \`not-reviewed\` (pending legal sign-off)`);
  lines.push("");

  return lines.join("\n");
}

// ── Assertion renderer ────────────────────────────────────────────────────────

function renderAssertion(r: RuleMeta): string[] {
  const lines: string[] = [];

  lines.push(`#### \`${r.id}\` — ${r.title}`);
  lines.push("");

  // Metadata table
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Severity | \`${r.severity.toUpperCase()}\` |`);
  if (r.obligation) lines.push(`| Obligation | \`${r.obligation}\` |`);
  const appliesToStr = Object.entries(r.appliesTo)
    .map(([k, v]) => `${k}: \`${v}\``)
    .join(", ");
  if (appliesToStr) lines.push(`| Applies to | ${appliesToStr} |`);
  if (r.cluster) lines.push(`| Cluster | \`${r.cluster}\` |`);
  lines.push("| Review status | `not-reviewed` |");
  lines.push("");

  if (r.legalText) {
    lines.push("**Legal basis:**");
    lines.push("");
    lines.push(`> ${r.legalText}`);
    lines.push("");
  }

  if (r.check) {
    lines.push("**Evidence check:**");
    lines.push("");
    const checkLines = renderCheckNode(r.check, 0);
    lines.push(...checkLines);
    lines.push("");
  } else if (r.fn) {
    lines.push("**Evidence check:**");
    lines.push("");
    lines.push("Imperative check — logic defined in framework source. See framework module.");
    lines.push("");
  }

  if (r.remediation) {
    lines.push("**Remediation:**");
    lines.push("");
    lines.push(r.remediation);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  return lines;
}

// ── CheckNode → plain English ─────────────────────────────────────────────────

function renderCheckNode(node: CheckNode, depth: number): string[] {
  const indent = "  ".repeat(depth);
  switch (node.kind) {
    case "doc":
      return renderDoc(node, indent);
    case "structured":
      return renderStructured(node, indent);
    case "config":
      return renderConfig(node, indent);
    case "model-card":
      return renderModelCard(node, indent);
    case "api":
      return renderApi(node, indent);
    case "system-field":
      return renderSystemField(node, indent);
    case "manual":
      return [`${indent}Manual attestation required: *${node.reason}*`];
    case "any-of":
      return renderAnyOf(node.checks, depth);
  }
}

function renderDoc(node: Extract<CheckNode, { kind: "doc" }>, indent: string): string[] {
  const lines: string[] = [];
  const paths = node.paths.length > 0 ? node.paths.map((p) => `\`${p}\``).join(", ") : "any path";
  lines.push(`${indent}Search for a **${node.category}** document in: ${paths}`);
  if (node.fmts.length > 0) {
    lines.push(`${indent}Accepted formats: ${node.fmts.map((f) => `\`${f}\``).join(", ")}`);
  }
  if (node.reqs.length > 0) {
    lines.push(`${indent}Required fields:`);
    for (const req of node.reqs) {
      lines.push(`${indent}- ${renderFieldReq(req)}`);
    }
  }
  if (node.minCoverage) {
    const { threshold, fields } = node.minCoverage;
    lines.push(
      `${indent}At least **${threshold}** of these fields must be present: ${fields.map((f) => `\`${f}\``).join(", ")}`,
    );
  }
  return lines;
}

function renderStructured(
  node: Extract<CheckNode, { kind: "structured" }>,
  indent: string,
): string[] {
  const lines: string[] = [];
  const path = node.outputPath ?? `${node.name}.yaml`;
  lines.push(`${indent}Load structured file **\`${path}\`**`);
  if (node.reqs.length > 0) {
    lines.push(`${indent}Required fields:`);
    for (const req of node.reqs) {
      lines.push(`${indent}- ${renderFieldReq(req)}`);
    }
  }
  if (node.arrayReqs.length > 0) {
    for (const arr of node.arrayReqs) {
      lines.push(`${indent}Array field ${renderArrayField(arr.field)}:`);
      lines.push(...renderArrayReq(arr, `${indent}  `));
    }
  }
  return lines;
}

function renderConfig(node: Extract<CheckNode, { kind: "config" }>, indent: string): string[] {
  const lines: string[] = [];
  const path = node.outputPath ?? `config/${node.name}.yaml`;
  lines.push(`${indent}Check config file **\`${path}\`**`);
  if (node.reqs.length > 0) {
    lines.push(`${indent}Required fields:`);
    for (const req of node.reqs) {
      lines.push(`${indent}- ${renderFieldReq(req)}`);
    }
  }
  for (const vc of node.valueChecks) {
    lines.push(`${indent}Field \`${vc.path}\` must equal \`${JSON.stringify(vc.value)}\``);
  }
  for (const vi of node.valueInChecks) {
    lines.push(
      `${indent}Any of ${vi.fields.map((f) => `\`${f}\``).join(", ")} must be one of: ${[...vi.values].map((v) => `\`${v}\``).join(", ")}`,
    );
  }
  return lines;
}

function renderModelCard(
  node: Extract<CheckNode, { kind: "model-card" }>,
  indent: string,
): string[] {
  const lines: string[] = [];
  lines.push(`${indent}Check model card **\`model/model_card.yaml\`**`);
  if (node.reqs.length > 0) {
    lines.push(`${indent}Required fields:`);
    for (const req of node.reqs) {
      lines.push(`${indent}- ${renderFieldReq(req)}`);
    }
  }
  return lines;
}

function renderApi(node: Extract<CheckNode, { kind: "api" }>, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}Probe API endpoint \`${node.endpoint}\``);
  if (node.requireOk) lines.push(`${indent}Must return a 2xx response`);
  if (node.excludeStatus !== undefined)
    lines.push(`${indent}Must not return HTTP \`${node.excludeStatus}\``);
  return lines;
}

function renderSystemField(
  node: Extract<CheckNode, { kind: "system-field" }>,
  indent: string,
): string[] {
  const lines: string[] = [];
  lines.push(`${indent}System configuration field \`${node.field}\` must be set`);
  if (node.values && node.values.length > 0) {
    lines.push(`${indent}Valid values: ${[...node.values].map((v) => `\`${v}\``).join(", ")}`);
  }
  return lines;
}

function renderAnyOf(checks: CheckNode[], depth: number): string[] {
  const lines: string[] = [];
  const indent = "  ".repeat(depth);
  lines.push(`${indent}Satisfies the assertion if **any one** of the following checks passes:`);
  lines.push("");
  for (let i = 0; i < checks.length; i++) {
    const check = checks[i];
    if (!check) continue;
    lines.push(`${indent}**Option ${i + 1}:**`);
    lines.push("");
    lines.push(...renderCheckNode(check, depth + 1));
    lines.push("");
  }
  return lines;
}

// ── Field / array renderers ───────────────────────────────────────────────────

function renderFieldReq(req: FieldReq): string {
  let base: string;
  if (req.anyOf) {
    base = `Any of: ${req.anyOf.map((f) => `\`${f}\``).join(", ")}`;
  } else {
    base = `\`${req.field}\``;
  }
  if (req.withinMonths !== undefined) {
    base += ` *(must be a date within ${req.withinMonths} months)*`;
  }
  return base;
}

function renderArrayField(field: string | string[]): string {
  if (Array.isArray(field)) {
    return `(first of ${field.map((f) => `\`${f}\``).join(", ")} that exists)`;
  }
  return `\`${field}\``;
}

function renderArrayReq(req: ArrayReq, indent: string): string[] {
  const lines: string[] = [];
  if (req.minLength !== undefined) {
    lines.push(`${indent}Must have at least **${req.minLength}** entries`);
  }
  if (req.coversDimensions) {
    lines.push(
      `${indent}Must include entries covering dimensions: ${req.coversDimensions.map((d) => `\`${d}\``).join(", ")}`,
    );
  }
  if (req.hasAnyEntry) {
    const condStrs = req.hasAnyEntry.map((cond) => {
      const parts = Object.entries(cond).map(([k, v]) => {
        if (typeof v === "string") return `\`${k}: ${v}\``;
        if ("contains" in v) return `\`${k}\` contains \`${v.contains}\``;
        if ("exists" in v) return `\`${k}\` exists`;
        return `\`${k}\``;
      });
      return parts.join(" and ");
    });
    lines.push(`${indent}At least one entry must match: ${condStrs.join(", or ")}`);
  }
  if (req.coversAtLeast) {
    const { n, fromList } = req.coversAtLeast;
    lines.push(
      `${indent}Must include at least **${n}** of: ${[...fromList].map((v) => `\`${v}\``).join(", ")}`,
    );
  }
  return lines;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

function countFrameworks(rules: RuleMeta[]): number {
  return new Set(rules.map((r) => r.framework)).size;
}
