import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConfig } from "../../src/config/schema.js";
import { loadAttestation } from "../../src/core/attestation.js";
import { Engine } from "../../src/core/engine.js";
import { ManualReviewRequired } from "../../src/core/exceptions.js";
import { RuleRegistry } from "../../src/core/rule.js";
import { CRITICAL } from "../../src/core/severity.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides: Record<string, unknown> = {}) {
  const cfg = defaultConfig();
  return { ...cfg, ...overrides } as ReturnType<typeof defaultConfig>;
}

function writeAttestation(dir: string, ruleId: string, fields: Record<string, string>) {
  const attestDir = join(dir, ".rulestatus", "attestations");
  mkdirSync(attestDir, { recursive: true });
  const content = Object.entries(fields)
    .map(([k, v]) => `${k}: "${v}"`)
    .join("\n");
  writeFileSync(join(attestDir, `${ruleId}.yaml`), content, "utf-8");
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0] as string;
}

// ── loadAttestation ───────────────────────────────────────────────────────────

describe("loadAttestation", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `rulestatus-test-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when no attestation file exists", () => {
    expect(loadAttestation("ASSERT-MISSING", tmp, 365)).toBeNull();
  });

  it("returns null when attestation has TODO values", () => {
    writeAttestation(tmp, "ASSERT-001", {
      attested_by: "TODO: fill me in",
      attested_at: "2026-01-01",
      statement: "done",
    });
    expect(loadAttestation("ASSERT-001", tmp, 365)).toBeNull();
  });

  it("returns null when attested_at is unparseable", () => {
    writeAttestation(tmp, "ASSERT-001", {
      attested_by: "Alice",
      attested_at: "not-a-date",
      statement: "done",
    });
    expect(loadAttestation("ASSERT-001", tmp, 365)).toBeNull();
  });

  it("returns a valid record for a fully filled attestation", () => {
    writeAttestation(tmp, "ASSERT-001", {
      attested_by: "Alice, Head of AI Safety",
      attested_at: "2026-01-01",
      statement: "All oversight mechanisms are in place",
    });
    const result = loadAttestation("ASSERT-001", tmp, 365);
    expect(result).not.toBeNull();
    expect(result?.record.attestedBy).toBe("Alice, Head of AI Safety");
    expect(result?.record.attestedAt).toBe("2026-01-01");
    expect(result?.expired).toBe(false);
  });

  it("marks an old attestation as expired", () => {
    writeAttestation(tmp, "ASSERT-OLD", {
      attested_by: "Alice",
      attested_at: "2020-01-01",
      statement: "Was valid once",
    });
    const result = loadAttestation("ASSERT-OLD", tmp, 365);
    expect(result?.expired).toBe(true);
  });

  it("is not expired when attested today", () => {
    writeAttestation(tmp, "ASSERT-TODAY", {
      attested_by: "Alice",
      attested_at: isoDate(0),
      statement: "Fresh attestation",
    });
    const result = loadAttestation("ASSERT-TODAY", tmp, 365);
    expect(result?.expired).toBe(false);
  });

  it("respects custom expiry days", () => {
    writeAttestation(tmp, "ASSERT-SHORT", {
      attested_by: "Alice",
      attested_at: isoDate(-10),
      statement: "Attested 10 days ago",
    });
    expect(loadAttestation("ASSERT-SHORT", tmp, 365)?.expired).toBe(false);
    expect(loadAttestation("ASSERT-SHORT", tmp, 5)?.expired).toBe(true);
  });
});

// ── Engine ATTESTED behaviour ─────────────────────────────────────────────────

describe("Engine ATTESTED status", () => {
  let tmp: string;
  const origCwd = process.cwd();

  beforeEach(() => {
    tmp = join(tmpdir(), `rulestatus-engine-test-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("upgrades MANUAL to ATTESTED when a valid attestation exists", async () => {
    const registry = new RuleRegistry();
    registry.register({
      id: "TEST-MANUAL-ATTEST",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Manual rule",
      fn: async () => {
        throw new ManualReviewRequired("Human review required");
      },
    });

    writeAttestation(tmp, "TEST-MANUAL-ATTEST", {
      attested_by: "Alice, Compliance Lead",
      attested_at: isoDate(0),
      statement: "Reviewed and confirmed compliant",
    });

    const engine = new Engine(makeConfig(), registry);
    const report = await engine.run({ framework: "test" });
    const result = report.results[0];

    expect(result?.status).toBe("ATTESTED");
    expect(result?.attestedBy).toBe("Alice, Compliance Lead");
    expect(result?.attestedAt).toBe(isoDate(0));
    expect(result?.attestationExpiresAt).toBeDefined();
  });

  it("stays MANUAL when no attestation file exists", async () => {
    const registry = new RuleRegistry();
    registry.register({
      id: "TEST-NO-ATTEST",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Manual rule",
      fn: async () => {
        throw new ManualReviewRequired("Human review required");
      },
    });

    const engine = new Engine(makeConfig(), registry);
    const report = await engine.run({ framework: "test" });

    expect(report.results[0]?.status).toBe("MANUAL");
  });

  it("stays MANUAL and shows expiry message when attestation is expired", async () => {
    const registry = new RuleRegistry();
    registry.register({
      id: "TEST-EXPIRED",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Manual rule",
      fn: async () => {
        throw new ManualReviewRequired("Human review required");
      },
    });

    writeAttestation(tmp, "TEST-EXPIRED", {
      attested_by: "Alice",
      attested_at: "2020-01-01",
      statement: "Old attestation",
    });

    const engine = new Engine(makeConfig(), registry);
    const report = await engine.run({ framework: "test" });
    const result = report.results[0];

    expect(result?.status).toBe("MANUAL");
    expect(result?.message).toContain("expired");
    expect(result?.message).toContain("TEST-EXPIRED");
  });

  it("stays MANUAL when attestation has unfilled TODO values", async () => {
    const registry = new RuleRegistry();
    registry.register({
      id: "TEST-TODO",
      framework: "test",
      article: "1",
      severity: CRITICAL,
      appliesTo: { actor: "provider", riskLevel: "high-risk" },
      title: "Manual rule",
      fn: async () => {
        throw new ManualReviewRequired("Human review required");
      },
    });

    writeAttestation(tmp, "TEST-TODO", {
      attested_by: "TODO: fill in",
      attested_at: isoDate(0),
      statement: "done",
    });

    const engine = new Engine(makeConfig(), registry);
    const report = await engine.run({ framework: "test" });

    expect(report.results[0]?.status).toBe("MANUAL");
  });
});
