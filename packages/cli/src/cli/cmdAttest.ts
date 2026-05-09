import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";

type Provider = "github" | "cosign" | "none";

function sha256hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function spawnProvider([cmd, ...cmdArgs]: string[]): boolean {
  const result = spawnSync(cmd ?? "", cmdArgs, { stdio: "inherit" });
  return result.status === 0;
}

export function cmdAttest(): Command {
  const defaultProvider: Provider = process.env.GITHUB_ACTIONS === "true" ? "github" : "none";

  return new Command("attest")
    .description("Attest a compliance artifact (file) or sign off a manual check (ASSERT-ID)")
    .argument(
      "<subject>",
      "File path to sign cryptographically, or an ASSERT-ID (e.g. ASSERT-EU-AI-ACT-013-001-01) to generate a manual sign-off template",
    )
    .option(
      "--provider <p>",
      "Signing provider: github (gh CLI + OIDC), cosign, none (hash manifest only)",
      defaultProvider,
    )
    .option("--output <path>", "Output path for the attestation JSON")
    .action(async (subject: string, opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const config = await loadConfig(globalOpts.config);

      // ASSERT-ID mode: generate a human attestation YAML template to commit
      if (/^ASSERT-/i.test(subject)) {
        const assertId = subject.toUpperCase();
        const attestDir = ".rulestatus/attestations";
        const outputPath = opts.output ?? `${attestDir}/${assertId}.yaml`;

        if (existsSync(outputPath)) {
          console.log(`\n  Already exists: ${outputPath}`);
          console.log("  Edit it and commit to the repo to complete the attestation.\n");
          return;
        }

        mkdirSync(attestDir, { recursive: true });
        const template = [
          `# Manual attestation for ${assertId}`,
          `# Fill in all TODO fields, then commit this file to the repository.`,
          `# The git commit provides identity (committer), timestamp, and immutability.`,
          ``,
          `assertion_id: "${assertId}"`,
          `attested_by: "TODO: Full name, role (e.g. Jane Smith, Head of AI Safety)"`,
          `attested_at: "TODO: YYYY-MM-DD"`,
          `statement: "TODO: Describe how this obligation is met in your system"`,
          `evidence_ref: "TODO: Path or URL to supporting evidence (e.g. docs/bias_assessment.yaml)"`,
          ``,
        ].join("\n");

        writeFileSync(outputPath, template, "utf-8");
        console.log(`\n  Template:  ${outputPath}`);
        console.log(
          `  Next step: fill in all TODO fields and run \`git add ${outputPath} && git commit\``,
        );
        console.log(
          "  The commit IS the attestation — it provides identity, timestamp, and immutability.\n",
        );
        return;
      }

      // File mode: cryptographic attestation of a bundle or report file
      const data = readFileSync(subject);
      const digest = sha256hex(data);
      const sizeBytes = statSync(subject).size;

      const attestation = {
        tool: "rulestatus",
        version: "1.0.0",
        attestedAt: new Date().toISOString(),
        disclaimer:
          "This attestation records the SHA-256 digest of a rulestatus compliance artifact at the time of signing. It does not constitute a legal determination of compliance with any regulation.",
        subject: {
          name: basename(subject),
          digest: { sha256: digest },
          sizeBytes,
        },
        system: {
          name: config.system.name,
          actor: config.system.actor,
          riskLevel: config.system.riskLevel,
        },
        frameworks: config.frameworks,
        signingProvider: opts.provider,
      };

      const attestationPath = opts.output ?? `${subject}.attestation.json`;
      const sha256Path = `${subject}.sha256`;

      writeFileSync(attestationPath, JSON.stringify(attestation, null, 2));
      writeFileSync(sha256Path, `${digest}  ${basename(subject)}\n`);

      console.log(`\n  File:        ${subject}`);
      console.log(`  SHA-256:     ${digest}`);
      console.log(`  Attestation: ${attestationPath}`);
      console.log(`  Checksum:    ${sha256Path}`);

      if (opts.provider === "github") {
        const repo = process.env.GITHUB_REPOSITORY;
        if (!repo) {
          console.error(
            "\n  Error: GITHUB_REPOSITORY env var not set — is this running in GitHub Actions?",
          );
          process.exit(1);
        }
        console.log("\n  Running: gh attestation create ...");
        const ok = spawnProvider(["gh", "attestation", "create", subject, "--repo", repo]);
        if (!ok) {
          console.error("  Error: gh attestation create failed");
          process.exit(1);
        }
      } else if (opts.provider === "cosign") {
        console.log("\n  Running: cosign attest ...");
        const ok = spawnProvider(["cosign", "attest", "--yes", subject]);
        if (!ok) {
          console.error("  Error: cosign attest failed");
          process.exit(1);
        }
      } else {
        console.log("\n  Provider: none — hash manifest written (no cryptographic signature)");
      }

      console.log("");
    });
}
