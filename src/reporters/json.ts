import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { failed, manual, passed, skipped, warned } from "../core/result.js";
import type { RunReport } from "../core/result.js";
import type { Reporter } from "./types.js";

export class JsonReporter implements Reporter {
  async render(report: RunReport, outputPath = "rulestatus-results.json"): Promise<void> {
    const data = {
      meta: {
        tool: "rulestatus",
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
      },
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
        durationMs:
          report.finishedAt.getTime() - report.startedAt.getTime(),
      },
      results: report.results.map((r) => ({
        id: r.ruleId,
        title: r.title,
        framework: r.framework,
        article: r.article,
        severity: r.severity,
        status: r.status,
        message: r.message ?? null,
        durationMs: r.durationMs,
        timestamp: r.timestamp.toISOString(),
      })),
    };

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`  JSON report: ${outputPath}`);
  }
}
