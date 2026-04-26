export const CRITICAL = "critical" as const;
export const MAJOR = "major" as const;
export const MINOR = "minor" as const;
export const INFO = "info" as const;

export type SeverityLevel = typeof CRITICAL | typeof MAJOR | typeof MINOR | typeof INFO;

const ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
};

/** Returns negative if `a` is more severe than `b`, positive if less severe, 0 if equal. */
export function compareSeverity(a: SeverityLevel, b: SeverityLevel): number {
  return ORDER[a] - ORDER[b];
}

/** Returns true if `level` is at least as severe as `threshold`. */
export function atLeast(level: SeverityLevel, threshold: SeverityLevel): boolean {
  return compareSeverity(level, threshold) <= 0;
}

export const ALL_SEVERITIES: SeverityLevel[] = [CRITICAL, MAJOR, MINOR, INFO];
