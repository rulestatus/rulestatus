import type { Document, FieldValue } from "./types.js";

function makeFieldValue(raw: unknown): FieldValue {
  return {
    raw,
    exists() {
      return raw !== null && raw !== undefined && raw !== "";
    },
    withinMonths(n: number): boolean {
      if (!raw) return false;
      try {
        const dt = new Date(String(raw));
        if (isNaN(dt.getTime())) return false;
        const diffMs = Date.now() - dt.getTime();
        return diffMs >= 0 && diffMs <= n * 30 * 24 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    },
    toString() {
      return raw == null ? "" : String(raw);
    },
  };
}

/** Document backed by a parsed dict (YAML / JSON). */
export class DictDocument implements Document {
  constructor(
    private readonly data: Record<string, unknown>,
    public readonly sourcePath: string,
  ) {}

  hasField(name: string): boolean {
    const val = this.data[name];
    return val !== null && val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0);
  }

  field(name: string): FieldValue {
    return makeFieldValue(this.data[name] ?? null);
  }

  /** Expose raw data for rules that need to iterate (e.g. risk registers). */
  get raw(): Record<string, unknown> {
    return this.data;
  }
}

/** Document backed by plain text (Markdown without YAML front-matter). */
export class TextDocument implements Document {
  constructor(
    private readonly text: string,
    public readonly sourcePath: string,
  ) {}

  hasField(name: string): boolean {
    const pattern = new RegExp(
      `(?:^#{1,4}\\s*${escapeRegex(name)}|^${escapeRegex(name)}\\s*:)`,
      "im",
    );
    return pattern.test(this.text);
  }

  field(name: string): FieldValue {
    const pattern = new RegExp(
      `^(?:#{1,4}\\s*)?${escapeRegex(name)}\\s*:?\\s*(.+)$`,
      "im",
    );
    const m = this.text.match(pattern);
    return makeFieldValue(m ? m[1]?.trim() ?? null : null);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
