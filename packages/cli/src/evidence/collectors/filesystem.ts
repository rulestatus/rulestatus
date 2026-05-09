import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import yaml from "js-yaml";
import { DictDocument, TextDocument } from "../document.js";
import type { Document, EvidenceCollector, FindDocumentOptions } from "../types.js";

const STRUCTURED_EXTS = new Set([".yaml", ".yml", ".json"]);

export class FilesystemCollector implements EvidenceCollector {
  constructor(
    private readonly basePath: string,
    _evidenceConfig: Record<string, unknown>,
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
    const result = await this.loadStructuredWithMeta(name);
    return result?.data ?? null;
  }

  async loadStructuredWithMeta(
    name: string,
  ): Promise<{ data: Record<string, unknown>; filePath: string; sha256: string } | null> {
    for (const dir of [".", "docs", "compliance", "config"]) {
      for (const ext of ["json", "yaml", "yml"]) {
        const p = resolve(this.basePath, dir, `${name}.${ext}`);
        if (!existsSync(p)) continue;
        const result = await parseStructuredFile(p);
        if (result) return result;
      }
    }
    return null;
  }

  async loadStructuredAt(path: string): Promise<Record<string, unknown> | null> {
    const resolved = resolve(this.basePath, path);
    if (!existsSync(resolved)) return null;
    const result = await parseStructuredFile(resolved);
    return result?.data ?? null;
  }

  async loadStructuredAtWithMeta(
    path: string,
  ): Promise<{ data: Record<string, unknown>; filePath: string; sha256: string } | null> {
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
    const text = readFileSync(filePath, "utf-8");
    const sha256 = createHash("sha256").update(text).digest("hex");
    if (ext === ".yaml" || ext === ".yml") {
      const data = yaml.load(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return new DictDocument(data as Record<string, unknown>, filePath, sha256);
      }
    } else if (ext === ".json") {
      const data = JSON.parse(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return new DictDocument(data as Record<string, unknown>, filePath, sha256);
      }
    } else if (ext === ".md") {
      // Try YAML front-matter first
      if (text.startsWith("---")) {
        const parts = text.split("---");
        if (parts.length >= 3) {
          const fm = yaml.load(parts[1] ?? "");
          if (fm && typeof fm === "object" && !Array.isArray(fm)) {
            const data = { ...(fm as Record<string, unknown>), _body: parts.slice(2).join("---") };
            return new DictDocument(data, filePath, sha256);
          }
        }
      }
      return new TextDocument(text, filePath, sha256);
    }
  } catch {
    // Unreadable / unparseable files are silently skipped
  }
  return null;
}

async function parseStructuredFile(
  filePath: string,
): Promise<{ data: Record<string, unknown>; filePath: string; sha256: string } | null> {
  const ext = extname(filePath).toLowerCase();
  try {
    const text = readFileSync(filePath, "utf-8");
    const sha256 = createHash("sha256").update(text).digest("hex");
    if (ext === ".json") {
      const data = JSON.parse(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return { data: data as Record<string, unknown>, filePath, sha256 };
      }
    } else {
      const data = yaml.load(text);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return { data: data as Record<string, unknown>, filePath, sha256 };
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
