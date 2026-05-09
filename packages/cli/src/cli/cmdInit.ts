import { existsSync, writeFileSync } from "node:fs";
import * as p from "@clack/prompts";
import { Command } from "commander";
import yaml from "js-yaml";

type Context = "enterprise-review" | "eu-deployment" | "audit" | "exploring";

const CONTEXT_DEFAULTS: Record<
  Context,
  { frameworks: string[]; actor: string; riskLevel: string }
> = {
  "enterprise-review": { frameworks: ["eu-ai-act"], actor: "provider", riskLevel: "high-risk" },
  "eu-deployment": { frameworks: ["eu-ai-act"], actor: "provider", riskLevel: "high-risk" },
  audit: { frameworks: ["eu-ai-act", "iso-42001"], actor: "provider", riskLevel: "high-risk" },
  exploring: { frameworks: ["eu-ai-act"], actor: "provider", riskLevel: "high-risk" },
};

export function cmdInit(): Command {
  return new Command("init")
    .description("Initialize a .rulestatus.yaml configuration file")
    .option("--actor <actor>", "Actor type")
    .option("--risk-level <level>", "Risk level")
    .option("--frameworks <fw>", "Comma-separated frameworks")
    .option("--name <name>", "System name")
    .action(async (opts) => {
      p.intro("Rulestatus — AI compliance setup");

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

      // ── Context question ────────────────────────────────────────────────────
      const context = await p.select<Context>({
        message: "What's driving this?",
        options: [
          {
            value: "enterprise-review",
            label: "Enterprise customer asked for EU AI Act compliance",
            hint: "security review, vendor questionnaire, or procurement ask",
          },
          {
            value: "eu-deployment",
            label: "We're shipping AI into the EU market",
            hint: "need to satisfy Article 43 before deployment",
          },
          {
            value: "audit",
            label: "Internal audit or ISO 42001 certification",
            hint: "preparing for a formal assessment",
          },
          {
            value: "exploring",
            label: "Exploring what compliance looks like",
            hint: "seeing what gaps exist",
          },
        ],
      });

      if (p.isCancel(context)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      const defaults = CONTEXT_DEFAULTS[context];

      // ── System name ─────────────────────────────────────────────────────────
      const name =
        opts.name ??
        (await p.text({
          message: "AI system name:",
          placeholder: "My Fraud Detection Model v1.0",
          validate: (v) => ((v ?? "").trim() ? undefined : "Name is required"),
        }));

      if (p.isCancel(name)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      // ── Actor ───────────────────────────────────────────────────────────────
      const actor =
        opts.actor ??
        (await p.select({
          message: "Your role:",
          options: [
            {
              value: "provider",
              label: "Provider — we build or train the AI system",
              hint: "most common; applies if you develop, fine-tune, or place it on the market",
            },
            {
              value: "deployer",
              label: "Deployer — we use someone else's AI in our product",
              hint: "integrating a third-party model into your own application",
            },
            {
              value: "importer",
              label: "Importer — we bring a non-EU AI system into the EU",
            },
            {
              value: "distributor",
              label: "Distributor — we resell or supply an AI system",
            },
          ],
          initialValue: defaults.actor,
        }));

      if (p.isCancel(actor)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      // ── Risk level ──────────────────────────────────────────────────────────
      const riskLevel =
        opts.riskLevel ??
        (await p.select({
          message: "EU AI Act risk classification:",
          options: [
            {
              value: "high-risk",
              label: "High-risk (Annex III)",
              hint: "hiring, credit, healthcare, biometrics, critical infrastructure, law enforcement, etc.",
            },
            {
              value: "limited-risk",
              label: "Limited-risk",
              hint: "chatbots, deepfakes — transparency obligations only",
            },
            {
              value: "minimal-risk",
              label: "Minimal-risk",
              hint: "spam filters, AI in games — no mandatory obligations",
            },
            {
              value: "prohibited",
              label: "Prohibited",
              hint: "social scoring, real-time biometric surveillance in public spaces, etc.",
            },
          ],
          initialValue: defaults.riskLevel,
        }));

      if (p.isCancel(riskLevel)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      // ── Frameworks ──────────────────────────────────────────────────────────
      const fwList = opts.frameworks
        ? opts.frameworks.split(",").map((s: string) => s.trim())
        : defaults.frameworks;

      // ── Write config ────────────────────────────────────────────────────────
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
          risk_register: "./docs/risk_register.yaml",
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

      // ── Context-aware outro ─────────────────────────────────────────────────
      if (context === "enterprise-review") {
        p.outro(
          [
            "Created .rulestatus.yaml",
            "",
            "Enterprise security reviews typically focus on:",
            "  Art. 9  — risk management system and risk register",
            "  Art. 10 — training data governance and bias assessment",
            "  Art. 11 — technical documentation (Annex IV)",
            "  Art. 13 — transparency and instructions for use",
            "",
            "Next steps:",
            "  rulestatus generate --all   scaffold the required documents",
            "  rulestatus run              see exactly what's missing",
            "  rulestatus explain <ID>     get the fix for each gap",
          ].join("\n"),
        );
      } else if (context === "eu-deployment") {
        p.outro(
          [
            "Created .rulestatus.yaml",
            "",
            "For EU market deployment you need evidence across all of Articles 9–15.",
            "Start here:",
            "  rulestatus generate --all   scaffold all required documents",
            "  rulestatus run              see your current evidence gaps",
          ].join("\n"),
        );
      } else {
        p.outro("Created .rulestatus.yaml — run `rulestatus run` to see your evidence gaps.");
      }
    });
}
