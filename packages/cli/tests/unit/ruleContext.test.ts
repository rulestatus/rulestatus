import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ManualReviewRequired } from "../../src/core/exceptions.js";
import { RuleExecutionContext } from "../../src/core/ruleContext.js";
import { EvidenceRegistry } from "../../src/evidence/registry.js";

function tmpDir(): string {
  const dir = join(tmpdir(), `rulestatus-ctx-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("RuleExecutionContext", () => {
  let base: string;

  beforeEach(() => {
    base = tmpDir();
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  // ── confidence ──────────────────────────────────────────────────────────────

  it("defaults confidence to 'strong'", () => {
    const ctx = new RuleExecutionContext(new EvidenceRegistry({}, base));
    expect(ctx.getConfidence()).toBe("strong");
  });

  it("setConfidence changes getConfidence", () => {
    const ctx = new RuleExecutionContext(new EvidenceRegistry({}, base));
    ctx.setConfidence("weak");
    expect(ctx.getConfidence()).toBe("weak");
  });

  it("two contexts wrapping same registry have independent confidence", () => {
    const registry = new EvidenceRegistry({}, base);
    const ctx1 = new RuleExecutionContext(registry);
    const ctx2 = new RuleExecutionContext(registry);

    ctx1.setConfidence("weak");

    expect(ctx1.getConfidence()).toBe("weak");
    expect(ctx2.getConfidence()).toBe("strong");
  });

  // ── source path isolation ────────────────────────────────────────────────────

  it("snapshotSources returns empty when nothing was loaded", () => {
    const ctx = new RuleExecutionContext(new EvidenceRegistry({}, base));
    expect(ctx.snapshotSources()).toHaveLength(0);
  });

  it("snapshotSources includes source for loaded structured doc", async () => {
    writeFileSync(join(base, "data.yaml"), "name: test\nvalue: 42");
    const registry = new EvidenceRegistry({ data: join(base, "data.yaml") }, base);
    const ctx = new RuleExecutionContext(registry);

    await ctx.loadStructured("data");
    const sources = ctx.snapshotSources();

    expect(sources).toHaveLength(1);
    expect(sources[0]?.filePath).toContain("data.yaml");
  });

  it("two contexts wrapping same registry have isolated source paths", async () => {
    mkdirSync(join(base, "docs"), { recursive: true });
    writeFileSync(join(base, "docs", "alpha.yaml"), "name: alpha");
    writeFileSync(join(base, "docs", "beta.yaml"), "name: beta");

    const registry = new EvidenceRegistry(
      {
        alpha: join(base, "docs", "alpha.yaml"),
        beta: join(base, "docs", "beta.yaml"),
      },
      base,
    );

    const ctx1 = new RuleExecutionContext(registry);
    const ctx2 = new RuleExecutionContext(registry);

    await ctx1.loadStructured("alpha");
    await ctx2.loadStructured("beta");

    const sources1 = ctx1.snapshotSources();
    const sources2 = ctx2.snapshotSources();

    expect(sources1).toHaveLength(1);
    expect(sources1[0]?.filePath).toContain("alpha.yaml");

    expect(sources2).toHaveLength(1);
    expect(sources2[0]?.filePath).toContain("beta.yaml");
  });

  it("snapshotSources deduplicates paths when same file loaded multiple times", async () => {
    writeFileSync(join(base, "info.yaml"), "name: test");
    const registry = new EvidenceRegistry({ info: join(base, "info.yaml") }, base);
    const ctx = new RuleExecutionContext(registry);

    await ctx.loadStructured("info");
    await ctx.loadStructured("info"); // cache hit — same path pushed again
    const sources = ctx.snapshotSources();

    expect(sources).toHaveLength(1);
  });

  // ── findDocument path tracking ───────────────────────────────────────────────

  it("snapshotSources includes source for findDocument result", async () => {
    const docsDir = join(base, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "risk-management.yaml"), "name: rm\nreview_date: '2025-01-01'");

    const registry = new EvidenceRegistry({}, base);
    const ctx = new RuleExecutionContext(registry);

    await ctx.findDocument({ category: "risk-management", paths: ["docs/"], formats: ["yaml"] });
    const sources = ctx.snapshotSources();

    expect(sources).toHaveLength(1);
    expect(sources[0]?.filePath).toContain("risk-management.yaml");
  });

  it("findDocument returns null → no source recorded", async () => {
    const ctx = new RuleExecutionContext(new EvidenceRegistry({}, base));
    await ctx.findDocument({ category: "missing", paths: ["nowhere/"], formats: ["yaml"] });
    expect(ctx.snapshotSources()).toHaveLength(0);
  });

  // ── requireManual ────────────────────────────────────────────────────────────

  it("requireManual throws ManualReviewRequired", () => {
    const ctx = new RuleExecutionContext(new EvidenceRegistry({}, base));
    expect(() => ctx.requireManual("human needed")).toThrow(ManualReviewRequired);
  });

  // ── hasApi ───────────────────────────────────────────────────────────────────

  it("hasApi returns false when no api_base_url configured", () => {
    const ctx = new RuleExecutionContext(new EvidenceRegistry({}, base));
    expect(ctx.hasApi()).toBe(false);
  });

  it("hasApi returns true when api_base_url configured", () => {
    const ctx = new RuleExecutionContext(
      new EvidenceRegistry({ api_base_url: "https://api.example.com" }, base),
    );
    expect(ctx.hasApi()).toBe(true);
  });
});
