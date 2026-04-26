import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { Engine } from "../core/engine.js";
import { exitCode } from "../core/result.js";
import type { SeverityLevel } from "../core/severity.js";
import { ConsoleReporter } from "../reporters/console.js";
import { JsonReporter } from "../reporters/json.js";
import { SarifReporter } from "../reporters/sarif.js";
import { PdfReporter } from "../reporters/pdf.js";
import { BadgeReporter } from "../reporters/badge.js";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { RunReport } from "../core/result.js";

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
      const config = await loadConfig(globalOpts["config"]);

      const engine = new Engine(config);
      await engine.loadFrameworks(config.frameworks);

      const report = await engine.run({
        framework: opts.framework,
        article: opts.article,
        severity: opts.severity as SeverityLevel | undefined,
      });

      const formats: string[] =
        opts.format ?? config.reporting.format ?? ["console"];

      const outputDir = opts.output ?? config.reporting.outputDir ?? "./compliance-reports";
      mkdirSync(outputDir, { recursive: true });

      const dateStr = new Date().toISOString().split("T")[0];
      const fw = opts.framework ?? config.frameworks[0] ?? "eu-ai-act";

      await dispatchReporters(report, formats, outputDir, dateStr, fw, config.reporting.badge);

      process.exit(exitCode(report, config.severityGate.failOn));
    });
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

  // Console is always rendered
  if (!formats.includes("console")) {
    await new ConsoleReporter().render(report);
  } else {
    await new ConsoleReporter().render(report);
  }

  for (const fmt of formats) {
    if (fmt === "console") continue;

    if (fmt === "json") {
      await new JsonReporter().render(report, `${resolved}/${fw}-${dateStr}.json`);
    } else if (fmt === "sarif") {
      await new SarifReporter().render(report, `${resolved}/${fw}-${dateStr}.sarif`);
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
