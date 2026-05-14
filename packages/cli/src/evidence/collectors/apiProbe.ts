import type { ApiResponse, Document, EvidenceCollector, FindDocumentOptions } from "../types.js";

export class ApiProbeCollector implements EvidenceCollector {
  constructor(
    _basePath: string,
    private readonly evidenceConfig: Record<string, unknown>,
  ) {}

  async findDocument(_opts: FindDocumentOptions): Promise<Document | null> {
    return null;
  }

  async loadStructured(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async loadConfig(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async probe(endpoint: string, timeoutMs = 10_000): Promise<ApiResponse | null> {
    const baseUrl = String(
      this.evidenceConfig.api_base_url ?? this.evidenceConfig.apiBaseUrl ?? "",
    ).trim();
    if (!baseUrl) return null;

    const url = `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const rawBody = await res.text();
      return {
        statusCode: res.status,
        headers,
        ok: res.ok,
        async body() {
          try {
            return JSON.parse(rawBody);
          } catch {
            return rawBody;
          }
        },
      };
    } catch {
      return null;
    }
  }
}
