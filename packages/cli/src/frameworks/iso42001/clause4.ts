import { doc } from "../../core/check.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR } from "../../core/severity.js";

const PATHS = ["docs/aims/", "docs/compliance/", "docs/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

rule({
  id: "ASSERT-ISO-42001-004-001-01",
  framework: "iso-42001",
  cluster: "ai-policy-governance",
  article: "4.1",
  severity: CRITICAL,
  appliesTo: { actor: "provider" },
  title: "Organizational context and AIMS scope are documented",
  obligation: "OBL-ISO-42001-004-001",
  legalText:
    "Clause 4.1–4.3: The organization shall determine external and internal issues relevant to its purpose, understand the needs and expectations of interested parties, and document the scope of the AIMS.",
  remediation:
    "Create docs/aims/aims-scope.yaml with: scope, organizational_context, interested_parties fields.",
  check: doc("aims-scope")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("scope", "aims_scope", "system_scope")
    .requireAny("organizational_context", "context"),
});

rule({
  id: "ASSERT-ISO-42001-004-002-01",
  framework: "iso-42001",
  cluster: "transparency-disclosure",
  article: "4.2",
  severity: MAJOR,
  appliesTo: { actor: "provider" },
  title: "Interested parties and their AI-relevant requirements are identified",
  obligation: "OBL-ISO-42001-004-002",
  legalText:
    "Clause 4.2: The organization shall determine the interested parties that are relevant to the AIMS and their relevant requirements.",
  remediation:
    "Add an `interested_parties` field to your aims-scope document listing stakeholders and their requirements.",
  check: doc("aims-scope")
    .inPaths(PATHS)
    .formats([...FMTS])
    .requireAny("interested_parties", "interestedParties", "stakeholders"),
});
