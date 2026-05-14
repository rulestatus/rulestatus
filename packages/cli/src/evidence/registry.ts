import { ApiProbeCollector } from "./collectors/apiProbe.js";
import { ConfigCollector } from "./collectors/config.js";
import { FilesystemCollector } from "./collectors/filesystem.js";
import { ModelCardCollector } from "./collectors/modelCard.js";
import { DictDocument, TextDocument } from "./document.js";
import { redactData, redactText } from "./redact.js";
import type { ApiResponse, Document, EvidenceSource, FindDocumentOptions } from "./types.js";

export class EvidenceRegistry {
  private readonly cache = new Map<string, unknown>();
  private readonly sourceMap = new Map<string, EvidenceSource>(); // filePath → source
  private readonly cachePathMap = new Map<string, string>(); // cacheKey → filePath

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
      return this.cache.get(key) as Document | null;
    }
    const raw = await this.fs.findDocument(opts);
    const [result, redactedFields] = raw ? this.redactDocument(raw) : [null, 0];
    this.cache.set(key, result);
    if (result) {
      this.recordDocumentSource(result, redactedFields);
    }
    return result;
  }

  async loadStructured(name: string): Promise<Record<string, unknown> | null> {
    const key = `structured:${name}`;
    if (this.cache.has(key)) {
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
      const { data, redactedFields } = redactData(meta.data);
      this.sourceMap.set(meta.filePath, {
        filePath: meta.filePath,
        sha256: meta.sha256,
        redactedFields,
      });
      this.cachePathMap.set(key, meta.filePath);
      this.cache.set(key, data);
      return data;
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
      return this.cache.get(key) as Document | null;
    }
    const raw = await this.mc.load();
    const [result, redactedFields] = raw ? this.redactDocument(raw) : [null, 0];
    this.cache.set(key, result);
    if (result) {
      this.recordDocumentSource(result, redactedFields);
    }
    return result;
  }

  async probeApi(endpoint: string): Promise<ApiResponse | null> {
    return this.api.probe(endpoint);
  }

  /** Returns true if an API base URL is configured. */
  hasApi(): boolean {
    const url = String(
      this.evidenceConfig.api_base_url ?? this.evidenceConfig.apiBaseUrl ?? "",
    ).trim();
    return url.length > 0;
  }

  /** Returns the EvidenceSource for a file path, if it was recorded during load. */
  getSource(filePath: string): EvidenceSource | undefined {
    return this.sourceMap.get(filePath);
  }

  /** Returns the file path cached for a structured document by name, if any. */
  getStructuredSourcePath(name: string): string | undefined {
    return this.cachePathMap.get(`structured:${name}`);
  }

  private recordDocumentSource(doc: Document, redactedFields = 0): void {
    if (!doc.sha256) return;
    if (!this.sourceMap.has(doc.sourcePath)) {
      this.sourceMap.set(doc.sourcePath, {
        filePath: doc.sourcePath,
        sha256: doc.sha256,
        redactedFields,
      });
    }
  }

  private redactDocument(doc: Document): [Document, number] {
    if (doc instanceof DictDocument) {
      const { data, redactedFields } = redactData(doc.raw);
      return [new DictDocument(data, doc.sourcePath, doc.sha256), redactedFields];
    }
    if (doc instanceof TextDocument) {
      const { text, redactedFields } = redactText(doc.rawText);
      return [new TextDocument(text, doc.sourcePath, doc.sha256), redactedFields];
    }
    return [doc, 0];
  }
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
