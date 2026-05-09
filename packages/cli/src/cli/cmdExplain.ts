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

// What enterprise security reviews and procurement teams specifically look for,
// framed around the deal context rather than the legal text.
const ENTERPRISE_CONTEXT: Record<string, string> = {
  "9": "Risk management documentation is one of the first things EU enterprise security teams request. A missing or outdated risk register is a common reason AI vendor deals stall in procurement.",
  "9.1":
    "Risk management documentation is one of the first things EU enterprise security teams request. A missing or outdated risk register is a common reason AI vendor deals stall in procurement.",
  "9.2":
    "Enterprise buyers need to see that you've identified risks to health, safety, and fundamental rights — not just technical risks. This is a standard checklist item in EU AI vendor security reviews.",
  "9.3":
    "Evidence of a continuous risk management process (not a one-off document) is what separates vendors who pass procurement from those who don't.",
  "10": "Data governance documentation is consistently flagged in enterprise security reviews. Buyers need to know your training data is documented, representative, and bias-examined before they can sign off.",
  "10.1":
    "Training data documentation is a standard ask in EU enterprise security questionnaires. Undocumented training data is a common blocker.",
  "10.2":
    "Bias examination is one of the highest-signal items in an EU AI security review. Enterprise legal and compliance teams look for this specifically — its absence raises immediate red flags.",
  "11": "Technical documentation (Annex IV) is what auditors and enterprise compliance teams read. Without it, a deal requiring formal AI Act readiness cannot close.",
  "11.1":
    "Technical documentation is what your enterprise customer's legal team will actually read. Model architecture, performance metrics, and version history need to be there before they sign.",
  "13": "Transparency requirements — especially AI disclosure and instructions for use — are the most commonly cited gaps in vendor security reviews. Easy to fix, high cost of missing.",
  "13.1":
    "AI disclosure is a hard requirement. Enterprise customers with their own EU compliance obligations cannot onboard a vendor whose AI systems don't disclose they are AI.",
  "13.2":
    "Instructions for use are what your enterprise customer's compliance team hands to their auditor. Missing instructions-for-use is a common reason deals get deferred to a future quarter.",
  "14": "Human oversight documentation is increasingly required by enterprise insurance and risk teams, especially for high-stakes decisions. Absence signals immaturity to enterprise buyers.",
  "15": "Accuracy, robustness, and cybersecurity documentation round out what enterprise security reviewers check last. These are table stakes for regulated industry buyers.",
};

function enterpriseContext(article: string, framework: string): string | null {
  if (framework !== "eu-ai-act") return null;
  return ENTERPRISE_CONTEXT[article] ?? ENTERPRISE_CONTEXT[article.split(".")[0] ?? ""] ?? null;
}

export function cmdExplain(): Command {
  return new Command("explain")
    .description("Explain a failing assertion and how to fix it")
    .argument("<assert-id>", "Assertion ID (e.g. ASSERT-EU-AI-ACT-009-002-B-01)")
    .action(async (assertId: string) => {
      await import("../frameworks/euAiAct/index.js");
      await import("../frameworks/iso42001/index.js");
      await import("../frameworks/nistAiRmf/index.js");

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
        `  Severity: ${chalk.bold(rule.severity.toUpperCase())} | Framework: ${rule.framework} | Article: ${rule.article}`,
      );
      if (rule.obligation) {
        console.log(`  Obligation: ${chalk.dim(rule.obligation)}`);
      }

      // ── Enterprise deal context ───────────────────────────────────────────
      const dealContext = enterpriseContext(rule.article, rule.framework);
      if (dealContext) {
        console.log();
        console.log(chalk.bold("  WHY THIS BLOCKS DEALS"));
        console.log(`  ${chalk.yellow(dealContext)}`);
      }

      // ── Legal basis ───────────────────────────────────────────────────────
      if (rule.legalText) {
        console.log();
        console.log(chalk.bold("  LEGAL BASIS"));
        for (const line of rule.legalText.split("\n")) {
          console.log(`  ${chalk.italic(line)}`);
        }
      }

      // ── Last run context ──────────────────────────────────────────────────
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
      if (rule.framework === "eu-ai-act") {
        console.log(
          `  EU AI Act full text: https://eur-lex.europa.eu/eli/reg/2024/1689/oj#art_${rule.article.split(".")[0]}`,
        );
      }
      console.log(`  Docs: https://rulestatus.com/frameworks/${rule.framework}/`);
      console.log();
    });
}
