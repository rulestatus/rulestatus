import { readFileSync } from "node:fs";
import chalk from "chalk";
import { Command } from "commander";
import { RULE_REGISTRY } from "../core/rule.js";

interface LastRunResult {
  ruleId: string;
  article: string;
  severity: string;
  status: string;
  message: string | null;
}

interface LastRun {
  ranAt: string;
  systemName: string;
  results: LastRunResult[];
}

function loadLastRun(): LastRun | null {
  try {
    return JSON.parse(readFileSync(".rulestatus/last-run.json", "utf-8")) as LastRun;
  } catch {
    return null;
  }
}

function suggestGenerate(article: string): string | null {
  const [major, minor] = article.split(".");
  if (major === "9") {
    if (minor === "1" || minor === "3") return "risk-management";
    if (minor === "2" || minor === "4" || minor === "5" || minor === "8") return "risk-register";
  }
  if (major === "10") {
    if (minor === "2") return "bias-assessment";
    return "data-governance";
  }
  if (major === "11") return "technical-doc";
  if (major === "13") {
    if (minor === "1") return "transparency-config";
    return "instructions-for-use";
  }
  if (major === "14" || major === "15") return "instructions-for-use";
  return null;
}

export function cmdExplain(): Command {
  return new Command("explain")
    .description("Explain a failing assertion and how to fix it")
    .argument("<assert-id>", "Assertion ID (e.g. ASSERT-EU-AI-ACT-009-002-B-01)")
    .action(async (assertId: string) => {
      await import("../frameworks/euAiAct/index.js");

      const rule = RULE_REGISTRY.find((r) => r.id === assertId);
      if (!rule) {
        console.error(chalk.red(`Unknown assertion ID: ${assertId}`));
        console.error(`Run ${chalk.bold("rulestatus run")} to see applicable assertion IDs.`);
        process.exit(1);
      }

      console.log();
      console.log(chalk.bold.blue(`  ${rule.id}`));
      console.log(`  ${chalk.bold(rule.title)}`);
      console.log(
        `  Severity: ${chalk.bold(rule.severity.toUpperCase())} | Framework: EU AI Act | Article: ${rule.article}`,
      );
      if (rule.obligation) {
        console.log(`  Obligation: ${chalk.dim(rule.obligation)}`);
      }

      if (rule.legalText) {
        console.log();
        console.log(chalk.bold("  LEGAL BASIS"));
        for (const line of rule.legalText.split("\n")) {
          console.log(`  ${chalk.italic(line)}`);
        }
      }

      // ── Last run context ──────────────────────────────────────────────────────
      const lastRun = loadLastRun();
      if (lastRun) {
        const result = lastRun.results.find((r) => r.ruleId === assertId);
        const ranDate = lastRun.ranAt.split("T")[0];
        console.log();

        if (result) {
          const statusColor =
            result.status === "PASS"
              ? chalk.bold.green
              : result.status === "FAIL"
                ? chalk.bold.red
                : result.status === "MANUAL"
                  ? chalk.bold.blue
                  : chalk.bold.yellow;

          console.log(
            `${chalk.bold("  LAST RUN")}  ${chalk.dim(`·  ${ranDate}  ·`)}  ${statusColor(result.status)}`,
          );

          if (result.message) {
            for (const line of result.message.split("\n").slice(0, 5)) {
              if (line.trim()) console.log(`  ${chalk.dim(line.trim())}`);
            }
          }

          if (result.status === "FAIL" || result.status === "MANUAL") {
            const template = suggestGenerate(rule.article);
            if (template) {
              console.log(
                `  ${chalk.cyan("→")} Run: ${chalk.bold(`rulestatus generate ${template}`)}`,
              );
            }
          }
        } else {
          console.log(chalk.bold("  LAST RUN"));
          console.log(chalk.dim(`  This assertion was not included in the last run (${ranDate}).`));
          console.log(chalk.dim("  Run: rulestatus run"));
        }
      } else {
        console.log();
        console.log(chalk.bold("  LAST RUN"));
        console.log(chalk.dim("  No run results found. Run: rulestatus run"));
      }

      if (rule.description) {
        console.log();
        console.log(chalk.bold("  DESCRIPTION"));
        console.log(`  ${rule.description}`);
      }

      if (rule.remediation) {
        console.log();
        console.log(chalk.bold("  HOW TO FIX"));
        for (const line of rule.remediation.split("\n")) {
          console.log(`  ${line}`);
        }
      }

      console.log();
      console.log(chalk.bold("  RESOURCES"));
      console.log(
        `  EU AI Act full text: https://eur-lex.europa.eu/eli/reg/2024/1689/oj#art_${rule.article.split(".")[0]}`,
      );
      console.log();
    });
}
