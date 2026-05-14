import { anyOf, config, doc } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/policy/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-ISO-42001-005-001-01",
    framework: "iso-42001",
    cluster: "ai-policy-governance",
    article: "5.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider" },
    title: "AI policy exists and includes required commitments",
    obligation: "OBL-ISO-42001-005-001",
    legalText:
      "Clause 5.2: Top management shall establish an AI policy that includes a commitment to satisfy applicable requirements and to continual improvement of the AIMS.",
    remediation:
      "Create docs/aims/ai-policy.yaml with: purpose, scope, commitments, approved_by, effective_date.",
    check: anyOf(
      config("ai_policy").requireAny("purpose", "scope").requireAny("commitments", "commitment"),
      doc("ai-policy")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("purpose", "scope")
        .requireAny("commitments", "commitment"),
    ),
  },

  {
    id: "ASSERT-ISO-42001-005-001-02",
    framework: "iso-42001",
    cluster: "ai-policy-governance",
    article: "5.2",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "AI policy is approved by top management",
    obligation: "OBL-ISO-42001-005-001",
    legalText:
      "Clause 5.2: The AI policy shall be available as documented information and be communicated within the organization.",
    remediation: "Add `approved_by` and `effective_date` fields to your AI policy document.",
    check: anyOf(
      config("ai_policy")
        .requireAny("approved_by", "approvedBy")
        .requireAny("effective_date", "effectiveDate"),
      doc("ai-policy")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("approved_by", "approvedBy")
        .requireAny("effective_date", "effectiveDate"),
    ),
  },

  {
    id: "ASSERT-ISO-42001-005-002-01",
    framework: "iso-42001",
    cluster: "roles-responsibilities",
    article: "5.3",
    severity: MAJOR,
    appliesTo: { actor: "provider" },
    title: "Roles and responsibilities for AI management are assigned",
    obligation: "OBL-ISO-42001-005-002",
    legalText:
      "Clause 5.3: Top management shall assign responsibility and authority for ensuring the AIMS conforms to the requirements of ISO/IEC 42001.",
    remediation:
      "Create docs/aims/aims-roles.yaml with: roles, responsibilities, and accountable_person fields.",
    check: doc("aims-roles")
      .inPaths(PATHS)
      .formats([...FMTS])
      .requireAny("roles", "responsibilities")
      .requireAny("accountable_person", "accountablePerson", "ai_owner", "responsible_person"),
  },
];
