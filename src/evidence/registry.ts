import { ManualReviewRequired } from "../core/exceptions.js";
import { DictDocument } from "./document.js";
import { FilesystemCollector } from "./collectors/filesystem.js";
import { ConfigCollector } from "./collectors/config.js";
import { ModelCardCollector } from "./collectors/modelCard.js";
import { ApiProbeCollector, type ApiResponse } from "./collectors/apiProbe.js";
import type { Document, FindDocumentOptions } from "./types.js";

export class EvidenceRegistry {
  private readonly cache = new Map<string, unknown>();
  private readonly fs: FilesystemCollector;
  private readonly cfg: ConfigCollector;
  private readonly mc: ModelCardCollector;
  private readonly api: ApiProbeCollector;

  constructor(
    private readonly evidenceConfig: Record<string, unknown>,
    private readonly basePath: string,
  ) {
    this.fs = new FilesystemCollector(basePath, evidenceConfig);
    this.cfg = new ConfigCollector(basePath, evidenceConfig);
    this.mc = new ModelCardCollector(basePath, evidenceConfig);
    this.api = new ApiProbeCollector(basePath, evidenceConfig);
  }

  async findDocument(opts: FindDocumentOptions): Promise<Document | null> {
    const key = `doc:${opts.category}:${opts.paths.join(",")}`;
    if (this.cache.has(key)) return this.cache.get(key) as Document | null;
    const result = await this.fs.findDocument(opts);
    this.cache.set(key, result);
    return result;
  }

  async loadStructured(name: string): Promise<Record<string, unknown> | null> {
    const key = `structured:${name}`;
    if (this.cache.has(key)) return this.cache.get(key) as Record<string, unknown> | null;

    // Config-specified explicit path takes priority
    const explicit =
      this.evidenceConfig[name] ?? this.evidenceConfig[toCamel(name)];
    let result: Record<string, unknown> | null = null;

    if (explicit) {
      result = await this.fs.loadStructuredAt(String(explicit));
    }
    if (!result) {
      result = await this.fs.loadStructured(name);
    }

    this.cache.set(key, result);
    return result;
  }

  async loadConfig(name: string): Promise<Record<string, unknown> | null> {
    const key = `config:${name}`;
    if (this.cache.has(key)) return this.cache.get(key) as Record<string, unknown> | null;
    const result = await this.cfg.loadConfig(name);
    this.cache.set(key, result);
    return result;
  }

  async loadModelCard(): Promise<Document | null> {
    const key = "modelcard";
    if (this.cache.has(key)) return this.cache.get(key) as Document | null;
    const result = await this.mc.load();
    this.cache.set(key, result);
    return result;
  }

  async probeApi(endpoint: string): Promise<ApiResponse | null> {
    return this.api.probe(endpoint);
  }

  /** Signals that this check requires human review. Throws ManualReviewRequired. */
  requireManual(message: string): never {
    throw new ManualReviewRequired(message);
  }

  /** Returns true if an API base URL is configured. */
  hasApi(): boolean {
    const url = String(
      this.evidenceConfig["api_base_url"] ?? this.evidenceConfig["apiBaseUrl"] ?? "",
    ).trim();
    return url.length > 0;
  }
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
