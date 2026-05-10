import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RunReport } from "../core/result.js";
import { failed, manual, passed, skipped, warned } from "../core/result.js";
import type { Reporter } from "./types.js";

function ciProvenance(): Record<string, string> | undefined {
  if (process.env.GITHUB_ACTIONS !== "true") return undefined;
  const repo = process.env.GITHUB_REPOSITORY ?? "";
  const runId = process.env.GITHUB_RUN_ID ?? "";
  return {
    runId,
    sha: process.env.GITHUB_SHA ?? "",
    actor: process.env.GITHUB_ACTOR ?? "",
    repository: repo,
    runUrl: `https://github.com/${repo}/actions/runs/${runId}`,
  };
}

export class JsonReporter implements Reporter {
  async render(report: RunReport, outputPath = "rulestatus-results.json"): Promise<void> {
    const ci = ciProvenance();
    const data = {
      meta: {
        tool: "rulestatus",
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        disclaimer:
          "This report documents automated evidence scanning results. Evidence present does not constitute a legal determination of compliance with the EU AI Act. Not legal advice. Not a conformity assessment.",
        regulatoryBaselines: Object.entries(report.frameworkBaselines).map(([fw, b]) => ({
          framework: fw,
          citation: b.citation,
          publishedDate: b.publishedDate,
          note: "No implementing acts incorporated.",
        })),
      },
      ...(ci ? { ci } : {}),
      framework: report.framework,
      system: {
        name: report.systemName,
        actor: report.actor,
        riskLevel: report.riskLevel,
      },
      summary: {
        total: report.results.length,
        passed: passed(report).length,
        failed: failed(report).length,
        warned: warned(report).length,
        skipped: skipped(report).length,
        manual: manual(report).length,
        durationMs: report.finishedAt.getTime() - report.startedAt.getTime(),
      },
      results: report.results.map((r) => ({
        id: r.ruleId,
        title: r.title,
        framework: r.framework,
        article: r.article,
        severity: r.severity,
        status: r.status,
        confidence: r.confidence,
        message: r.message ?? null,
        durationMs: r.durationMs,
        timestamp: r.timestamp.toISOString(),
        evidenceSources: r.evidenceSources,
      })),
    };

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`  JSON report: ${outputPath}`);
  }
}
