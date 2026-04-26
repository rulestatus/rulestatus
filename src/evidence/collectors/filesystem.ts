import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname, relative } from "node:path";
import yaml from "js-yaml";
import { DictDocument, TextDocument } from "../document.js";
import type { Document, EvidenceCollector, FindDocumentOptions } from "../types.js";

const STRUCTURED_EXTS = new Set([".yaml", ".yml", ".json"]);

export class FilesystemCollector implements EvidenceCollector {
  constructor(
    private readonly basePath: string,
    private readonly evidenceConfig: Record<string, unknown>,
  ) {}

  async findDocument(opts: FindDocumentOptions): Promise<Document | null> {
    const candidates: string[] = [];

    for (const searchPath of opts.paths) {
      const full = resolve(this.basePath, searchPath);
      if (!existsSync(full)) continue;

      for (const fmt of opts.formats) {
        const found = glob(full, fmt);
        candidates.push(...found);
      }
    }

    // Prefer structured (yaml/json) over text (md/docx/pdf)
    const structured = candidates.filter((p) => STRUCTURED_EXTS.has(extname(p).toLowerCase()));
    const text = candidates.filter((p) => !STRUCTURED_EXTS.has(extname(p).toLowerCase()));
    const ordered = [...structured, ...text];

    for (const filePath of ordered) {
      const doc = await loadPath(filePath);
      if (doc) return doc;
    }
    return null;
  }

  async loadStructured(name: string): Promise<Record<string, unknown> | null> {
    for (const dir of [".", "docs", "compliance", "config"]) {
      for (const ext of ["json", "yaml", "yml"]) {
        const p = resolve(this.basePath, dir, `${name}.${ext}`);
        if (!existsSync(p)) continue;
        const data = await parseStructuredFile(p);
        if (data) return data;
      }
    }
    return null;
  }

  async loadStructuredAt(path: string): Promise<Record<string, unknown> | null> {
    const resolved = resolve(this.basePath, path);
    if (!existsSync(resolved)) return null;
    return parseStructuredFile(resolved);
  }

  async loadConfig(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }
}

async function loadPath(filePath: string): Promise<Document | null> {
  const ext = extname(filePath).toLowerCase();
  try {
    const text = await Bun.file(filePath).text();
    if (ext === ".yaml" || ext === ".yml") {
      const data = yaml.load(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return new DictDocument(data as Record<string, unknown>, filePath);
      }
    } else if (ext === ".json") {
      const data = JSON.parse(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return new DictDocument(data as Record<string, unknown>, filePath);
      }
    } else if (ext === ".md") {
      // Try YAML front-matter first
      if (text.startsWith("---")) {
        const parts = text.split("---");
        if (parts.length >= 3) {
          const fm = yaml.load(parts[1] ?? "");
          if (fm && typeof fm === "object" && !Array.isArray(fm)) {
            const data = { ...(fm as Record<string, unknown>), _body: parts.slice(2).join("---") };
            return new DictDocument(data, filePath);
          }
        }
      }
      return new TextDocument(text, filePath);
    }
  } catch {
    // Unreadable / unparseable files are silently skipped
  }
  return null;
}

async function parseStructuredFile(filePath: string): Promise<Record<string, unknown> | null> {
  const ext = extname(filePath).toLowerCase();
  try {
    const text = await Bun.file(filePath).text();
    if (ext === ".json") {
      const data = JSON.parse(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
    } else {
      const data = yaml.load(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** Recursively find files with the given extension under `dir`. */
function glob(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const stat = statSync(dir);
  if (stat.isFile()) {
    if (dir.endsWith(`.${ext}`)) results.push(dir);
    return results;
  }

  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        results.push(...glob(full, ext));
      } else if (s.isFile() && full.endsWith(`.${ext}`)) {
        results.push(full);
      }
    }
  } catch {
    // permission errors etc.
  }
  return results;
}
