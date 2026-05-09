import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

export interface AttestationRecord {
  assertionId: string;
  attestedBy: string;
  attestedAt: string;
  statement: string;
  evidenceRef?: string | undefined;
}

export interface AttestationResult {
  record: AttestationRecord;
  expiresAt: Date;
  expired: boolean;
}

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !value.startsWith("TODO");
}

export function loadAttestation(
  ruleId: string,
  basePath: string,
  expiryDays: number,
): AttestationResult | null {
  const attestPath = join(basePath, ".rulestatus", "attestations", `${ruleId}.yaml`);
  if (!existsSync(attestPath)) return null;

  let raw: unknown;
  try {
    raw = yaml.load(readFileSync(attestPath, "utf-8"));
  } catch {
    return null;
  }

  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (!isFilled(obj.attested_by) || !isFilled(obj.attested_at) || !isFilled(obj.statement)) {
    return null;
  }

  const attestedAt = new Date(obj.attested_at as string);
  if (Number.isNaN(attestedAt.getTime())) return null;

  const expiresAt = new Date(attestedAt);
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  const expired = new Date() > expiresAt;

  return {
    record: {
      assertionId: ruleId,
      attestedBy: obj.attested_by as string,
      attestedAt: obj.attested_at as string,
      statement: obj.statement as string,
      evidenceRef: isFilled(obj.evidence_ref) ? (obj.evidence_ref as string) : undefined,
    },
    expiresAt,
    expired,
  };
}
