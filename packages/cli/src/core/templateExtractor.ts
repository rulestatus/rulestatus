import type {
  AnyOf,
  ArrayReq,
  CheckNode,
  Config,
  Doc,
  EntryCondition,
  ModelCard,
  Structured,
} from "./check.js";
import { FRAMEWORK_LABEL, type RuleMeta } from "./rule.js";

export interface ExtractedField {
  canonical: string;
  aliases: string[];
  withinMonths?: number | undefined;
  ruleId: string;
  ruleTitle: string;
  article: string;
}

export interface ExtractedArrayField {
  canonical: string;
  aliases: string[];
  coversDimensions?: string[] | undefined;
  coversAtLeast?: { n: number; fromList: readonly string[] } | undefined;
  hasAnyEntryList: EntryCondition[][];
  ruleIds: string[];
  articles: string[];
}

export interface DocTemplateSpec {
  kind: "doc" | "structured" | "model-card" | "config";
  category: string;
  outputPath: string;
  framework: string;
  articles: string[];
  fields: ExtractedField[];
  arrayFields?: ExtractedArrayField[] | undefined;
}

// ── Collectors ────────────────────────────────────────────────────────────────

function collectDocs(node: CheckNode): Doc[] {
  if (node.kind === "doc") return [node];
  if (node.kind === "any-of") return (node as AnyOf).checks.flatMap((c) => collectDocs(c));
  return [];
}

interface NodeWithPath {
  kind: "structured" | "model-card" | "config";
  name: string;
  outputPath: string;
  reqs: { field?: string; anyOf?: string[]; withinMonths?: number }[];
  arrayReqs?: ArrayReq[] | undefined;
}

function collectTemplateNodes(node: CheckNode): NodeWithPath[] {
  if (node.kind === "structured") {
    const s = node as Structured;
    if (!s.outputPath) return [];
    return [
      {
        kind: "structured",
        name: s.name,
        outputPath: s.outputPath,
        reqs: s.reqs,
        arrayReqs: s.arrayReqs,
      },
    ];
  }
  if (node.kind === "model-card") {
    const m = node as ModelCard;
    return [{ kind: "model-card", name: "model-card", outputPath: m.outputPath, reqs: m.reqs }];
  }
  if (node.kind === "config") {
    const c = node as Config;
    if (!c.outputPath) return [];
    return [{ kind: "config", name: c.name, outputPath: c.outputPath, reqs: c.reqs }];
  }
  if (node.kind === "any-of") {
    return (node as AnyOf).checks.flatMap((c) => collectTemplateNodes(c));
  }
  return [];
}

// ── Extractors ────────────────────────────────────────────────────────────────

export function extractTemplates(rules: RuleMeta[]): DocTemplateSpec[] {
  const docSpecs = new Map<string, DocTemplateSpec>();
  const nodeSpecs = new Map<string, DocTemplateSpec>();

  for (const rule of rules) {
    if (!rule.check) continue;

    // Doc-based templates
    const docs = collectDocs(rule.check);
    for (const docNode of docs) {
      const key = `${rule.framework}:${docNode.category}`;
      if (!docSpecs.has(key)) {
        const dir = docNode.paths[0] ?? "docs/";
        const outputPath = `${dir}${docNode.category}.yaml`;
        docSpecs.set(key, {
          kind: "doc",
          category: docNode.category,
          outputPath,
          framework: rule.framework,
          articles: [],
          fields: [],
        });
      }
      const spec = docSpecs.get(key) as DocTemplateSpec;
      if (!spec.articles.includes(rule.article)) spec.articles.push(rule.article);
      for (const req of docNode.reqs) {
        const names = req.anyOf ?? (req.field ? [req.field] : []);
        if (names.length === 0) continue;
        spec.fields.push({
          canonical: names[0] as string,
          aliases: names.slice(1),
          withinMonths: req.withinMonths,
          ruleId: rule.id,
          ruleTitle: rule.title,
          article: rule.article,
        });
      }
    }

    // Structured/ModelCard/Config templates
    const nodes = collectTemplateNodes(rule.check);
    for (const n of nodes) {
      const key = `${rule.framework}:__node__:${n.kind}:${n.name}`;
      if (!nodeSpecs.has(key)) {
        nodeSpecs.set(key, {
          kind: n.kind,
          category: n.name,
          outputPath: n.outputPath,
          framework: rule.framework,
          articles: [],
          fields: [],
          arrayFields: [],
        });
      }
      const spec = nodeSpecs.get(key) as DocTemplateSpec;
      if (!spec.articles.includes(rule.article)) spec.articles.push(rule.article);

      for (const req of n.reqs) {
        const names = req.anyOf ?? (req.field ? [req.field] : []);
        if (names.length === 0) continue;
        spec.fields.push({
          canonical: names[0] as string,
          aliases: names.slice(1),
          withinMonths: req.withinMonths,
          ruleId: rule.id,
          ruleTitle: rule.title,
          article: rule.article,
        });
      }

      for (const ar of n.arrayReqs ?? []) {
        const fields = Array.isArray(ar.field) ? ar.field : [ar.field];
        const canonical = fields[0] as string;
        const aliases = fields.slice(1);
        const arrayFields = spec.arrayFields as ExtractedArrayField[];
        const existing = arrayFields.find((a) => a.canonical === canonical);
        if (existing) {
          if (ar.coversDimensions && !existing.coversDimensions)
            existing.coversDimensions = ar.coversDimensions;
          if (ar.coversAtLeast && !existing.coversAtLeast)
            existing.coversAtLeast = ar.coversAtLeast;
          if (ar.hasAnyEntry) existing.hasAnyEntryList.push(ar.hasAnyEntry);
          if (!existing.ruleIds.includes(rule.id)) existing.ruleIds.push(rule.id);
          if (!existing.articles.includes(rule.article)) existing.articles.push(rule.article);
        } else {
          arrayFields.push({
            canonical,
            aliases,
            coversDimensions: ar.coversDimensions,
            coversAtLeast: ar.coversAtLeast,
            hasAnyEntryList: ar.hasAnyEntry ? [ar.hasAnyEntry] : [],
            ruleIds: [rule.id],
            articles: [rule.article],
          });
        }
      }
    }
  }

  return [...docSpecs.values(), ...nodeSpecs.values()];
}

// ── Renderers ─────────────────────────────────────────────────────────────────

export function renderTemplate(spec: DocTemplateSpec): string {
  if (spec.kind !== "doc") return renderNodeTemplate(spec);

  const label = FRAMEWORK_LABEL[spec.framework] ?? spec.framework;
  const articles = spec.articles.join(", ");
  const lines: string[] = [
    `# ${spec.category} — ${label} ${articles}`,
    `# Auto-generated from rule definitions. Fill in every TODO, then run: rulestatus run`,
    "",
  ];

  const seen = new Set<string>();
  for (const field of spec.fields) {
    if (seen.has(field.canonical)) continue;
    seen.add(field.canonical);

    const aliasNote =
      field.aliases.length > 0 ? `  # aliases accepted: ${field.aliases.join(", ")}` : "";
    lines.push(`# ${field.ruleId}: ${field.ruleTitle}`);

    if (field.withinMonths) {
      lines.push(`# Must be a date within the last ${field.withinMonths} months`);
      lines.push(`${field.canonical}: "TODO: YYYY-MM-DD"${aliasNote}`);
    } else if (
      field.canonical.includes("_plan") ||
      field.canonical.includes("_process") ||
      field.canonical.includes("_program") ||
      field.canonical.includes("_policy") ||
      field.canonical === "statement" ||
      field.canonical === "scope" ||
      field.canonical === "methodology"
    ) {
      lines.push(`${field.canonical}: "TODO: Describe ..."${aliasNote}`);
    } else if (
      field.canonical === "roles" ||
      field.canonical === "objectives" ||
      field.canonical.endsWith("_parties") ||
      field.canonical.endsWith("_risks") ||
      field.canonical.endsWith("_stages") ||
      field.canonical.endsWith("_criteria") ||
      field.canonical.endsWith("_components")
    ) {
      lines.push(`${field.canonical}:${aliasNote}`);
      lines.push(`  - "TODO: item 1"`);
      lines.push(`  - "TODO: item 2"`);
    } else {
      lines.push(`${field.canonical}: "TODO: ..."${aliasNote}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function renderNodeTemplate(spec: DocTemplateSpec): string {
  const label = FRAMEWORK_LABEL[spec.framework] ?? spec.framework;
  const articles = spec.articles.join(", ");

  const header = [
    `# ${spec.category} — ${label} ${articles}`,
    `# Auto-generated from rule definitions. Fill in every TODO, then run: rulestatus run`,
    "",
  ];

  if (spec.kind === "structured") {
    return [...header, ...renderStructuredBody(spec)].join("\n");
  }

  if (spec.kind === "model-card") {
    return [...header, ...renderModelCardBody(spec)].join("\n");
  }

  // config
  return [...header, ...renderConfigBody(spec)].join("\n");
}

function renderStructuredBody(spec: DocTemplateSpec): string[] {
  const lines: string[] = [];

  // Regular fields first
  const seen = new Set<string>();
  for (const field of spec.fields) {
    if (seen.has(field.canonical)) continue;
    seen.add(field.canonical);
    lines.push(`# ${field.ruleId}: ${field.ruleTitle}`);
    lines.push(
      `${field.canonical}: "TODO: ..."${field.aliases.length > 0 ? `  # aliases accepted: ${field.aliases.join(", ")}` : ""}`,
    );
    lines.push("");
  }

  // Array fields
  for (const af of spec.arrayFields ?? []) {
    const aliasNote = af.aliases.length > 0 ? `  # aliases accepted: ${af.aliases.join(", ")}` : "";
    lines.push(`# Required by: ${af.ruleIds.join(", ")}`);
    lines.push(`${af.canonical}:${aliasNote}`);

    if (spec.category === "risk_register" && af.canonical === "risks") {
      lines.push(...renderRiskEntries(af));
    } else if (af.coversDimensions) {
      for (const dim of af.coversDimensions) {
        lines.push(`  - ${dim}: "TODO: ..."`);
      }
    } else if (af.coversAtLeast) {
      const examples = af.coversAtLeast.fromList.slice(0, 3);
      for (const ex of examples) {
        lines.push(`  - "${ex}"`);
      }
      lines.push(`  - "TODO: add at least ${af.coversAtLeast.n} items"`);
    } else {
      lines.push(`  - "TODO: item 1"`);
      lines.push(`  - "TODO: item 2"`);
    }
    lines.push("");
  }

  return lines;
}

function renderRiskEntries(af: ExtractedArrayField): string[] {
  const lines: string[] = [];
  const dims = af.coversDimensions ?? ["health", "safety", "fundamental_rights"];

  // One entry per required dimension
  dims.forEach((dim, i) => {
    lines.push(`  # Required: dimension = ${dim} (Art. ${af.articles[0]})`);
    lines.push(`  - id: RISK-${String(i + 1).padStart(3, "0")}`);
    lines.push(`    dimension: ${dim}           # health | safety | fundamental_rights`);
    lines.push(`    source: known               # known | emerging`);
    lines.push(`    description: "TODO: Describe the risk"`);
    lines.push(`    severity: high              # low | medium | high | critical`);
    lines.push(`    likelihood: medium          # low | medium | high`);
    lines.push(`    mitigation: "TODO: Describe how this risk is mitigated"`);
    lines.push(`    status: open                # open | mitigated | monitored | residual`);
    lines.push("");
  });

  // Emerging/misuse entry (satisfies hasAnyEntry conditions)
  const nextId = dims.length + 1;
  lines.push(`  # Required: source: emerging or category: misuse (foreseeable misuse scenario)`);
  lines.push(`  - id: RISK-${String(nextId).padStart(3, "0")}`);
  lines.push(`    dimension: safety`);
  lines.push(
    `    source: emerging            # source: emerging OR category: misuse satisfies this`,
  );
  lines.push(`    category: misuse`);
  lines.push(`    description: "TODO: Describe a foreseeable misuse scenario"`);
  lines.push(`    severity: high`);
  lines.push(`    likelihood: medium`);
  lines.push(`    mitigation: "TODO: Describe safeguards against this misuse"`);
  lines.push(`    status: open`);
  lines.push("");

  // Residual risk entry
  const residualId = nextId + 1;
  lines.push(`  # Required: at least one entry with status: residual`);
  lines.push(`  - id: RISK-${String(residualId).padStart(3, "0")}`);
  lines.push(`    dimension: fundamental_rights`);
  lines.push(`    source: emerging`);
  lines.push(
    `    description: "TODO: Describe a risk that cannot be fully eliminated after mitigation"`,
  );
  lines.push(`    severity: medium`);
  lines.push(`    likelihood: low`);
  lines.push(`    mitigation: "TODO: Describe partial mitigation measures in place"`);
  lines.push(`    status: residual            # status: residual required on at least one entry`);
  lines.push(`    residual_risk: "TODO: Explain why this risk cannot be fully eliminated"`);

  return lines;
}

function renderModelCardBody(spec: DocTemplateSpec): string[] {
  const lines: string[] = [];
  lines.push(`model_type: "TODO: e.g. XGBoost classifier | Neural network | Transformer"`);
  lines.push(`model_name: "TODO: Your model name"`);
  lines.push(`version: "1.0"`);
  lines.push(`date: "TODO: YYYY-MM-DD"`);
  lines.push(`provider: "TODO: Organisation name and registered address"`);
  lines.push(`intended_use: "TODO: Describe the intended purpose of this AI system"`);
  lines.push("");
  lines.push(`limitations:`);
  lines.push(`  - "TODO: Known limitation 1"`);
  lines.push(`  - "TODO: Known limitation 2"`);
  lines.push("");

  const seen = new Set<string>([
    "model_type",
    "modelType",
    "model_name",
    "modelName",
    "version",
    "date",
    "provider",
    "intended_use",
    "limitations",
  ]);
  for (const field of spec.fields) {
    if (seen.has(field.canonical)) continue;
    seen.add(field.canonical);
    const aliasNote =
      field.aliases.length > 0 ? `  # aliases accepted: ${field.aliases.join(", ")}` : "";
    lines.push(`# ${field.ruleId}: ${field.ruleTitle}`);
    if (field.canonical === "training_data" || field.canonical === "dataset_info") {
      lines.push(`${field.canonical}:${aliasNote}`);
      lines.push(`  sources:`);
      lines.push(`    - "TODO: Dataset name, origin, size, time period"`);
      lines.push(`  size: "TODO: e.g. 1M records"`);
      lines.push(`  time_period: "TODO: e.g. 2020–2024"`);
      lines.push(
        `  representativeness: "TODO: Explain how data is representative of the deployment population"`,
      );
    } else if (field.canonical === "metrics" || field.canonical === "model_performance") {
      lines.push(`${field.canonical}:${aliasNote}`);
      lines.push(`  precision: 0.0    # TODO: fill in`);
      lines.push(`  recall: 0.0       # TODO: fill in`);
      lines.push(`  f1: 0.0           # TODO: fill in`);
    } else {
      lines.push(`${field.canonical}: "TODO: ..."${aliasNote}`);
    }
    lines.push("");
  }

  lines.push(`model_architecture: "TODO: Describe model architecture and key design decisions"`);
  lines.push("");
  lines.push(`standards:`);
  lines.push(`  - "TODO: e.g. ISO/IEC 42001:2023"`);

  return lines;
}

function renderConfigBody(spec: DocTemplateSpec): string[] {
  const lines: string[] = [];

  if (spec.category === "transparency") {
    lines.push(`# ai_disclosure.enabled must be true (ASSERT-EU-AI-ACT-013-001-01)`);
    lines.push(`ai_disclosure:`);
    lines.push(
      `  enabled: true         # Must be true; set false only if disclosure is via API headers`,
    );
    lines.push(
      `  mechanism: "TODO: Describe how users are informed output is AI-generated (e.g. UI label, API header)"`,
    );
    lines.push("");
    lines.push(`# Provider contact information (Art. 13.3(a))`);
    lines.push(`provider_contact:`);
    lines.push(`  name: "TODO: Organisation legal name"`);
    lines.push(`  address: "TODO: Registered address"`);
    lines.push(`  email: "TODO: compliance@yourcompany.com"`);
    lines.push(
      `  eu_representative: "TODO: Name of EU authorised representative (required if provider is outside EU)"`,
    );
    return lines;
  }

  const seen = new Set<string>();
  for (const field of spec.fields) {
    if (seen.has(field.canonical)) continue;
    seen.add(field.canonical);
    const aliasNote =
      field.aliases.length > 0 ? `  # aliases accepted: ${field.aliases.join(", ")}` : "";
    lines.push(`# ${field.ruleId}: ${field.ruleTitle}`);
    lines.push(`${field.canonical}: "TODO: ..."${aliasNote}`);
    lines.push("");
  }

  return lines;
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loadAndExtract(framework: string): Promise<DocTemplateSpec[]> {
  let rules: RuleMeta[];
  if (framework === "eu-ai-act") {
    const { register } = await import("../frameworks/euAiAct/index.js");
    const { RuleRegistry } = await import("./rule.js");
    const reg = new RuleRegistry();
    register(reg);
    rules = [...reg.rules];
  } else if (framework === "iso-42001") {
    const { register } = await import("../frameworks/iso42001/index.js");
    const { RuleRegistry } = await import("./rule.js");
    const reg = new RuleRegistry();
    register(reg);
    rules = [...reg.rules];
  } else if (framework === "nist-ai-rmf") {
    const { register } = await import("../frameworks/nistAiRmf/index.js");
    const { RuleRegistry } = await import("./rule.js");
    const reg = new RuleRegistry();
    register(reg);
    rules = [...reg.rules];
  } else if (framework === "colorado-sb24-205") {
    const { register } = await import("../frameworks/coloradoSb24205/index.js");
    const { RuleRegistry } = await import("./rule.js");
    const reg = new RuleRegistry();
    register(reg);
    rules = [...reg.rules];
  } else {
    throw new Error(`Unknown framework: ${framework}`);
  }
  return extractTemplates(rules.filter((r) => r.framework === framework));
}
