import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as p from "@clack/prompts";
import { Command } from "commander";
import { loadAndExtract, renderTemplate } from "../core/templateExtractor.js";

// ── Framework list ────────────────────────────────────────────────────────────

const ALL_FRAMEWORKS = ["eu-ai-act", "iso-42001", "nist-ai-rmf", "colorado-sb24-205"];

// ── Command ───────────────────────────────────────────────────────────────────

export function cmdGenerate(): Command {
  return new Command("generate")
    .description("Generate compliance artifact templates")
    .option("--output <path>", "Override default output path (single framework only)")
    .option("--all", "Generate all templates for all frameworks")
    .option(
      "--framework <fw>",
      `Generate all templates for one framework (${ALL_FRAMEWORKS.join(", ")})`,
    )
    .addHelpText(
      "after",
      [
        "",
        "Framework templates (auto-generated from rule definitions):",
        ...ALL_FRAMEWORKS.map((f) => `  --framework ${f}`),
        "",
        "Examples:",
        "  rulestatus generate --framework eu-ai-act",
        "  rulestatus generate --all",
      ].join("\n"),
    )
    .action(async (opts: { output?: string; all?: boolean; framework?: string }) => {
      if (opts.all) {
        await generateAll();
        return;
      }

      if (opts.framework) {
        if (!ALL_FRAMEWORKS.includes(opts.framework)) {
          console.error(
            `Unknown framework: "${opts.framework}". Available: ${ALL_FRAMEWORKS.join(", ")}`,
          );
          process.exit(1);
        }
        await generateFramework(opts.framework);
        return;
      }

      p.intro("rulestatus generate — compliance artifact templates");
      const choice = await p.select({
        message: "Which templates would you like to generate?",
        options: [
          ...ALL_FRAMEWORKS.map((fw) => ({
            value: fw,
            label: `all (${fw})`,
            hint: `Generate all ${fw} templates from rule definitions`,
          })),
          { value: "__all__", label: "all frameworks", hint: "Generate everything" },
        ],
      });

      if (p.isCancel(choice)) {
        p.outro("Aborted.");
        process.exit(0);
      }

      if (choice === "__all__") {
        await generateAll();
        return;
      }

      await generateFramework(choice as string);
    });
}

// ── Generators ────────────────────────────────────────────────────────────────

async function generateFramework(framework: string): Promise<void> {
  p.intro(`Generating ${framework} templates from rule definitions…`);

  const specs = await loadAndExtract(framework);

  if (specs.length === 0) {
    p.outro(`No templates found for ${framework}.`);
    return;
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const spec of specs) {
    if (existsSync(spec.outputPath)) {
      const overwrite = await p.confirm({
        message: `${spec.outputPath} already exists. Overwrite?`,
        initialValue: false,
      });
      if (p.isCancel(overwrite) || !overwrite) {
        skipped.push(spec.outputPath);
        continue;
      }
    }
    mkdirSync(dirname(spec.outputPath), { recursive: true });
    writeFileSync(spec.outputPath, renderTemplate(spec), "utf-8");
    created.push(spec.outputPath);
    console.log(`  ✓ ${spec.outputPath}`);
  }

  const summary = [
    created.length > 0 ? `Created ${created.length} template(s).` : "",
    skipped.length > 0 ? `Skipped ${skipped.length} existing file(s).` : "",
  ]
    .filter(Boolean)
    .join(" ");

  p.outro(`${summary}\nFill in every TODO field, then run: rulestatus run`);
}

async function generateAll(): Promise<void> {
  p.intro("Generating all compliance artifact templates…");
  const created: string[] = [];
  const skipped: string[] = [];

  for (const framework of ALL_FRAMEWORKS) {
    const specs = await loadAndExtract(framework);

    for (const spec of specs) {
      if (existsSync(spec.outputPath)) {
        skipped.push(spec.outputPath);
        continue;
      }
      mkdirSync(dirname(spec.outputPath), { recursive: true });
      writeFileSync(spec.outputPath, renderTemplate(spec), "utf-8");
      created.push(spec.outputPath);
      console.log(`  ✓ ${spec.outputPath}`);
    }
  }

  const summary = [
    created.length > 0 ? `Created ${created.length} template(s).` : "",
    skipped.length > 0 ? `Skipped ${skipped.length} existing.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  p.outro(`${summary}\nFill in every TODO field, then run: rulestatus run`);
}
