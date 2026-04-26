import { ManualReviewRequired } from "../../core/exceptions.js";
import type { EvidenceCollector, FindDocumentOptions, Document } from "../types.js";

export class ManualCollector implements EvidenceCollector {
  async findDocument(_opts: FindDocumentOptions): Promise<Document | null> {
    return null;
  }

  async loadStructured(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async loadConfig(_name: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  require(message: string): never {
    throw new ManualReviewRequired(message);
  }
}
