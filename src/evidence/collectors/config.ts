import { existsSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import type { Document, EvidenceCollector, FindDocumentOptions } from "../types.js";

export class ConfigCollector implements EvidenceCollector {
  constructor(
    private readonly basePath: string,
    private readonly evidenceConfig: Record<string, unknown>,
  ) {}

  async findDocument(_opts: FindDocumentOptions): Promise<Document | null> {
    return null;
  }

  async loadStructured(name: string): Promise<Record<string, unknown> | null> {
    return this.loadConfig(name);
  }

  async loadConfig(name: string): Promise<Record<string, unknown> | null> {
    const configDir = String(
      this.evidenceConfig.config_path ?? this.evidenceConfig.configPath ?? "config",
    );
    const base = resolve(this.basePath, configDir);

    for (const ext of ["yaml", "yml", "json", "toml"]) {
      const filePath = resolve(base, `${name}.${ext}`);
      if (!existsSync(filePath)) continue;

      try {
        const text = await Bun.file(filePath).text();
        if (ext === "yaml" || ext === "yml") {
          const data = yaml.load(text);
          if (data && typeof data === "object" && !Array.isArray(data)) {
            return data as Record<string, unknown>;
          }
        } else if (ext === "json") {
          const data = JSON.parse(text);
          if (data && typeof data === "object") return data as Record<string, unknown>;
        } else if (ext === "toml") {
          // Bun has built-in TOML support via import — for runtime use we parse manually
          // Using a simple approach since full TOML parsing is rare for config
          const data = parseTrivialToml(text);
          if (data) return data;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }
}

/** Minimal TOML parser for flat key=value files (handles the common config case). */
function parseTrivialToml(text: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawVal = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    result[key] = rawVal === "true" ? true : rawVal === "false" ? false : rawVal;
  }
  return Object.keys(result).length > 0 ? result : null;
}
