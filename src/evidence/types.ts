export interface FieldValue {
  /** Raw value. */
  raw: unknown;
  /** True if the value is non-null, non-empty. */
  exists(): boolean;
  /** True if the date value is within `n` months of now. */
  withinMonths(n: number): boolean;
  toString(): string;
}

export interface Document {
  /** Path of the source file (for provenance). */
  sourcePath: string;
  /** True if the document contains a non-empty field with this name. */
  hasField(name: string): boolean;
  /** Returns a FieldValue for the given field. Never throws. */
  field(name: string): FieldValue;
}

export interface FindDocumentOptions {
  category: string;
  paths: string[];
  formats: string[];
}

export interface EvidenceCollector {
  findDocument(opts: FindDocumentOptions): Promise<Document | null>;
  loadStructured(name: string): Promise<Record<string, unknown> | null>;
  loadConfig(name: string): Promise<Record<string, unknown> | null>;
}
