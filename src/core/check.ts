/**
 * Builder DSL for compliance rule checks.
 *
 * Rules express their evidence requirements as composable data structures
 * instead of imperative functions. The engine executes them via executor.ts.
 * The same structures can be serialized for legal review.
 *
 * Usage:
 *   rule({ id: "...", check: doc("risk-management").inPaths([...]).require("system_name") })
 */

// ── Requirement types ────────────────────────────────────────────────────────

export interface FieldReq {
  anyOf?: string[];
  field?: string;
  withinMonths?: number;
}

export type EntryCondition = Record<string, string | { contains: string } | { exists: true }>;

export interface ArrayReq {
  /** Field name(s) — if array, the first non-null/non-empty value found is used. */
  field: string | string[];
  minLength?: number;
  /** Every value in this list must appear in at least one entry's `dimension` field. */
  coversDimensions?: string[];
  /** At least one entry must match at least one of these condition objects. */
  hasAnyEntry?: EntryCondition[];
  /** Array values (strings) must include at least `n` items from `fromList`. */
  coversAtLeast?: { n: number; fromList: readonly string[] };
}

export interface FieldCoverage {
  /** At least `threshold` of these fields must be present. */
  threshold: number;
  fields: string[];
}

// ── CheckNode discriminated union ─────────────────────────────────────────────

export type CheckNode = Doc | Structured | Config | ModelCard | Api | SystemField | Manual | AnyOf;

// ── Builder: Doc ─────────────────────────────────────────────────────────────

export class Doc {
  readonly kind = "doc" as const;
  category: string;
  paths: string[] = [];
  fmts: string[] = ["yaml", "md", "pdf", "docx"];
  reqs: FieldReq[] = [];
  minCoverage?: FieldCoverage;
  private _last: FieldReq | null = null;

  constructor(category: string) {
    this.category = category;
  }

  inPaths(paths: string[]): this {
    this.paths = paths;
    return this;
  }

  formats(fmts: string[]): this {
    this.fmts = fmts;
    return this;
  }

  require(field: string): this {
    const r: FieldReq = { field };
    this.reqs.push(r);
    this._last = r;
    return this;
  }

  requireAny(...fields: string[]): this {
    const r: FieldReq = { anyOf: fields };
    this.reqs.push(r);
    this._last = r;
    return this;
  }

  /** Constrains the last-added field requirement to be a date within N months. */
  withinMonths(n: number): this {
    if (this._last) this._last.withinMonths = n;
    return this;
  }

  /** At least `n` of the given fields must be present in the document. */
  minFieldCoverage(n: number, fields: string[]): this {
    this.minCoverage = { threshold: n, fields };
    return this;
  }
}

// ── Builder: Structured ──────────────────────────────────────────────────────

export class Structured {
  readonly kind = "structured" as const;
  name: string;
  reqs: FieldReq[] = [];
  arrayReqs: ArrayReq[] = [];
  private _last: FieldReq | null = null;

  constructor(name: string) {
    this.name = name;
  }

  require(field: string): this {
    const r: FieldReq = { field };
    this.reqs.push(r);
    this._last = r;
    return this;
  }

  requireAny(...fields: string[]): this {
    const r: FieldReq = { anyOf: fields };
    this.reqs.push(r);
    this._last = r;
    return this;
  }

  /** Constrains the last-added field requirement to be a date within N months. */
  withinMonths(n: number): this {
    if (this._last) this._last.withinMonths = n;
    return this;
  }

  requireArray(field: string): ArrayBuilder {
    return new ArrayBuilder(this, field);
  }

  /** Like requireArray but accepts the first non-empty field found from the list. */
  requireAnyArray(...fields: string[]): ArrayBuilder {
    return new ArrayBuilder(this, fields);
  }
}

export class ArrayBuilder {
  private req: ArrayReq;
  constructor(
    private parent: Structured,
    field: string | string[],
  ) {
    this.req = { field };
    parent.arrayReqs.push(this.req);
  }

  minLength(n: number): Structured {
    this.req.minLength = n;
    return this.parent;
  }

  coversDimensions(dims: string[]): Structured {
    this.req.coversDimensions = dims;
    return this.parent;
  }

  hasAnyEntry(conditions: EntryCondition[]): Structured {
    this.req.hasAnyEntry = conditions;
    return this.parent;
  }

  /** Array values (strings) must include at least n from fromList. */
  coversAtLeast(n: number, fromList: readonly string[]): Structured {
    this.req.coversAtLeast = { n, fromList };
    return this.parent;
  }
}

// ── Builder: Config ──────────────────────────────────────────────────────────

export class Config {
  readonly kind = "config" as const;
  name: string;
  reqs: FieldReq[] = [];
  valueChecks: { path: string; value: unknown }[] = [];
  valueInChecks: { fields: string[]; values: readonly string[] }[] = [];

  constructor(name: string) {
    this.name = name;
  }

  require(field: string): this {
    this.reqs.push({ field });
    return this;
  }

  requireAny(...fields: string[]): this {
    this.reqs.push({ anyOf: fields });
    return this;
  }

  /** dot-path value check, e.g. "override.enabled" must equal true */
  requireNestedValue(path: string, value: unknown): this {
    this.valueChecks.push({ path, value });
    return this;
  }

  /** Any of `fields` (including camelCase alternates) must be in `values`. */
  requireFieldIn(fields: string[], values: readonly string[]): this {
    this.valueInChecks.push({ fields, values });
    return this;
  }
}

// ── Builder: ModelCard ───────────────────────────────────────────────────────

export class ModelCard {
  readonly kind = "model-card" as const;
  reqs: FieldReq[] = [];

  require(field: string): this {
    this.reqs.push({ field });
    return this;
  }

  requireAny(...fields: string[]): this {
    this.reqs.push({ anyOf: fields });
    return this;
  }
}

// ── Builder: Api ─────────────────────────────────────────────────────────────

export class Api {
  readonly kind = "api" as const;
  endpoint: string;
  requireOk = false;
  excludeStatus?: number;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /** Pass if response status is 2xx. */
  expectOk(): this {
    this.requireOk = true;
    return this;
  }

  /** Pass if response status is NOT this code (e.g. not 404). */
  expectStatusNot(code: number): this {
    this.excludeStatus = code;
    return this;
  }
}

// ── Builder: SystemField ─────────────────────────────────────────────────────

export class SystemField {
  readonly kind = "system-field" as const;
  field: string;
  values?: readonly string[];

  constructor(field: string) {
    this.field = field;
  }

  validValues(values: readonly string[]): this {
    this.values = values;
    return this;
  }
}

// ── Manual ───────────────────────────────────────────────────────────────────

export class Manual {
  readonly kind = "manual" as const;
  constructor(public reason: string) {}
}

// ── AnyOf combinator ─────────────────────────────────────────────────────────

export class AnyOf {
  readonly kind = "any-of" as const;
  constructor(public checks: CheckNode[]) {}
}

// ── Factory functions ─────────────────────────────────────────────────────────

export const doc = (category: string) => new Doc(category);
export const structured = (name: string) => new Structured(name);
export const config = (name: string) => new Config(name);
export const modelCard = () => new ModelCard();
export const api = (endpoint: string) => new Api(endpoint);
export const systemField = (field: string) => new SystemField(field);
export const manual = (reason: string) => new Manual(reason);
export const anyOf = (...checks: CheckNode[]) => new AnyOf(checks);
