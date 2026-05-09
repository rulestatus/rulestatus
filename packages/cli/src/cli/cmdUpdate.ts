import { get } from "node:https";
import * as p from "@clack/prompts";
import { Command } from "commander";
import pkg from "../../package.json" with { type: "json" };

function currentVersion(): string {
  return pkg.version;
}

function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const req = get("https://registry.npmjs.org/rulestatus/latest", (res) => {
      if (res.statusCode === 404) {
        resolve(null);
        return;
      }
      if ((res.statusCode ?? 0) >= 400) {
        reject(new Error(`npm registry returned ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(data) as { version: string };
          resolve(json.version);
        } catch {
          reject(new Error("Failed to parse npm registry response"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error("Request timed out"));
    });
  });
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [lMaj, lMin, lPatch] = parse(latest);
  const [cMaj, cMin, cPatch] = parse(current);
  if (lMaj !== cMaj) return (lMaj ?? 0) > (cMaj ?? 0);
  if (lMin !== cMin) return (lMin ?? 0) > (cMin ?? 0);
  return (lPatch ?? 0) > (cPatch ?? 0);
}

export function cmdUpdate(): Command {
  return new Command("update")
    .description("Check for a newer version of the rulestatus rule library")
    .action(async () => {
      const current = currentVersion();
      const spinner = p.spinner();
      spinner.start("Checking npm for updates…");

      let latest: string | null;
      try {
        latest = await fetchLatestVersion();
      } catch {
        spinner.stop("Could not reach npm registry — check your connection.");
        process.exit(1);
      }

      if (latest === null) {
        spinner.stop(`rulestatus ${current} — not yet published to npm`);
        return;
      }

      if (isNewer(latest, current)) {
        spinner.stop(`Update available: ${current} → ${latest}`);
        p.note(
          [
            "Run the following to update:",
            "",
            "  npm install -g rulestatus",
            "  # or",
            "  bun install -g rulestatus",
            "",
            "Then re-run `rulestatus run` to check your compliance status against the latest rules.",
          ].join("\n"),
          "New version available",
        );
      } else {
        spinner.stop(`rulestatus is up to date (${current})`);
      }
    });
}
