const SENSITIVE_KEY =
  /^(password|passwd|secret|token|key|api_key|apikey|apitoken|auth|credential|credentials|private_key|access_key|client_secret|access_token|refresh_token|signing_key)$/i;

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{32,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /ghs_[A-Za-z0-9]{36}/,
  /eyJ[A-Za-z0-9+/]+=*/,
  /postgresql:\/\/[^@\s]+@/,
  /mongodb(\+srv)?:\/\/[^@\s]+@/,
  /mysql:\/\/[^@\s]+@/,
  /redis:\/\/:[^@\s]+@/,
];

export interface RedactResult {
  data: Record<string, unknown>;
  redactedFields: number;
}

export function redactData(obj: Record<string, unknown>): RedactResult {
  let redactedFields = 0;

  function walk(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[REDACTED]";
        redactedFields++;
      } else if (typeof v === "string" && SECRET_PATTERNS.some((p) => p.test(v))) {
        out[k] = "[REDACTED]";
        redactedFields++;
      } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        out[k] = walk(v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  return { data: walk(obj), redactedFields };
}
