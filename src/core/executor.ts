import type { EvidenceRegistry } from "../evidence/registry.js";
import type { Document } from "../evidence/types.js";
import type {
  AnyOf,
  Api,
  ArrayReq,
  CheckNode,
  Config,
  Doc,
  EntryCondition,
  FieldReq,
  Manual,
  ModelCard,
  Structured,
  SystemField,
} from "./check.js";
import type { SystemContext } from "./context.js";
import { ComplianceError, ManualReviewRequired } from "./exceptions.js";

export async function executeCheck(node: CheckNode, system: SystemContext): Promise<void> {
  const ev = system.evidence;
  switch (node.kind) {
    case "doc":
      return executeDoc(node, ev);
    case "structured":
      return executeStructured(node, ev);
    case "config":
      return executeConfig(node, ev);
    case "model-card":
      return executeModelCard(node, ev);
    case "api":
      return executeApi(node, system);
    case "system-field":
      return executeSystemField(node, system);
    case "manual":
      return executeManual(node, ev);
    case "any-of":
      return executeAnyOf(node, system);
  }
}

// ── Doc ───────────────────────────────────────────────────────────────────────

async function executeDoc(node: Doc, ev: EvidenceRegistry): Promise<void> {
  const doc = await ev.findDocument({
    category: node.category,
    paths: node.paths,
    formats: node.fmts,
  });
  if (!doc) {
    throw new ComplianceError(
      `No ${node.category} document found. Expected in: ${node.paths.join(", ")}.`,
    );
  }
  for (const req of node.reqs) applyFieldReqToDoc(req, doc, node.category);
  if (node.minCoverage) {
    const { threshold, fields } = node.minCoverage;
    const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    const covered = fields.filter((f) => doc.hasField(f) || doc.hasField(camel(f)));
    if (covered.length < threshold) {
      const missing = fields.filter((f) => !covered.includes(f));
      throw new ComplianceError(
        `${node.category} covers ${covered.length}/${fields.length} required sections (need ≥ ${threshold}). ` +
          `Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}.`,
      );
    }
  }
}

function applyFieldReqToDoc(req: FieldReq, doc: Document, label: string): void {
  if (req.field) {
    const camel = toCamel(req.field);
    if (!doc.hasField(req.field) && !doc.hasField(camel)) {
      throw new ComplianceError(`${label} document missing: ${req.field}.`);
    }
    if (req.withinMonths) {
      const fv = doc.field(req.field).exists() ? doc.field(req.field) : doc.field(camel);
      if (!fv.withinMonths(req.withinMonths)) {
        throw new ComplianceError(
          `${label}: ${req.field} has not been updated in the last ${req.withinMonths} months. Last value: ${fv}.`,
        );
      }
    }
  } else if (req.anyOf) {
    const found = req.anyOf.some((f) => doc.hasField(f) || doc.hasField(toCamel(f)));
    if (!found) {
      throw new ComplianceError(`${label} document missing: ${req.anyOf[0]} (or alias).`);
    }
    if (req.withinMonths) {
      const fv = req.anyOf
        .flatMap((f) => [doc.field(f), doc.field(toCamel(f))])
        .find((fv) => fv.exists());
      if (!fv?.withinMonths(req.withinMonths)) {
        throw new ComplianceError(
          `${label}: ${req.anyOf[0]} has not been updated in the last ${req.withinMonths} months.`,
        );
      }
    }
  }
}

// ── Structured ────────────────────────────────────────────────────────────────

async function executeStructured(node: Structured, ev: EvidenceRegistry): Promise<void> {
  const data = await ev.loadStructured(node.name);
  if (!data) {
    throw new ComplianceError(
      `No ${node.name} file found. Expected at docs/${node.name}.json or docs/${node.name}.yaml.`,
    );
  }
  for (const req of node.reqs) applyFieldReqToData(req, data, node.name);
  for (const arr of node.arrayReqs) applyArrayReq(arr, data, node.name);
}

function applyFieldReqToData(req: FieldReq, data: Record<string, unknown>, label: string): void {
  if (req.field) {
    const v = data[req.field] ?? data[toCamel(req.field)];
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
      throw new ComplianceError(`${label} missing field: ${req.field}.`);
    }
  } else if (req.anyOf) {
    const found = req.anyOf.some((f) => {
      const v = data[f] ?? data[toCamel(f)];
      return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
    });
    if (!found) {
      throw new ComplianceError(`${label} missing field: ${req.anyOf[0]} (or alias).`);
    }
  }
}

function applyArrayReq(req: ArrayReq, data: Record<string, unknown>, label: string): void {
  // Resolve field(s) to the actual array value
  const fields = Array.isArray(req.field) ? req.field : [req.field];
  let arr: unknown[] | null = null;
  let resolvedField = fields[0];
  for (const f of fields) {
    const v = data[f] ?? data[toCamel(f)];
    if (Array.isArray(v) && v.length > 0) {
      arr = v as unknown[];
      resolvedField = f;
      break;
    }
  }

  if (!arr || arr.length === 0) {
    throw new ComplianceError(`${label}.${resolvedField} is missing or empty.`);
  }

  if (req.minLength !== undefined && arr.length < req.minLength) {
    throw new ComplianceError(
      `${label}.${resolvedField} has ${arr.length} entries (need ≥ ${req.minLength}).`,
    );
  }

  if (req.coversDimensions) {
    const entries = arr as Record<string, unknown>[];
    const found = new Set(entries.map((r) => String(r.dimension ?? "")));
    const missing = req.coversDimensions.filter((d) => !found.has(d));
    if (missing.length > 0) {
      throw new ComplianceError(
        `${label}.${resolvedField} missing required dimensions: ${missing.join(", ")}.`,
      );
    }
  }

  if (req.hasAnyEntry) {
    const entries = arr as Record<string, unknown>[];
    const matched = entries.some((entry) =>
      req.hasAnyEntry?.some((cond) => matchesCondition(entry, cond)),
    );
    if (!matched) {
      const desc = req.hasAnyEntry
        .map((c) =>
          Object.entries(c)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(","),
        )
        .join(" or ");
      throw new ComplianceError(`${label}.${resolvedField} has no entry matching: ${desc}.`);
    }
  }

  if (req.coversAtLeast) {
    const { n, fromList } = req.coversAtLeast;
    const values = arr.map((v) => String(v).toLowerCase());
    const matched = fromList.filter((item) => values.some((v) => v.includes(item.toLowerCase())));
    if (matched.length < n) {
      throw new ComplianceError(
        `${label}.${resolvedField} covers ${matched.length} of required values (need ≥ ${n}): ${matched.join(", ") || "none"}.`,
      );
    }
  }
}

function matchesCondition(entry: Record<string, unknown>, cond: EntryCondition): boolean {
  return Object.entries(cond).every(([k, expected]) => {
    const v = entry[k];
    if (typeof expected === "string")
      return String(v ?? "").toLowerCase() === expected.toLowerCase();
    if (typeof expected === "object" && "contains" in expected) {
      return String(v ?? "")
        .toLowerCase()
        .includes(expected.contains.toLowerCase());
    }
    if (typeof expected === "object" && "exists" in expected) {
      return v !== null && v !== undefined;
    }
    return false;
  });
}

// ── Config ────────────────────────────────────────────────────────────────────

async function executeConfig(node: Config, ev: EvidenceRegistry): Promise<void> {
  const data = await ev.loadConfig(node.name);
  if (!data) {
    throw new ComplianceError(`Config ${node.name} not found.`);
  }
  for (const req of node.reqs) applyFieldReqToData(req, data, node.name);
  for (const { path, value } of node.valueChecks) {
    const actual = getNestedValue(data, path);
    if (actual !== value) {
      throw new ComplianceError(
        `${node.name}.${path} must be ${JSON.stringify(value)}, got ${JSON.stringify(actual)}.`,
      );
    }
  }
  for (const { fields, values } of node.valueInChecks) {
    const found = fields.some((f) => {
      const v = String(data[f] ?? data[toCamel(f)] ?? "").trim();
      return v.length > 0 && (values as readonly string[]).includes(v);
    });
    if (!found) {
      throw new ComplianceError(`${node.name}.${fields[0]} must be one of: ${values.join(", ")}.`);
    }
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// ── ModelCard ─────────────────────────────────────────────────────────────────

async function executeModelCard(node: ModelCard, ev: EvidenceRegistry): Promise<void> {
  const mc = await ev.loadModelCard();
  if (!mc) {
    throw new ComplianceError("No model card found.");
  }
  for (const req of node.reqs) applyFieldReqToDoc(req, mc, "model card");
}

// ── Api ───────────────────────────────────────────────────────────────────────

async function executeApi(node: Api, system: SystemContext): Promise<void> {
  if (!system.hasApi()) {
    throw new ComplianceError(`No API configured — cannot probe ${node.endpoint}.`);
  }
  const res = await system.evidence.probeApi(node.endpoint);
  if (!res) {
    throw new ComplianceError(`API probe ${node.endpoint} returned no response.`);
  }
  if (node.requireOk && !res.ok) {
    throw new ComplianceError(
      `API probe ${node.endpoint} returned ${res.statusCode} (expected 2xx).`,
    );
  }
  if (node.excludeStatus !== undefined && res.statusCode === node.excludeStatus) {
    throw new ComplianceError(`API probe ${node.endpoint} returned ${res.statusCode}.`);
  }
}

// ── SystemField ───────────────────────────────────────────────────────────────

async function executeSystemField(node: SystemField, system: SystemContext): Promise<void> {
  const value = (system as unknown as Record<string, unknown>)[node.field] as string;
  if (node.values && !node.values.includes(value)) {
    throw new ComplianceError(
      `System ${node.field} "${value}" is not a recognised value. Expected one of: ${node.values.join(", ")}.`,
    );
  }
}

// ── Manual ────────────────────────────────────────────────────────────────────

async function executeManual(node: Manual, ev: EvidenceRegistry): Promise<void> {
  ev.requireManual(node.reason);
}

// ── AnyOf ─────────────────────────────────────────────────────────────────────

async function executeAnyOf(node: AnyOf, system: SystemContext): Promise<void> {
  let lastError: Error | null = null;
  for (const check of node.checks) {
    try {
      await executeCheck(check, system);
      return; // first passing check wins
    } catch (e) {
      if (e instanceof ManualReviewRequired) throw e; // manual is always terminal
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new ComplianceError("No evidence found.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
