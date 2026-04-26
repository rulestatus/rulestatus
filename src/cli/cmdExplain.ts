import chalk from "chalk";
import { Command } from "commander";
import { RULE_REGISTRY } from "../core/rule.js";

const FRAMEWORK_MODULES: Record<string, string> = {
  "eu-ai-act": "../frameworks/euAiAct/index.js",
};

export function cmdExplain(): Command {
  return new Command("explain")
    .description("Explain a failing assertion and how to fix it")
    .argument("<assert-id>", "Assertion ID (e.g. ASSERT-EU-AI-ACT-009-002-B-01)")
    .action(async (assertId: string) => {
      // Load all framework modules to populate the registry
      for (const modulePath of Object.values(FRAMEWORK_MODULES)) {
        await import(modulePath);
      }

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
