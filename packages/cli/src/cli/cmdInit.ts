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

// ── Repo scanner ──────────────────────────────────────────────────────────────

interface ArtifactSpec {
  label: string;
  template: string;
  paths: string[];
  configKey?: "modelCard" | "riskRegister" | "docsPath" | "configPath";
}

const ARTIFACTS: ArtifactSpec[] = [
  {
    label: "Risk register",
    template: "risk-register",
    paths: [
      "docs/risk_register.yaml",
      "docs/risk_register.json",
      "docs/risk-management/risk-management.yaml",
    ],
    configKey: "riskRegister",
  },
  {
    label: "Model card",
    template: "model-card",
    paths: ["model/model_card.yaml", "model/model_card.yml", "model_card.yaml", "MODEL_CARD.md"],
    configKey: "modelCard",
  },
  {
    label: "Bias assessment",
    template: "bias-assessment",
    paths: ["docs/bias_assessment.yaml", "docs/compliance/bias-assessment.yaml"],
  },
  {
    label: "Technical documentation",
    template: "technical-doc",
    paths: [
      "docs/compliance/technical-documentation.yaml",
      "docs/technical/technical-documentation.yaml",
    ],
  },
  {
    label: "Data governance",
    template: "data-governance",
    paths: ["docs/compliance/data-governance.yaml", "docs/data-governance.yaml"],
  },
  {
    label: "Transparency config",
    template: "transparency-config",
    paths: ["config/transparency.yaml", "config/transparency.yml"],
    configKey: "configPath",
  },
  {
    label: "Instructions for use",
    template: "instructions-for-use",
    paths: ["docs/compliance/instructions-for-use.yaml", "docs/instructions-for-use.yaml"],
  },
];

interface ScanResult {
  found: Array<{ spec: ArtifactSpec; path: string }>;
  missing: ArtifactSpec[];
  docsPath: string;
  configPath: string;
  modelCard: string;
  riskRegister: string;
}

function scanRepo(): ScanResult {
  const found: ScanResult["found"] = [];
  const missing: ArtifactSpec[] = [];

  for (const spec of ARTIFACTS) {
    const hit = spec.paths.find((p) => existsSync(p));
    if (hit) {
      found.push({ spec, path: hit });
    } else {
      missing.push(spec);
    }
  }

  // Detect docs and config directories
  const docsPath = existsSync("docs/compliance/")
    ? "./docs/compliance/"
    : existsSync("compliance/")
      ? "./compliance/"
      : "./docs/compliance/";

  const configPath = existsSync("config/") ? "./config/" : "./config/";

  const modelCardHit = found.find((f) => f.spec.configKey === "modelCard");
  const riskRegisterHit = found.find((f) => f.spec.configKey === "riskRegister");

  return {
    found,
    missing,
    docsPath,
    configPath,
    modelCard: modelCardHit ? `./${modelCardHit.path}` : "./model/model_card.yaml",
    riskRegister: riskRegisterHit ? `./${riskRegisterHit.path}` : "./docs/risk_register.yaml",
  };
}

// ── Command ───────────────────────────────────────────────────────────────────

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

      // ── Repo scan ─────────────────────────────────────────────────────────
      const scan = scanRepo();

      if (scan.found.length > 0) {
        const foundLines = scan.found.map((f) => `✓  ${f.spec.label}  ${f.path}`);
        const missingLines = scan.missing.map((s) => `·  ${s.label}`);
        p.note(
          [
            ...foundLines,
            ...(missingLines.length > 0 ? ["", "Missing:"] : []),
            ...missingLines,
          ].join("\n"),
          `Found ${scan.found.length} of ${ARTIFACTS.length} compliance artifacts`,
        );
      }

      // ── Context question ──────────────────────────────────────────────────
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

      // ── System name ───────────────────────────────────────────────────────
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

      // ── Actor ─────────────────────────────────────────────────────────────
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

      // ── Risk level ────────────────────────────────────────────────────────
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

      // ── Frameworks ────────────────────────────────────────────────────────
      const fwList = opts.frameworks
        ? opts.frameworks.split(",").map((s: string) => s.trim())
        : defaults.frameworks;

      // ── Write config — paths pre-filled from scan ─────────────────────────
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
          docs_path: scan.docsPath,
          model_card: scan.modelCard,
          risk_register: scan.riskRegister,
          config_path: scan.configPath,
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

      // ── Context-aware outro ───────────────────────────────────────────────
      const generateCmd =
        scan.missing.length === 0
          ? null
          : scan.missing.length === ARTIFACTS.length
            ? "rulestatus generate --all"
            : `rulestatus generate ${scan.missing.map((s) => s.template).join(" ")}`;

      if (context === "enterprise-review") {
        const lines = [
          "Created .rulestatus.yaml",
          ...(scan.found.length > 0
            ? [`Evidence paths pre-filled from ${scan.found.length} existing artifact(s).`]
            : []),
          "",
          "Enterprise security reviews typically focus on:",
          "  Art. 9  — risk management system and risk register",
          "  Art. 10 — training data governance and bias assessment",
          "  Art. 11 — technical documentation (Annex IV)",
          "  Art. 13 — transparency and instructions for use",
          "",
          "Next steps:",
          ...(generateCmd ? [`  ${generateCmd}`] : []),
          "  rulestatus run              see exactly what's missing",
          "  rulestatus explain <ID>     get the fix for each gap",
        ];
        p.outro(lines.join("\n"));
      } else if (context === "eu-deployment") {
        const lines = [
          "Created .rulestatus.yaml",
          ...(scan.found.length > 0
            ? [`Evidence paths pre-filled from ${scan.found.length} existing artifact(s).`]
            : []),
          "",
          "For EU market deployment you need evidence across all of Articles 9–15.",
          "Start here:",
          ...(generateCmd ? [`  ${generateCmd}`] : []),
          "  rulestatus run              see your current evidence gaps",
        ];
        p.outro(lines.join("\n"));
      } else {
        const lines = [
          "Created .rulestatus.yaml",
          ...(generateCmd
            ? [`Run \`${generateCmd}\` to scaffold the missing documents, then \`rulestatus run\`.`]
            : ["Run `rulestatus run` to check your evidence gaps."]),
        ];
        p.outro(lines.join("\n"));
      }
    });
}
