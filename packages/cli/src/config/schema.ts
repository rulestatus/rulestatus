import type { SeverityLevel } from "../core/severity.js";

export interface SystemConfig {
  name: string;
  actor: string;
  riskLevel: string;
  domain: string;
  intendedUse: string;
  apiBaseUrl: string;
}

export interface EvidenceConfig {
  docsPath: string;
  modelCard: string;
  riskRegister: string;
  apiBaseUrl: string;
  configPath: string;
  [key: string]: string;
}

export interface ReportingConfig {
  format: string[];
  outputDir: string;
  badge: boolean;
}

export interface SeverityGateConfig {
  failOn: SeverityLevel;
  warnOn: SeverityLevel;
}

export interface RulestatusConfig {
  system: SystemConfig;
  frameworks: string[];
  evidence: EvidenceConfig;
  reporting: ReportingConfig;
  severityGate: SeverityGateConfig;
}

export function defaultConfig(): RulestatusConfig {
  return {
    system: {
      name: "Unknown System",
      actor: "provider",
      riskLevel: "high-risk",
      domain: "",
      intendedUse: "",
      apiBaseUrl: "",
    },
    frameworks: ["eu-ai-act"],
    evidence: {
      docsPath: "./docs/compliance/",
      modelCard: "",
      riskRegister: "",
      apiBaseUrl: "",
      configPath: "./config/",
    },
    reporting: {
      format: ["console"],
      outputDir: "./compliance-reports/",
      badge: false,
    },
    severityGate: {
      failOn: "critical",
      warnOn: "major",
    },
  };
}
