import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Command } from "commander";
import { findConfig, loadConfig } from "../config/loader.js";
import type { RulestatusConfig } from "../config/schema.js";

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

  return Bun.gzipSync(tar);
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

// ── command ──────────────────────────────────────────────────────────────────

export function cmdBundle(): Command {
  return new Command("bundle")
    .description("Package compliance artifacts into an audit-ready .tar.gz archive")
    .option("--output <path>", "Output file path")
    .option("--name <name>", "Bundle name prefix")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const config = await loadConfig(globalOpts.config);
      const configFilePath = globalOpts.config ?? findConfig();

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
