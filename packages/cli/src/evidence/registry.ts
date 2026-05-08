import { ManualReviewRequired } from "../core/exceptions.js";
import { ApiProbeCollector, type ApiResponse } from "./collectors/apiProbe.js";
import { ConfigCollector } from "./collectors/config.js";
import { FilesystemCollector } from "./collectors/filesystem.js";
import { ModelCardCollector } from "./collectors/modelCard.js";
import { redactData } from "./redact.js";
import type { Confidence, Document, EvidenceSource, FindDocumentOptions } from "./types.js";

export class EvidenceRegistry {
  private readonly cache = new Map<string, unknown>();
  private readonly sourceMap = new Map<string, EvidenceSource>(); // filePath → source
  private ruleSourcePaths: string[] = [];
  private _confidence: Confidence = "strong";

  private readonly fs: FilesystemCollector;
  private readonly cfg: ConfigCollector;
  private readonly mc: ModelCardCollector;
  private readonly api: ApiProbeCollector;

  constructor(
    private readonly evidenceConfig: Record<string, unknown>,
    _basePath: string,
  ) {
    this.fs = new FilesystemCollector(_basePath, evidenceConfig);
    this.cfg = new ConfigCollector(_basePath, evidenceConfig);
    this.mc = new ModelCardCollector(_basePath, evidenceConfig);
    this.api = new ApiProbeCollector(_basePath, evidenceConfig);
  }

  async findDocument(opts: FindDocumentOptions): Promise<Document | null> {
    const key = `doc:${opts.category}:${opts.paths.join(",")}`;
    if (this.cache.has(key)) {
      const cached = this.cache.get(key) as Document | null;
      if (cached?.sourcePath) this.ruleSourcePaths.push(cached.sourcePath);
      return cached;
    }
    const result = await this.fs.findDocument(opts);
    this.cache.set(key, result);
    if (result) {
      this.recordDocumentSource(result);
      this.ruleSourcePaths.push(result.sourcePath);
    }
    return result;
  }

  async loadStructured(name: string): Promise<Record<string, unknown> | null> {
    const key = `structured:${name}`;
    if (this.cache.has(key)) {
      const path = this.cachePathMap.get(key);
      if (path) this.ruleSourcePaths.push(path);
      return this.cache.get(key) as Record<string, unknown> | null;
    }

    const explicit = this.evidenceConfig[name] ?? this.evidenceConfig[toCamel(name)];
    let meta: { data: Record<string, unknown>; filePath: string; sha256: string } | null = null;

    if (explicit) {
      meta = await this.fs.loadStructuredAtWithMeta(String(explicit));
    }
    if (!meta) {
      meta = await this.fs.loadStructuredWithMeta(name);
    }

    if (meta) {
      const { redactedFields } = redactData(meta.data);
      this.sourceMap.set(meta.filePath, {
        filePath: meta.filePath,
        sha256: meta.sha256,
        redactedFields,
      });
      this.cachePathMap.set(key, meta.filePath);
      this.ruleSourcePaths.push(meta.filePath);
      this.cache.set(key, meta.data);
      return meta.data;
    }

    this.cache.set(key, null);
    return null;
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
    if (this.cache.has(key)) {
      const cached = this.cache.get(key) as Document | null;
      if (cached?.sourcePath) this.ruleSourcePaths.push(cached.sourcePath);
      return cached;
    }
    const result = await this.mc.load();
    this.cache.set(key, result);
    if (result) {
      this.recordDocumentSource(result);
      this.ruleSourcePaths.push(result.sourcePath);
    }
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
      this.evidenceConfig.api_base_url ?? this.evidenceConfig.apiBaseUrl ?? "",
    ).trim();
    return url.length > 0;
  }

  /** Set confidence level for the currently executing rule. */
  setConfidence(c: Confidence): void {
    this._confidence = c;
  }

  /** Reset per-rule tracking. Called by Engine before each rule execution. */
  resetForRule(): void {
    this.ruleSourcePaths = [];
    this._confidence = "strong";
  }

  /**
   * Returns sources accessed during the current rule execution, then resets tracking.
   * Called by Engine after each rule execution.
   */
  snapshotSources(): EvidenceSource[] {
    const paths = [...new Set(this.ruleSourcePaths)];
    const sources = paths
      .map((p) => this.sourceMap.get(p))
      .filter((s): s is EvidenceSource => s !== undefined);
    this.ruleSourcePaths = [];
    return sources;
  }

  getConfidence(): Confidence {
    return this._confidence;
  }

  private readonly cachePathMap = new Map<string, string>(); // cacheKey → filePath

  private recordDocumentSource(doc: Document): void {
    if (!doc.sha256) return;
    if (!this.sourceMap.has(doc.sourcePath)) {
      this.sourceMap.set(doc.sourcePath, {
        filePath: doc.sourcePath,
        sha256: doc.sha256,
        redactedFields: 0,
      });
    }
  }
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
