import type { SystemConfig } from "../config/schema.js";
import type { EvidenceProvider } from "../evidence/types.js";

export class SystemContext {
  readonly evidence: EvidenceProvider;

  constructor(
    private readonly config: SystemConfig,
    evidenceProvider: EvidenceProvider,
  ) {
    this.evidence = evidenceProvider;
  }

  get name(): string {
    return this.config.name;
  }

  get actor(): string {
    return this.config.actor;
  }

  get riskLevel(): string {
    return this.config.riskLevel;
  }

  get domain(): string {
    return this.config.domain;
  }

  hasApi(): boolean {
    return this.evidence.hasApi();
  }
}
