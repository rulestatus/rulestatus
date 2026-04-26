import { Command } from "commander";
import { existsSync, writeFileSync } from "node:fs";
import * as p from "@clack/prompts";
import yaml from "js-yaml";

export function cmdInit(): Command {
  return new Command("init")
    .description("Initialize a .rulestatus.yaml configuration file")
    .option("--actor <actor>", "Actor type", "provider")
    .option("--risk-level <level>", "Risk level", "high-risk")
    .option("--frameworks <fw>", "Comma-separated frameworks", "eu-ai-act")
    .option("--name <name>", "System name")
    .action(async (opts) => {
      p.intro("Rulestatus — Initialize compliance config");

      if (existsSync(".rulestatus.yaml")) {
        const overwrite = await p.confirm({
          message: ".rulestatus.yaml already exists. Overwrite?",
          initialValue: false,
        });
        if (p.isCancel(overwrite) || !overwrite) {
          p.outro("Aborted.");
          process.exit(0);
        }
      }

      const name =
        opts.name ??
        (await p.text({
          message: "AI system name:",
          placeholder: "My Fraud Detection Model v1.0",
          validate: (v) => (v.trim() ? undefined : "Name is required"),
        }));

      if (p.isCancel(name)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      const actor =
        opts.actor ??
        (await p.select({
          message: "Actor type:",
          options: [
            { value: "provider", label: "Provider (develops/places on market)" },
            { value: "deployer", label: "Deployer (uses the system)" },
            { value: "importer", label: "Importer" },
            { value: "distributor", label: "Distributor" },
          ],
        }));

      if (p.isCancel(actor)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      const riskLevel =
        opts.riskLevel ??
        (await p.select({
          message: "Risk level:",
          options: [
            { value: "prohibited", label: "Prohibited" },
            { value: "high-risk", label: "High-risk (Annex III)" },
            { value: "limited-risk", label: "Limited-risk" },
            { value: "minimal-risk", label: "Minimal-risk" },
          ],
        }));

      if (p.isCancel(riskLevel)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      const fwList = opts.frameworks.split(",").map((s: string) => s.trim());

      const config = {
        system: {
          name: String(name),
          actor: String(actor),
          risk_level: String(riskLevel),
          domain: "",
          intended_use: "",
        },
        frameworks: fwList,
        evidence: {
          docs_path: "./docs/compliance/",
          model_card: "./model/model_card.yaml",
          risk_register: "./docs/risk_register.json",
          config_path: "./config/",
        },
        reporting: {
          format: ["console"],
          output_dir: "./compliance-reports/",
          badge: false,
        },
        severity_gate: {
          fail_on: "critical",
          warn_on: "major",
        },
      };

      writeFileSync(".rulestatus.yaml", yaml.dump(config, { lineWidth: 100 }), "utf-8");
      p.outro("Created .rulestatus.yaml — run `rulestatus run` to check compliance.");
    });
}
