import { existsSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { DictDocument } from "../document.js";
import type { Document, EvidenceCollector, FindDocumentOptions } from "../types.js";

export class ModelCardCollector implements EvidenceCollector {
  constructor(
    private readonly basePath: string,
    private readonly evidenceConfig: Record<string, unknown>,
  ) {}

  async findDocument(_opts: FindDocumentOptions): Promise<Document | null> {
    return this.load();
  }

  async loadStructured(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async loadConfig(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async load(): Promise<Document | null> {
    const configured = this.evidenceConfig.model_card ?? this.evidenceConfig.modelCard;
    const candidates: string[] = [];

    if (configured) candidates.push(resolve(this.basePath, String(configured)));

    candidates.push(
      resolve(this.basePath, "model_card.yaml"),
      resolve(this.basePath, "model_card.yml"),
      resolve(this.basePath, "model", "model_card.yaml"),
      resolve(this.basePath, "MODEL_CARD.md"),
      resolve(this.basePath, "model_card.md"),
    );

    for (const filePath of candidates) {
      if (!existsSync(filePath)) continue;
      try {
        const text = await Bun.file(filePath).text();
        const ext = filePath.split(".").pop()?.toLowerCase();

        if (ext === "yaml" || ext === "yml") {
          const data = yaml.load(text);
          if (data && typeof data === "object" && !Array.isArray(data)) {
            return new DictDocument(data as Record<string, unknown>, filePath);
          }
        } else if (ext === "md" && text.startsWith("---")) {
          const parts = text.split("---");
          if (parts.length >= 3) {
            const fm = yaml.load(parts[1] ?? "");
            if (fm && typeof fm === "object" && !Array.isArray(fm)) {
              const data = {
                ...(fm as Record<string, unknown>),
                _body: parts.slice(2).join("---"),
              };
              return new DictDocument(data, filePath);
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  }
}
