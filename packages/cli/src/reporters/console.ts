import chalk from "chalk";
import type { RuleResult, RunReport } from "../core/result.js";
import { attested, failed, manual, passed, skipped, warned } from "../core/result.js";
import type { Reporter } from "./types.js";

const FRAMEWORK_LABEL: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "iso-42001": "ISO 42001",
  "nist-ai-rmf": "NIST AI RMF",
  "colorado-sb24-205": "Colorado AI Act (SB 24-205)",
};

const STATUS_FORMAT: Record<string, (s: string) => string> = {
  PASS: chalk.bold.green,
  FAIL: chalk.bold.red,
  WARN: chalk.bold.yellow,
  SKIP: chalk.dim,
  MANUAL: chalk.bold.blue,
  ATTESTED: chalk.bold.cyan,
};

export class ConsoleReporter implements Reporter {
  async render(report: RunReport): Promise<void> {
    const multiFramework = report.framework === "all";
    const fwLabel = multiFramework ? "All Frameworks" : frameworkLabel(report.framework);
    console.log();
    console.log(`  ${chalk.bold("Rulestatus v1.0")} — ${fwLabel}`);
    console.log(`  System: ${report.systemName}`);
    console.log(`  Actor: ${report.actor} | Risk level: ${report.riskLevel}`);
    console.log(`  ${"─".repeat(50)}`);

    const crossRef = multiFramework ? buildCrossFrameworkMap(report.results) : new Map();

    if (multiFramework) {
      const byFramework = groupByFramework(report.results);
      for (const [fw, fwResults] of Object.entries(byFramework).sort()) {
        console.log(`\n  ${chalk.bold(frameworkLabel(fw))}`);
        renderArticleGroups(fwResults, crossRef);
      }
    } else {
      renderArticleGroups(report.results, crossRef);
    }

    const p = passed(report).length;
    const f = failed(report).length;
    const w = warned(report).length;
    const s = skipped(report).length;
    const m = manual(report).length;
    const a = attested(report).length;

    console.log(`\n  ${"─".repeat(50)}`);
    const parts = [
      chalk.green(`${p} passed`),
      chalk.red(`${f} failed`),
      chalk.yellow(`${w} warnings`),
      chalk.dim(`${s} skipped`),
      ...(a > 0 ? [chalk.cyan(`${a} attested`)] : []),
      chalk.blue(`${m} manual`),
    ];
    console.log(`  Results: ${parts.join(" | ")}`);

    const criticalFails = failed(report).filter((r) => r.severity === "critical");
    if (criticalFails.length > 0) {
      console.log(
        chalk.bold.red(`  Critical evidence gaps: ${criticalFails.length} — pipeline BLOCKED`),
      );
    } else if (f > 0) {
      console.log(chalk.yellow(`  Non-critical evidence gaps: ${f}`));
    } else if (w > 0) {
      console.log(chalk.yellow(`  Evidence warnings — review recommended`));
    } else {
      console.log(chalk.bold.green("  All evidence items found ✓"));
    }
    console.log(
      chalk.dim(
        "  Note: evidence present ≠ legally compliant. Not legal advice or a conformity assessment.",
      ),
    );
    console.log();
  }
}

function renderArticleGroups(results: RuleResult[], crossRef: Map<string, RuleResult[]>): void {
  const byArticle = groupByArticle(results);

  for (const [article, articleResults] of Object.entries(byArticle).sort(articleSort)) {
    console.log(`\n    ${chalk.bold(`Art. ${article}`)}`);
    for (const r of articleResults) {
      const fmt = STATUS_FORMAT[r.status] ?? ((s: string) => s);
      const statusLabel = fmt(r.status.padEnd(6));
      const idLabel = chalk.dim(r.ruleId.padEnd(36));
      const confLabel = r.status === "PASS" ? confidenceBadge(r.confidence) : "";
      console.log(`      ${statusLabel} ${idLabel} ${r.title}${confLabel}`);
      if (r.status === "ATTESTED") {
        console.log(
          `        ${chalk.dim(`-> Attested by: ${r.attestedBy} on ${r.attestedAt} (expires ${r.attestationExpiresAt})`)}`,
        );
      } else if (
        r.message &&
        (r.status === "FAIL" || r.status === "WARN" || r.status === "MANUAL")
      ) {
        for (const line of r.message.split("\n").slice(0, 3)) {
          if (line.trim()) console.log(`        ${chalk.dim(`-> ${line.trim()}`)}`);
        }
      }
      if (r.evidenceSources.length > 0) {
        for (const src of r.evidenceSources) {
          console.log(`        ${chalk.dim(`   ${src.filePath} [${src.sha256.slice(0, 8)}]`)}`);
        }
      }
    }

    // Collect unique cross-framework peers for the whole article group
    const peers = collectArticlePeers(articleResults, crossRef);
    if (peers.length > 0) {
      const peerStr = peers
        .map((p) => chalk.cyan(`${frameworkLabel(p.framework)} ${p.article}`))
        .join(", ");
      console.log(`      ${chalk.dim("↳ Also satisfies:")} ${peerStr}`);
    }
  }
}

/** For each PASS/ATTESTED rule in the group, collect unique peer rules from other frameworks. */
function collectArticlePeers(
  results: RuleResult[],
  crossRef: Map<string, RuleResult[]>,
): RuleResult[] {
  const seen = new Set<string>();
  const peers: RuleResult[] = [];
  for (const r of results) {
    for (const peer of crossRef.get(r.ruleId) ?? []) {
      const key = `${peer.framework}:${peer.article.split(".")[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        peers.push(peer);
      }
    }
  }
  return peers;
}

/**
 * Builds a map from ruleId → peer rules from other frameworks that share the same cluster
 * and are also PASS or ATTESTED. Only includes rules that have at least one cross-framework peer.
 */
function buildCrossFrameworkMap(results: RuleResult[]): Map<string, RuleResult[]> {
  const clusterMap = new Map<string, RuleResult[]>();
  for (const r of results) {
    if (!r.cluster || (r.status !== "PASS" && r.status !== "ATTESTED")) continue;
    const arr = clusterMap.get(r.cluster) ?? [];
    arr.push(r);
    clusterMap.set(r.cluster, arr);
  }

  const result = new Map<string, RuleResult[]>();
  for (const r of results) {
    if (!r.cluster || (r.status !== "PASS" && r.status !== "ATTESTED")) continue;
    const peers = (clusterMap.get(r.cluster) ?? []).filter((m) => m.framework !== r.framework);
    if (peers.length > 0) result.set(r.ruleId, peers);
  }
  return result;
}

function frameworkLabel(fw: string): string {
  return FRAMEWORK_LABEL[fw] ?? fw;
}

function confidenceBadge(c: RuleResult["confidence"]): string {
  if (c === "strong") return "";
  if (c === "moderate") return chalk.dim(" [moderate]");
  return chalk.yellow(" [weak]");
}

function groupByFramework(results: RuleResult[]): Record<string, RuleResult[]> {
  const groups: Record<string, RuleResult[]> = {};
  for (const r of results) {
    if (!groups[r.framework]) groups[r.framework] = [];
    (groups[r.framework] as RuleResult[]).push(r);
  }
  return groups;
}

function groupByArticle(results: RuleResult[]): Record<string, RuleResult[]> {
  const groups: Record<string, RuleResult[]> = {};
  for (const r of results) {
    const key = r.article.split(".")[0] ?? r.article;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

function articleSort(a: [string, unknown], b: [string, unknown]): number {
  const aNum = Number.parseInt(a[0], 10);
  const bNum = Number.parseInt(b[0], 10);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
}
