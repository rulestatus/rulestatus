import chalk from "chalk";
import type { RuleResult, RunReport } from "../core/result.js";
import { failed, manual, passed, skipped, warned } from "../core/result.js";
import type { Reporter } from "./types.js";

const STATUS_FORMAT: Record<string, (s: string) => string> = {
  PASS: chalk.bold.green,
  FAIL: chalk.bold.red,
  WARN: chalk.bold.yellow,
  SKIP: chalk.dim,
  MANUAL: chalk.bold.blue,
};

export class ConsoleReporter implements Reporter {
  async render(report: RunReport): Promise<void> {
    const fw = report.framework === "all" ? "All Frameworks" : `EU AI Act (2024/1689)`;
    console.log();
    console.log(`  ${chalk.bold("Rulestatus v1.0")} — ${fw}`);
    console.log(`  System: ${report.systemName}`);
    console.log(`  Actor: ${report.actor} | Risk level: ${report.riskLevel}`);
    console.log(`  ${"─".repeat(50)}`);

    // Group by article prefix (e.g. "9", "10")
    const byArticle = groupByArticle(report.results);

    for (const [article, results] of Object.entries(byArticle).sort(articleSort)) {
      console.log(`\n  ${chalk.bold(`Art. ${article}`)}`);
      for (const r of results) {
        const fmt = STATUS_FORMAT[r.status] ?? ((s: string) => s);
        const statusLabel = fmt(r.status.padEnd(6));
        const idLabel = chalk.dim(r.ruleId.padEnd(36));
        console.log(`    ${statusLabel} ${idLabel} ${r.title}`);
        if (r.message && (r.status === "FAIL" || r.status === "WARN" || r.status === "MANUAL")) {
          for (const line of r.message.split("\n").slice(0, 3)) {
            if (line.trim()) console.log(`      ${chalk.dim(`-> ${line.trim()}`)}`);
          }
        }
      }
    }

    const p = passed(report).length;
    const f = failed(report).length;
    const w = warned(report).length;
    const s = skipped(report).length;
    const m = manual(report).length;

    console.log(`\n  ${"─".repeat(50)}`);
    console.log(
      `  Results: ${chalk.green(`${p} passed`)} | ${chalk.red(`${f} failed`)} | ` +
        `${chalk.yellow(`${w} warnings`)} | ${chalk.dim(`${s} skipped`)} | ${chalk.blue(`${m} manual`)}`,
    );

    const criticalFails = failed(report).filter((r) => r.severity === "critical");
    if (criticalFails.length > 0) {
      console.log(
        chalk.bold.red(`  Critical failures: ${criticalFails.length} — pipeline BLOCKED`),
      );
    } else if (f > 0) {
      console.log(chalk.yellow(`  Non-critical failures: ${f}`));
    } else if (w > 0) {
      console.log(chalk.yellow(`  Warnings present — review recommended`));
    } else {
      console.log(chalk.bold.green("  All checks passed ✓"));
    }
    console.log();
  }
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
  return Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10);
}
