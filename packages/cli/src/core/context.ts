import type { SystemConfig } from "../config/schema.js";
import type { EvidenceRegistry } from "../evidence/registry.js";

export class SystemContext {
  readonly evidence: EvidenceRegistry;

  constructor(
    private readonly config: SystemConfig,
    evidenceRegistry: EvidenceRegistry,
  ) {
    this.evidence = evidenceRegistry;
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
