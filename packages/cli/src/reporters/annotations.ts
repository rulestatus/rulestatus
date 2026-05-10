import { appendFileSync } from "node:fs";
import type { RunReport } from "../core/result.js";
import { failed, warned } from "../core/result.js";
import { gradeLabel, scoreReport } from "../core/score.js";
import type { Reporter } from "./types.js";

/**
 * Emits GitHub Actions workflow commands (::error / ::warning) that surface as
 * PR annotations in the Checks tab. Also writes a markdown summary to
 * $GITHUB_STEP_SUMMARY for the rich per-check report view.
 *
 * Safe to include in non-Actions runs: workflow commands are printed as plain
 * text and $GITHUB_STEP_SUMMARY won't be set, so the summary write is skipped.
 */
export class AnnotationsReporter implements Reporter {
  async render(report: RunReport): Promise<void> {
    const fails = failed(report);
    const warns = warned(report);
    const score = scoreReport(report);

    for (const r of fails) {
      const title = escapeCmd(`${r.ruleId} (${r.severity})`);
      const msg = escape(r.message ?? r.title);
      const detail = escape(`${r.article} — ${r.title}`);
      process.stdout.write(`::error title=${title}::${msg}%0A${detail}\n`);
    }
    for (const r of warns) {
      const title = escapeCmd(`${r.ruleId} (${r.severity})`);
      const msg = escape(r.message ?? r.title);
      const detail = escape(`${r.article} — ${r.title}`);
      process.stdout.write(`::warning title=${title}::${msg}%0A${detail}\n`);
    }

    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) return;

    const lines: string[] = [
      "## Rulestatus Compliance Check",
      "",
      `**Score: ${gradeLabel(score)}** | System: \`${report.systemName}\` | Actor: ${report.actor} | Risk: ${report.riskLevel}`,
      "",
    ];

    if (fails.length === 0 && warns.length === 0) {
      lines.push("✅ All evidence items found — no gaps detected.");
    } else {
      lines.push("| Status | Rule | Article | Severity | Finding |");
      lines.push("|--------|------|---------|----------|---------|");
      for (const r of fails) {
        const msg = (r.message ?? r.title).split("\n")[0] ?? "";
        lines.push(`| ❌ FAIL | \`${r.ruleId}\` | ${r.article} | **${r.severity}** | ${md(msg)} |`);
      }
      for (const r of warns) {
        const msg = (r.message ?? r.title).split("\n")[0] ?? "";
        lines.push(`| ⚠️ WARN | \`${r.ruleId}\` | ${r.article} | ${r.severity} | ${md(msg)} |`);
      }
    }

    lines.push("");
    lines.push(
      "> Evidence present ≠ legally compliant. Not legal advice or a conformity assessment.",
    );
    lines.push("");

    appendFileSync(summaryPath, `${lines.join("\n")}\n`, "utf-8");
  }
}

/** Escape special characters for GitHub Actions workflow command properties. */
function escapeCmd(s: string): string {
  return s
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

/** Escape pipe characters so they don't break markdown table cells. */
function md(s: string): string {
  return s.replace(/\|/g, "\\|");
}
