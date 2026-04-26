import { describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FilesystemCollector } from "../../src/evidence/collectors/filesystem.js";

function tmpDir(): string {
  const dir = join(tmpdir(), `rulestatus-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("FilesystemCollector", () => {
  it("finds a YAML document in the specified path", async () => {
    const base = tmpDir();
    const docsDir = join(base, "docs", "risk-management");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, "risk-management.yaml"),
      "system_name: Test\nreview_date: '2025-01-01'\nidentified_risks: []\nmitigation_measures: []",
    );

    const collector = new FilesystemCollector(base, {});
    const doc = await collector.findDocument({
      category: "risk-management",
      paths: ["docs/risk-management/"],
      formats: ["yaml", "md"],
    });

    expect(doc).not.toBeNull();
    expect(doc?.hasField("system_name")).toBe(true);
  });

  it("prefers YAML over Markdown when both exist", async () => {
    const base = tmpDir();
    const docsDir = join(base, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "doc.yaml"), "system_name: Structured\n");
    writeFileSync(join(docsDir, "doc.md"), "# Title\nsystem_name: Text");

    const collector = new FilesystemCollector(base, {});
    const doc = await collector.findDocument({
      category: "test",
      paths: ["docs/"],
      formats: ["yaml", "md"],
    });

    // Should return the YAML doc, not the markdown one
    expect(doc?.hasField("system_name")).toBe(true);
  });

  it("returns null when no document found", async () => {
    const base = tmpDir();
    const collector = new FilesystemCollector(base, {});
    const doc = await collector.findDocument({
      category: "nonexistent",
      paths: ["docs/nonexistent/"],
      formats: ["yaml"],
    });
    expect(doc).toBeNull();
  });

  it("loads structured JSON file", async () => {
    const base = tmpDir();
    writeFileSync(
      join(base, "risk_register.json"),
      JSON.stringify({ risks: [{ dimension: "health" }] }),
    );

    const collector = new FilesystemCollector(base, {});
    const data = await collector.loadStructured("risk_register");

    expect(data).not.toBeNull();
    expect(Array.isArray(data?.risks)).toBe(true);
  });

  it("parses Markdown with YAML front-matter", async () => {
    const base = tmpDir();
    const docsDir = join(base, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, "readme.md"),
      "---\nsystem_name: My System\nreview_date: '2025-06-01'\n---\n# Body content",
    );

    const collector = new FilesystemCollector(base, {});
    const doc = await collector.findDocument({
      category: "test",
      paths: ["docs/"],
      formats: ["md"],
    });

    expect(doc?.hasField("system_name")).toBe(true);
    expect(doc?.field("system_name").toString()).toBe("My System");
  });
});
