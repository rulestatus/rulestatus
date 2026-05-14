import { describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleExecutionContext } from "../../src/core/ruleContext.js";
import { EvidenceRegistry } from "../../src/evidence/registry.js";

function tmpDir(): string {
  const dir = join(tmpdir(), `rulestatus-redact-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("EvidenceRegistry redaction", () => {
  it("redacts secret keys from loadStructured result", async () => {
    const base = tmpDir();
    writeFileSync(
      join(base, "config.yaml"),
      "name: My System\napi_key: sk-abc123def456ghi789jkl012mno345pqr678\ndescription: test",
    );

    const registry = new EvidenceRegistry({ config: join(base, "config.yaml") }, base);
    const data = await registry.loadStructured("config");

    expect(data).not.toBeNull();
    expect(data?.name).toBe("My System");
    expect(data?.api_key).toBe("[REDACTED]");
    expect(data?.description).toBe("test");
  });

  it("redacts secret key patterns from loadStructured result (the regression fix)", async () => {
    const base = tmpDir();
    // This is the exact scenario that was broken: redactData was called but its
    // output discarded — the unredacted meta.data was stored in the cache instead.
    writeFileSync(
      join(base, "settings.yaml"),
      "system: prod\npassword: hunter2\nendpoint: https://api.example.com",
    );

    const registry = new EvidenceRegistry({ settings: join(base, "settings.yaml") }, base);
    const data = await registry.loadStructured("settings");

    expect(data?.password).toBe("[REDACTED]");
    expect(data?.system).toBe("prod");
    expect(data?.endpoint).toBe("https://api.example.com");
  });

  it("redacts secret patterns in string values from loadStructured", async () => {
    const base = tmpDir();
    writeFileSync(
      join(base, "creds.yaml"),
      "db_url: 'postgresql://admin:supersecret@db.host:5432/mydb'\nname: test-system",
    );

    const registry = new EvidenceRegistry({ creds: join(base, "creds.yaml") }, base);
    const data = await registry.loadStructured("creds");

    expect(data?.db_url).toBe("[REDACTED]");
    expect(data?.name).toBe("test-system");
  });

  it("redacts secret keys from findDocument (DictDocument)", async () => {
    const base = tmpDir();
    const docsDir = join(base, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, "model-card.yaml"),
      "model_name: MyModel\napi_key: ghp_abc123def456ghi789jkl012mno345pqr6\ndescription: A model",
    );

    const registry = new EvidenceRegistry({}, base);
    const doc = await registry.findDocument({
      category: "model-card",
      paths: ["docs/"],
      formats: ["yaml"],
    });

    expect(doc).not.toBeNull();
    expect(doc?.hasField("model_name")).toBe(true);
    expect(doc?.field("api_key").toString()).toBe("[REDACTED]");
  });

  it("redacts connection strings from findDocument (TextDocument)", async () => {
    const base = tmpDir();
    const docsDir = join(base, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, "readme.md"),
      "# Setup\n\nConnect via mongodb://admin:secret@db.host:27017/mydb\n\nSee docs for details.",
    );

    const registry = new EvidenceRegistry({}, base);
    const doc = await registry.findDocument({
      category: "readme",
      paths: ["docs/"],
      formats: ["md"],
    });

    expect(doc).not.toBeNull();
    // The raw text in a TextDocument should have secrets scrubbed
    expect(doc?.field("Connect via").toString()).not.toContain("admin:secret");
  });

  it("returns correct redactedFields count via snapshotSources", async () => {
    const base = tmpDir();
    writeFileSync(
      join(base, "secrets.yaml"),
      "token: sk-abc123def456ghi789jkl012mno345pqr678\nsecret: mysecret\nname: system",
    );

    const registry = new EvidenceRegistry({ secrets: join(base, "secrets.yaml") }, base);
    const ctx = new RuleExecutionContext(registry);
    await ctx.loadStructured("secrets");
    const sources = ctx.snapshotSources();

    expect(sources).toHaveLength(1);
    expect(sources[0]?.redactedFields).toBeGreaterThan(0);
  });
});
