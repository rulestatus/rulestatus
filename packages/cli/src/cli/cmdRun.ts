import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { Engine } from "../core/engine.js";
import type { RunReport } from "../core/result.js";
import { exitCode } from "../core/result.js";
import type { SeverityLevel } from "../core/severity.js";
import { BadgeReporter } from "../reporters/badge.js";
import { ConsoleReporter } from "../reporters/console.js";
import { JsonReporter } from "../reporters/json.js";
import { JunitReporter } from "../reporters/junit.js";
import { PdfReporter } from "../reporters/pdf.js";
import { SarifReporter } from "../reporters/sarif.js";

export function cmdRun(): Command {
  return new Command("run")
    .description("Run compliance tests")
    .option("--framework <fw>", "Framework to run (e.g. eu-ai-act)")
    .option("--article <num>", "Run only rules for this article number")
    .option("--severity <level>", "Run only rules at this severity or higher", undefined)
    .option("--format <fmt...>", "Output formats: console,json,sarif,pdf,badge")
    .option("--output <dir>", "Output directory for reports")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const config = await loadConfig(globalOpts.config);

      const engine = new Engine(config);
      await engine.loadFrameworks(config.frameworks);

      const runOpts: import("../core/engine.js").RunOptions = {
        framework: opts.framework,
        article: opts.article,
      };
      if (opts.severity) runOpts.severity = opts.severity as SeverityLevel;
      const report = await engine.run(runOpts);

      const formats: string[] = (opts.format ?? config.reporting.format ?? ["console"]).flatMap(
        (f: string) => f.split(","),
      );

      const outputDir = opts.output ?? config.reporting.outputDir ?? "./compliance-reports";
      mkdirSync(outputDir, { recursive: true });

      const dateStr = new Date().toISOString().split("T")[0] ?? "unknown";
      const fw = opts.framework ?? config.frameworks[0] ?? "eu-ai-act";

      await dispatchReporters(report, formats, outputDir, dateStr, fw, config.reporting.badge);
      persistLastRun(report);

      process.exit(exitCode(report, config.severityGate.failOn));
    });
}

function persistLastRun(report: RunReport): void {
  try {
    mkdirSync(".rulestatus", { recursive: true });
    const payload = {
      ranAt: new Date().toISOString(),
      systemName: report.systemName,
      results: report.results.map((r) => ({
        ruleId: r.ruleId,
        article: r.article,
        severity: r.severity,
        status: r.status,
        message: r.message ?? null,
      })),
    };
    writeFileSync(".rulestatus/last-run.json", JSON.stringify(payload, null, 2), "utf-8");
  } catch {
    // Non-fatal — don't crash the run if we can't write the cache
  }
}

async function dispatchReporters(
  report: RunReport,
  formats: string[],
  outputDir: string,
  dateStr: string,
  fw: string,
  badge: boolean,
): Promise<void> {
  const resolved = resolve(outputDir);

  for (const fmt of formats) {
    if (fmt === "console") {
      await new ConsoleReporter().render(report);
    } else if (fmt === "json") {
      await new JsonReporter().render(report, `${resolved}/${fw}-${dateStr}.json`);
    } else if (fmt === "sarif") {
      await new SarifReporter().render(report, `${resolved}/${fw}-${dateStr}.sarif`);
    } else if (fmt === "junit") {
      await new JunitReporter().render(report, `${resolved}/${fw}-${dateStr}.xml`);
    } else if (fmt === "pdf") {
      await new PdfReporter().render(report, `${resolved}/${fw}-${dateStr}.pdf`);
    } else if (fmt === "badge") {
      await new BadgeReporter().render(report, `${resolved}/compliance-badge.svg`);
    }
  }

  if (badge && !formats.includes("badge")) {
    await new BadgeReporter().render(report, `${resolved}/compliance-badge.svg`);
  }
}
