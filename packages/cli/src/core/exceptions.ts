/** Thrown by a rule function to signal a compliance failure. Maps to status FAIL. */
export class ComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplianceError";
  }
}

/** Thrown when a check cannot be automated and requires human review. Maps to status MANUAL. */
export class ManualReviewRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualReviewRequired";
  }
}

/** Thrown when a rule does not apply in the current context. Maps to status SKIP. */
export class SkipTest extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SkipTest";
  }
}

export class RulestatusConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RulestatusConfigError";
  }
}
