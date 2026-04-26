import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

rule(
  {
    id: "ASSERT-EU-AI-ACT-013-001-01",
    framework: "eu-ai-act",
    article: "13.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "AI system discloses that output is AI-generated",
    obligation: "OBL-EU-AI-ACT-013-001",
    legalText:
      'Article 13(1): "High-risk AI systems shall be designed and developed in such a way to ensure that their operation is sufficiently transparent to enable deployers to understand the system\'s output and use it appropriately."',
    remediation:
      "Enable AI disclosure in config/transparency.yaml with `ai_disclosure.enabled: true`. " +
      "Alternatively, ensure your API returns an X-AI-Disclosure header or an ai_disclosure field in the response body.",
  },
  async (system) => {
    // Try config first
    const config = await system.evidence.loadConfig("transparency");
    if (config) {
      const disclosure = (config.ai_disclosure ?? config.aiDisclosure) as
        | Record<string, unknown>
        | undefined;
      if (disclosure?.enabled === true) return;
      throw new ComplianceError(
        "AI disclosure is disabled in transparency config. Set `ai_disclosure.enabled: true`.",
      );
    }

    // Try API probe
    if (system.hasApi()) {
      const res = await system.evidence.probeApi("/api/health");
      if (res) {
        const hasHeader = "x-ai-disclosure" in res.headers || "x-ai-generated" in res.headers;
        const body = await res.body();
        const hasBodyField =
          body &&
          typeof body === "object" &&
          ("ai_disclosure" in (body as object) || "aiDisclosure" in (body as object));
        if (hasHeader || hasBodyField) return;
        throw new ComplianceError(
          "API endpoint missing AI disclosure. " +
            "Add X-AI-Disclosure header or ai_disclosure field in the response body.",
        );
      }
    }

    // Fall back to manual review
    system.evidence.requireManual(
      "Cannot verify AI disclosure automatically. " +
        "Provide a screenshot or documentation proving AI disclosure is shown to users.",
    );
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-013-002-01",
    framework: "eu-ai-act",
    article: "13.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Instructions for use documentation exists",
    obligation: "OBL-EU-AI-ACT-013-002",
    legalText:
      'Article 13(2): "High-risk AI systems shall be accompanied by instructions for use in an appropriate digital or other format."',
    remediation:
      "Create an instructions-for-use document in docs/compliance/ or docs/. " +
      "It must describe the intended purpose, limitations, and contact details.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "instructions-for-use",
      paths: ["docs/compliance/", "docs/", "compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No instructions for use found. Create docs/compliance/instructions-for-use.md.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-013-002-02",
    framework: "eu-ai-act",
    article: "13.2",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Instructions for use include intended purpose and known limitations",
    obligation: "OBL-EU-AI-ACT-013-002",
    legalText:
      "Article 13(3)(b): instructions must specify the intended purpose and any foreseeable misuse, and known limitations.",
    remediation:
      "Add `intended_purpose` and `known_limitations` fields to your instructions-for-use document.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "instructions-for-use",
      paths: ["docs/compliance/", "docs/", "compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No instructions for use found.");
    }
    if (!doc.hasField("intended_purpose") && !doc.hasField("intendedPurpose")) {
      throw new ComplianceError("Instructions for use missing: intended_purpose field.");
    }
    if (
      !doc.hasField("known_limitations") &&
      !doc.hasField("knownLimitations") &&
      !doc.hasField("limitations")
    ) {
      throw new ComplianceError("Instructions for use missing: known_limitations field.");
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-013-002-03",
    framework: "eu-ai-act",
    article: "13.2",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Instructions for use include performance characteristics",
    obligation: "OBL-EU-AI-ACT-013-002",
    legalText:
      "Article 13(3)(b)(iv): instructions must specify the level of accuracy, robustness and cybersecurity.",
    remediation:
      "Add `performance_metrics` or `accuracy` field to your instructions-for-use document.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "instructions-for-use",
      paths: ["docs/compliance/", "docs/", "compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No instructions for use found.");
    }
    if (
      !doc.hasField("performance_metrics") &&
      !doc.hasField("accuracy") &&
      !doc.hasField("performanceMetrics")
    ) {
      throw new ComplianceError(
        "Instructions for use missing: performance characteristics (accuracy/performance_metrics).",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-013-003-01",
    framework: "eu-ai-act",
    article: "13.3",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "System capabilities and limitations are disclosed to deployers",
    obligation: "OBL-EU-AI-ACT-013-003",
    legalText:
      "Article 13(3)(b): instructions must include the capabilities and limitations of the system.",
    remediation:
      "Add a `limitations` field to your instructions for use or technical documentation.",
  },
  async (system) => {
    const techDoc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (techDoc?.hasField("limitations") || techDoc?.hasField("capabilities")) return;

    const doc = await system.evidence.findDocument({
      category: "instructions-for-use",
      paths: ["docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc?.hasField("limitations") && !doc?.hasField("capabilities")) {
      throw new ComplianceError(
        "System limitations not disclosed. Add `limitations` field to instructions for use or technical documentation.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-013-004-01",
    framework: "eu-ai-act",
    article: "13.4",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Provider contact information is documented",
    obligation: "OBL-EU-AI-ACT-013-004",
    legalText:
      "Article 13(3)(a): instructions for use must include the name and registered address of the provider.",
    remediation: "Add `provider_contact` to your instructions for use or system config.",
  },
  async (system) => {
    const config = await system.evidence.loadConfig("system");
    if (config?.provider_contact || config?.providerContact) return;

    const doc = await system.evidence.findDocument({
      category: "instructions-for-use",
      paths: ["docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (
      !doc?.hasField("provider_contact") &&
      !doc?.hasField("providerContact") &&
      !doc?.hasField("provider")
    ) {
      throw new ComplianceError(
        "Provider contact information not found. Add `provider_contact` to instructions for use or system config.",
      );
    }
  },
);
