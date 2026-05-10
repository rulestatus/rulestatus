import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { Command } from "commander";
import { findConfig, loadConfig } from "../config/loader.js";
import type { RulestatusConfig } from "../config/schema.js";
import { Engine } from "../core/engine.js";
import { scoreReport } from "../core/score.js";
import { JsonReporter } from "../reporters/json.js";
import { PdfReporter } from "../reporters/pdf.js";

interface BundleFile {
  archivePath: string;
  sourcePath: string;
  sizeBytes: number;
}

// ── tar builder ──────────────────────────────────────────────────────────────

function tarHeader(filename: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  const enc = new TextEncoder();

  const setField = (offset: number, value: string) => header.set(enc.encode(value), offset);

  setField(0, filename.slice(0, 99));
  setField(100, "0000644\0");
  setField(108, "0000000\0");
  setField(116, "0000000\0");
  setField(124, `${size.toString(8).padStart(11, "0")}\0`);
  setField(
    136,
    `${Math.floor(Date.now() / 1000)
      .toString(8)
      .padStart(11, "0")}\0`,
  );
  header.fill(0x20, 148, 156); // checksum placeholder: spaces
  header[156] = 0x30; // type flag '0' = regular file
  setField(257, "ustar\0");
  setField(263, "00");

  let checksum = 0;
  for (const byte of header) checksum += byte;
  setField(148, `${checksum.toString(8).padStart(6, "0")}\0 `);

  return header;
}

function buildTarGz(entries: Array<{ path: string; data: Uint8Array }>): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const { path, data } of entries) {
    blocks.push(tarHeader(path, data.length));
    const paddedSize = Math.ceil(data.length / 512) * 512;
    const padded = new Uint8Array(paddedSize);
    padded.set(data);
    blocks.push(padded);
  }

  blocks.push(new Uint8Array(1024)); // two zero blocks = end-of-archive

  const totalSize = blocks.reduce((sum, b) => sum + b.length, 0);
  const tar = new Uint8Array(totalSize);
  let offset = 0;
  for (const block of blocks) {
    tar.set(block, offset);
    offset += block.length;
  }

  return gzipSync(tar);
}

// ── file collection ──────────────────────────────────────────────────────────

function walkDir(dir: string, prefix: string, seen: Set<string>, out: BundleFile[]): void {
  const abs = resolve(dir);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return;

  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const full = join(abs, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, `${prefix}/${entry.name}`, seen, out);
    } else if (entry.isFile() && !seen.has(full)) {
      seen.add(full);
      out.push({
        archivePath: `${prefix}/${entry.name}`,
        sourcePath: full,
        sizeBytes: statSync(full).size,
      });
    }
  }
}

function addFile(
  archivePath: string,
  sourcePath: string,
  seen: Set<string>,
  out: BundleFile[],
): void {
  const abs = resolve(sourcePath);
  if (!existsSync(abs) || seen.has(abs)) return;
  seen.add(abs);
  out.push({ archivePath, sourcePath: abs, sizeBytes: statSync(abs).size });
}

function collectFiles(config: RulestatusConfig, configFilePath: string | null): BundleFile[] {
  const files: BundleFile[] = [];
  const seen = new Set<string>();

  if (configFilePath) addFile("config/.rulestatus.yaml", configFilePath, seen, files);
  if (existsSync(".rulestatus/last-run.json"))
    addFile("reports/last-run.json", ".rulestatus/last-run.json", seen, files);

  walkDir(config.evidence.docsPath, "evidence/docs", seen, files);
  walkDir(config.evidence.configPath, "evidence/config", seen, files);

  if (config.evidence.modelCard) {
    addFile(`evidence/${config.evidence.modelCard}`, config.evidence.modelCard, seen, files);
  }
  if (config.evidence.riskRegister) {
    addFile(`evidence/${config.evidence.riskRegister}`, config.evidence.riskRegister, seen, files);
  }

  return files;
}

// ── last-run summary ─────────────────────────────────────────────────────────

function readLastRunSummary(): Record<string, unknown> | null {
  try {
    const raw = JSON.parse(readFileSync(".rulestatus/last-run.json", "utf-8")) as Record<
      string,
      unknown
    >;
    const results = (raw.results as Array<Record<string, unknown>>) ?? [];
    const count = (status: string) => results.filter((r) => r.status === status).length;
    return {
      ranAt: raw.ranAt,
      total: results.length,
      passed: count("PASS"),
      failed: count("FAIL"),
      warned: count("WARN"),
      manual: count("MANUAL"),
      skipped: count("SKIP"),
    };
  } catch {
    return null;
  }
}

// ── auditor package ──────────────────────────────────────────────────────────

function sha256hex(data: Uint8Array | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function buildReadme(
  systemName: string,
  bundleName: string,
  generatedAt: string,
  score: { points: number; grade: string },
): string {
  return [
    "RULESTATUS AUDITOR PACKAGE",
    "==========================",
    "",
    `System:    ${systemName}`,
    `Score:     ${score.points}/100  Grade: ${score.grade}`,
    `Generated: ${generatedAt}`,
    `Archive:   ${bundleName}.tar.gz`,
    "",
    "CONTENTS",
    "--------",
    "  README.txt              — this file",
    "  manifest.json           — all files with SHA-256 hashes and sizes",
    "  attestation.json        — SHA-256 digests of reports, signed metadata",
    "  reports/summary.pdf     — executive summary (evidence readiness report)",
    "  reports/results.json    — full evidence log with per-rule sources and hashes",
    "  evidence/**             — source evidence files as scanned",
    "",
    "VERIFYING INTEGRITY",
    "-------------------",
    "Each file's SHA-256 digest is recorded in attestation.json and manifest.json.",
    "To verify a file:",
    "  sha256sum reports/summary.pdf",
    "  # compare against attestation.json → reports.pdf.sha256",
    "",
    "LEGAL NOTICE",
    "------------",
    "This package documents automated evidence scanning results.",
    "Evidence present does not constitute a legal determination of compliance.",
    "Not legal advice. Not a conformity assessment.",
    "Consult qualified legal counsel for compliance determinations.",
    "",
  ].join("\n");
}

async function generateAuditorPackage(
  config: RulestatusConfig,
  configFilePath: string | null,
  opts: { output?: string; name?: string; provider?: string },
): Promise<void> {
  const enc = new TextEncoder();
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const bundleName = `${opts.name ?? config.system.name.toLowerCase().replace(/\s+/g, "-")}-auditor`;
  const outputPath = opts.output ?? `.rulestatus/${bundleName}-${dateStr}.tar.gz`;
  const tmpDir = `.rulestatus/tmp-auditor-${Date.now()}`;
  mkdirSync(tmpDir, { recursive: true });

  // Run the engine fresh
  console.log("\n  Running compliance checks...");
  const engine = new Engine(config);
  await engine.loadFrameworks(config.frameworks);
  const report = await engine.run({});
  const score = scoreReport(report);

  // Generate PDF and JSON to temp paths
  const pdfPath = `${tmpDir}/summary.pdf`;
  const jsonPath = `${tmpDir}/results.json`;
  await new PdfReporter().render(report, pdfPath);
  await new JsonReporter().render(report, jsonPath);

  const pdfData = new Uint8Array(readFileSync(pdfPath));
  const jsonData = new Uint8Array(readFileSync(jsonPath));
  const pdfDigest = sha256hex(pdfData);
  const jsonDigest = sha256hex(jsonData);

  // Collect source evidence files
  const evidenceFiles = collectFiles(config, configFilePath);

  // Build attestation.json
  const generatedAt = new Date().toISOString();
  const attestation = {
    tool: "rulestatus",
    version: "1.0.0",
    generatedAt,
    disclaimer:
      "This attestation records SHA-256 digests of compliance artifacts at time of generation. Does not constitute legal compliance determination.",
    system: {
      name: config.system.name,
      actor: config.system.actor,
      riskLevel: config.system.riskLevel,
    },
    score: { points: score.points, grade: score.grade },
    frameworks: config.frameworks,
    reports: {
      pdf: { path: "reports/summary.pdf", sha256: pdfDigest, sizeBytes: pdfData.length },
      json: { path: "reports/results.json", sha256: jsonDigest, sizeBytes: jsonData.length },
    },
    evidenceSources: evidenceFiles.map((f) => {
      const data = new Uint8Array(readFileSync(f.sourcePath));
      return { path: f.archivePath, sha256: sha256hex(data), sizeBytes: f.sizeBytes };
    }),
    signingProvider: opts.provider ?? "none",
  };
  const attestationData = enc.encode(JSON.stringify(attestation, null, 2));

  // Build manifest.json
  const allEntries = [
    { path: "README.txt", sha256: "(generated)", sizeBytes: 0 },
    {
      path: "attestation.json",
      sha256: sha256hex(attestationData),
      sizeBytes: attestationData.length,
    },
    { path: "reports/summary.pdf", sha256: pdfDigest, sizeBytes: pdfData.length },
    { path: "reports/results.json", sha256: jsonDigest, sizeBytes: jsonData.length },
    ...attestation.evidenceSources,
  ];
  const manifest = {
    tool: "rulestatus",
    bundledAt: generatedAt,
    system: config.system.name,
    score: attestation.score,
    files: allEntries,
  };

  const readmeContent = buildReadme(config.system.name, bundleName, generatedAt, score);
  const readmeData = enc.encode(readmeContent);

  // Build tar.gz
  const entries: Array<{ path: string; data: Uint8Array }> = [
    { path: "README.txt", data: readmeData },
    { path: "manifest.json", data: enc.encode(JSON.stringify(manifest, null, 2)) },
    { path: "attestation.json", data: attestationData },
    { path: "reports/summary.pdf", data: pdfData },
    { path: "reports/results.json", data: jsonData },
    ...evidenceFiles.map((f) => ({
      path: f.archivePath,
      data: new Uint8Array(readFileSync(f.sourcePath)),
    })),
  ];

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buildTarGz(entries));

  // Sign if requested
  const provider = opts.provider ?? "none";
  if (provider === "github") {
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) {
      console.error("\n  Error: GITHUB_REPOSITORY not set — is this running in GitHub Actions?");
      process.exit(1);
    }
    console.log("  Signing with GitHub Attestation (Sigstore)...");
    const result = spawnSync("gh", ["attestation", "create", outputPath, "--repo", repo], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      console.error("  Error: gh attestation create failed");
      process.exit(1);
    }
  } else if (provider === "cosign") {
    console.log("  Signing with cosign...");
    const result = spawnSync("cosign", ["attest", "--yes", outputPath], { stdio: "inherit" });
    if (result.status !== 0) {
      console.error("  Error: cosign attest failed");
      process.exit(1);
    }
  }

  const archiveDigest = sha256hex(new Uint8Array(readFileSync(outputPath)));
  const totalEvidence = evidenceFiles.length;

  console.log(`\n  Auditor package: ${outputPath}`);
  console.log(`  SHA-256:         ${archiveDigest}`);
  console.log(
    `  System:          ${config.system.name} (${config.system.actor}, ${config.system.riskLevel})`,
  );
  console.log(`  Score:           ${score.points}/100  Grade: ${score.grade}`);
  console.log(
    `  Contents:        PDF + JSON reports, ${totalEvidence} evidence file${totalEvidence !== 1 ? "s" : ""}, attestation`,
  );
  if (provider !== "none") console.log(`  Signed:          ${provider}`);
  console.log("");
}

// ── command ──────────────────────────────────────────────────────────────────

const defaultProvider: "github" | "none" =
  process.env.GITHUB_ACTIONS === "true" ? "github" : "none";

export function cmdBundle(): Command {
  return new Command("bundle")
    .description("Package compliance artifacts into an audit-ready .tar.gz archive")
    .option("--auditor", "Generate an auditor-grade package (PDF + JSON + attestation + evidence)")
    .option(
      "--provider <p>",
      "Signing provider for --auditor: github, cosign, none",
      defaultProvider,
    )
    .option("--output <path>", "Output file path")
    .option("--name <name>", "Bundle name prefix")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const config = await loadConfig(globalOpts.config);
      const configFilePath = globalOpts.config ?? findConfig();

      if (opts.auditor) {
        await generateAuditorPackage(config, configFilePath, opts);
        return;
      }

      const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const bundleName = opts.name ?? config.system.name.toLowerCase().replace(/\s+/g, "-");
      const outputPath = opts.output ?? `.rulestatus/${bundleName}-${dateStr}.tar.gz`;

      const files = collectFiles(config, configFilePath);
      const lastRun = readLastRunSummary();

      const manifest = {
        tool: "rulestatus",
        version: "1.0.0",
        bundledAt: new Date().toISOString(),
        disclaimer:
          "This bundle documents automated evidence scanning results. Evidence present does not constitute a legal determination of compliance. Not legal advice. Not a conformity assessment.",
        system: {
          name: config.system.name,
          actor: config.system.actor,
          riskLevel: config.system.riskLevel,
          domain: config.system.domain || undefined,
          intendedUse: config.system.intendedUse || undefined,
        },
        frameworks: config.frameworks,
        lastRun,
        files: files.map((f) => ({ path: f.archivePath, sizeBytes: f.sizeBytes })),
      };

      const enc = new TextEncoder();
      const entries: Array<{ path: string; data: Uint8Array }> = [
        { path: "manifest.json", data: enc.encode(JSON.stringify(manifest, null, 2)) },
        ...files.map((f) => ({
          path: f.archivePath,
          data: new Uint8Array(readFileSync(f.sourcePath)),
        })),
      ];

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, buildTarGz(entries));

      console.log(`\n  Bundle: ${outputPath}`);
      console.log(
        `  System: ${config.system.name} (${config.system.actor}, ${config.system.riskLevel})`,
      );
      console.log(`  Files:  ${files.length} evidence file${files.length !== 1 ? "s" : ""}`);
      if (lastRun) {
        console.log(
          `  Run:    ${lastRun.passed}/${lastRun.total} passed (last run: ${lastRun.ranAt})`,
        );
      } else {
        console.log("  Run:    no last-run data (run `rulestatus run` first)");
      }
      console.log("");
    });
}
