import { readFileSync } from "node:fs";
import { Command } from "commander";
import type { RunReport } from "../core/result.js";
import { FRAMEWORK_BASELINES } from "../core/rule.js";
import { BadgeReporter } from "../reporters/badge.js";
import { ConsoleReporter } from "../reporters/console.js";
import { JunitReporter } from "../reporters/junit.js";
import { PdfReporter } from "../reporters/pdf.js";
import { SarifReporter } from "../reporters/sarif.js";

export function cmdReport(): Command {
  return new Command("report")
    .description("Generate a compliance report from a saved JSON results file")
    .argument("<input>", "Path to a rulestatus JSON results file")
    .option("--format <fmt>", "Output format: console, pdf, sarif, junit, badge", "pdf")
    .option("--output <path>", "Output file path")
    .action(async (input: string, opts) => {
      let data: unknown;
      try {
        data = JSON.parse(readFileSync(input, "utf-8"));
      } catch (e) {
        console.error(`Cannot read results file: ${input}\n${e}`);
        process.exit(1);
      }

      const report = deserializeReport(data);

      const ext = opts.format === "junit" ? "xml" : opts.format;
      const outputPath = opts.output ?? `compliance-report.${ext}`;

      switch (opts.format) {
        case "pdf":
          await new PdfReporter().render(report, outputPath);
          break;
        case "sarif":
          await new SarifReporter().render(report, outputPath);
          break;
        case "junit":
          await new JunitReporter().render(report, outputPath);
          break;
        case "badge":
          await new BadgeReporter().render(report, outputPath);
          break;
        default:
          await new ConsoleReporter().render(report);
          break;
      }
    });
}

function deserializeReport(data: unknown): RunReport {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid report format");
  }
  const d = data as Record<string, unknown>;
  const sys = d.system as Record<string, unknown>;
  const results = (d.results as Array<Record<string, unknown>>).map((r) => ({
    ruleId: String(r.id),
    title: String(r.title),
    framework: String(r.framework),
    article: String(r.article),
    severity: r.severity as "critical" | "major" | "minor" | "info",
    status: r.status as "PASS" | "FAIL" | "WARN" | "SKIP" | "MANUAL",
    ...(r.message ? { message: String(r.message) } : {}),
    durationMs: Number(r.durationMs ?? 0),
    timestamp: new Date(String(r.timestamp)),
    confidence: (r.confidence as "strong" | "moderate" | "weak") ?? "strong",
    evidenceSources: Array.isArray(r.evidenceSources)
      ? (r.evidenceSources as import("../evidence/types.js").EvidenceSource[])
      : [],
  }));

  const frameworks = [...new Set(results.map((r) => r.framework))];
  const frameworkBaselines = Object.fromEntries(
    frameworks.flatMap((fw) => (FRAMEWORK_BASELINES[fw] ? [[fw, FRAMEWORK_BASELINES[fw]]] : [])),
  );

  return {
    systemName: String(sys?.name ?? "Unknown"),
    actor: String(sys?.actor ?? "provider"),
    riskLevel: String(sys?.riskLevel ?? "high-risk"),
    framework: String(d.framework ?? "eu-ai-act"),
    startedAt: new Date(),
    finishedAt: new Date(),
    results,
    frameworkBaselines,
  };
}
