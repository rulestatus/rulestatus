import type { EvidenceRegistry } from "../evidence/registry.js";
import type {
  ApiResponse,
  Confidence,
  Document,
  EvidenceProvider,
  EvidenceSource,
  FindDocumentOptions,
} from "../evidence/types.js";
export class RuleExecutionContext implements EvidenceProvider {
  private readonly sourcePaths: string[] = [];
  private _confidence: Confidence = "strong";

  constructor(private readonly registry: EvidenceRegistry) {}

  async findDocument(opts: FindDocumentOptions): Promise<Document | null> {
    const doc = await this.registry.findDocument(opts);
    if (doc?.sourcePath) this.sourcePaths.push(doc.sourcePath);
    return doc;
  }

  async loadStructured(name: string): Promise<Record<string, unknown> | null> {
    const data = await this.registry.loadStructured(name);
    if (data !== null) {
      const path = this.registry.getStructuredSourcePath(name);
      if (path) this.sourcePaths.push(path);
    }
    return data;
  }

  async loadConfig(name: string): Promise<Record<string, unknown> | null> {
    return this.registry.loadConfig(name);
  }

  async loadModelCard(): Promise<Document | null> {
    const doc = await this.registry.loadModelCard();
    if (doc?.sourcePath) this.sourcePaths.push(doc.sourcePath);
    return doc;
  }

  async probeApi(endpoint: string): Promise<ApiResponse | null> {
    return this.registry.probeApi(endpoint);
  }

  hasApi(): boolean {
    return this.registry.hasApi();
  }

  setConfidence(c: Confidence): void {
    this._confidence = c;
  }

  getConfidence(): Confidence {
    return this._confidence;
  }

  snapshotSources(): EvidenceSource[] {
    const paths = [...new Set(this.sourcePaths)];
    return paths
      .map((p) => this.registry.getSource(p))
      .filter((s): s is EvidenceSource => s !== undefined);
  }
}
