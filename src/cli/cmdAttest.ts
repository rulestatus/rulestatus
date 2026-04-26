import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";

type Provider = "github" | "cosign" | "none";

function sha256hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function spawnProvider(args: string[]): boolean {
  const result = Bun.spawnSync(args, { stdout: "inherit", stderr: "inherit" });
  return result.exitCode === 0;
}

export function cmdAttest(): Command {
  const defaultProvider: Provider =
    process.env.GITHUB_ACTIONS === "true" ? "github" : "none";

  return new Command("attest")
    .description("Generate a cryptographic attestation for a compliance bundle or report")
    .argument("<file>", "File to attest (output of `rulestatus bundle` or a report file)")
    .option(
      "--provider <p>",
      "Signing provider: github (gh CLI + OIDC), cosign, none (hash manifest only)",
      defaultProvider,
    )
    .option("--output <path>", "Output path for the attestation JSON")
    .action(async (file: string, opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const config = await loadConfig(globalOpts.config);

      const data = readFileSync(file);
      const digest = sha256hex(data);
      const sizeBytes = statSync(file).size;

      const attestation = {
        tool: "rulestatus",
        version: "1.0.0",
        attestedAt: new Date().toISOString(),
        disclaimer:
          "This attestation records the SHA-256 digest of a rulestatus compliance artifact at the time of signing. It does not constitute a legal determination of compliance with any regulation.",
        subject: {
          name: basename(file),
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

      const attestationPath = opts.output ?? `${file}.attestation.json`;
      const sha256Path = `${file}.sha256`;

      writeFileSync(attestationPath, JSON.stringify(attestation, null, 2));
      writeFileSync(sha256Path, `${digest}  ${basename(file)}\n`);

      console.log(`\n  File:        ${file}`);
      console.log(`  SHA-256:     ${digest}`);
      console.log(`  Attestation: ${attestationPath}`);
      console.log(`  Checksum:    ${sha256Path}`);

      if (opts.provider === "github") {
        const repo = process.env.GITHUB_REPOSITORY;
        if (!repo) {
          console.error("\n  Error: GITHUB_REPOSITORY env var not set — is this running in GitHub Actions?");
          process.exit(1);
        }
        console.log("\n  Running: gh attestation create ...");
        const ok = spawnProvider(["gh", "attestation", "create", file, "--repo", repo]);
        if (!ok) {
          console.error("  Error: gh attestation create failed");
          process.exit(1);
        }
      } else if (opts.provider === "cosign") {
        console.log("\n  Running: cosign attest ...");
        const ok = spawnProvider(["cosign", "attest", "--yes", file]);
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
