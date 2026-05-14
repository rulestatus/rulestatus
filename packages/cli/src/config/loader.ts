import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";
import { RulestatusConfigError } from "../core/exceptions.js";
import { defaultConfig, type RulestatusConfig } from "./schema.js";

const CONFIG_FILENAMES = [".rulestatus.yaml", ".rulestatus.yml", "rulestatus.yaml"];

export function findConfig(startDir = "."): string | null {
  let dir = resolve(startDir);
  const root = resolve("/");

  while (true) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = resolve(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir || dir === root) break;
    dir = parent;
  }
  return null;
}

export async function loadConfig(configPath?: string): Promise<RulestatusConfig> {
  const resolved = configPath ?? findConfig();
  if (!resolved) return defaultConfig();

  let raw: Record<string, unknown>;
  try {
    const text = readFileSync(resolved, "utf-8");
    const parsed = yaml.load(text);
    raw = (parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}) as Record<
      string,
      unknown
    >;
  } catch (e) {
    throw new RulestatusConfigError(`Cannot parse ${resolved}: ${e}`);
  }

  const defaults = defaultConfig();
  const sys = (raw.system ?? {}) as Record<string, unknown>;
  const ev = (raw.evidence ?? {}) as Record<string, unknown>;
  const rp = (raw.reporting ?? {}) as Record<string, unknown>;
  const sg = (raw.severity_gate ?? raw.severityGate ?? {}) as Record<string, unknown>;

  return {
    system: {
      name: String(sys.name ?? defaults.system.name),
      actor: String(sys.actor ?? defaults.system.actor),
      riskLevel: String(sys.risk_level ?? sys.riskLevel ?? defaults.system.riskLevel),
      domain: String(sys.domain ?? defaults.system.domain),
      intendedUse: String(sys.intended_use ?? sys.intendedUse ?? defaults.system.intendedUse),
      apiBaseUrl: String(sys.api_base_url ?? sys.apiBaseUrl ?? defaults.system.apiBaseUrl),
    },
    frameworks: Array.isArray(raw.frameworks) ? (raw.frameworks as string[]) : defaults.frameworks,
    evidence: {
      docsPath: String(ev.docs_path ?? ev.docsPath ?? defaults.evidence.docsPath),
      modelCard: String(ev.model_card ?? ev.modelCard ?? defaults.evidence.modelCard),
      riskRegister: String(ev.risk_register ?? ev.riskRegister ?? defaults.evidence.riskRegister),
      apiBaseUrl: String(ev.api_base_url ?? ev.apiBaseUrl ?? defaults.evidence.apiBaseUrl),
      configPath: String(ev.config_path ?? ev.configPath ?? defaults.evidence.configPath),
    },
    reporting: {
      format: Array.isArray(rp.format) ? (rp.format as string[]) : defaults.reporting.format,
      outputDir: String(rp.output_dir ?? rp.outputDir ?? defaults.reporting.outputDir),
      badge: Boolean(rp.badge ?? defaults.reporting.badge),
    },
    severityGate: {
      failOn: String(
        sg.fail_on ?? sg.failOn ?? defaults.severityGate.failOn,
      ) as RulestatusConfig["severityGate"]["failOn"],
      warnOn: String(
        sg.warn_on ?? sg.warnOn ?? defaults.severityGate.warnOn,
      ) as RulestatusConfig["severityGate"]["warnOn"],
    },
    attestExpiry: Number(raw.attest_expiry ?? raw.attestExpiry ?? defaults.attestExpiry),
  };
}
