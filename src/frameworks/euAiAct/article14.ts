import { ComplianceError } from "../../core/exceptions.js";
import { rule } from "../../core/rule.js";
import { CRITICAL, MAJOR, MINOR } from "../../core/severity.js";

rule(
  {
    id: "ASSERT-EU-AI-ACT-014-001-01",
    framework: "eu-ai-act",
    article: "14.1",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Human override mechanism exists or is documented",
    obligation: "OBL-EU-AI-ACT-014-001",
    legalText:
      'Article 14(1): "High-risk AI systems shall be designed and developed in such a way, including with appropriate human-machine interface tools, that they can be effectively overseen by natural persons during the period in which the AI system is in use."',
    remediation:
      "Document the human override mechanism in config/human_oversight.yaml or an oversight doc. " +
      "Alternatively, expose a /api/override endpoint.",
  },
  async (system) => {
    // Try API probe for override endpoint
    if (system.hasApi()) {
      const res = await system.evidence.probeApi("/api/override");
      if (res && res.statusCode !== 404) return;
    }

    // Try config
    const config = await system.evidence.loadConfig("human_oversight");
    if (config) {
      const override = config.override as Record<string, unknown> | undefined;
      if (override?.enabled === true) return;
      if (config.override_mechanism || config.overrideMechanism) return;
    }

    // Try documentation
    const doc = await system.evidence.findDocument({
      category: "human-oversight",
      paths: ["docs/compliance/", "docs/", "compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (doc?.hasField("override_mechanism") || doc?.hasField("human_override")) return;

    throw new ComplianceError(
      "No human override mechanism found. " +
        "Create config/human_oversight.yaml with `override.enabled: true` or document the mechanism in an oversight doc.",
    );
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-014-002-01",
    framework: "eu-ai-act",
    article: "14.2",
    severity: CRITICAL,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Human oversight measures are specified in technical documentation",
    obligation: "OBL-EU-AI-ACT-014-002",
    legalText:
      "Article 14(2): oversight measures must be built into the system or identified for implementation by the deployer.",
    remediation:
      "Add a `human_oversight_measures` field to your technical documentation describing how human oversight is implemented.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError("No technical documentation found.");
    }
    if (
      !doc.hasField("human_oversight_measures") &&
      !doc.hasField("humanOversightMeasures") &&
      !doc.hasField("human_oversight")
    ) {
      throw new ComplianceError("Technical documentation missing: human_oversight_measures field.");
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-014-003-01",
    framework: "eu-ai-act",
    article: "14.3",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Explainability output is available to oversight personnel",
    obligation: "OBL-EU-AI-ACT-014-003",
    legalText:
      "Article 14(4)(c): oversight persons must be able to interpret the AI system's output.",
    remediation:
      "Enable explainability in config/explainability.yaml or expose a /api/explain endpoint.",
  },
  async (system) => {
    if (system.hasApi()) {
      const res = await system.evidence.probeApi("/api/explain");
      if (res?.ok) return;
    }

    const config = await system.evidence.loadConfig("explainability");
    if (config?.enabled === true) return;

    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (doc?.hasField("explainability") || doc?.hasField("interpretability")) return;

    throw new ComplianceError(
      "No explainability mechanism found. " +
        "Add `enabled: true` to config/explainability.yaml or expose a /api/explain endpoint.",
    );
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-014-004-01",
    framework: "eu-ai-act",
    article: "14.4",
    severity: MAJOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "System can be paused or stopped by human operator",
    obligation: "OBL-EU-AI-ACT-014-004",
    legalText:
      "Article 14(4)(e): oversight persons must be able to decide not to use the AI system or to override, ignore, or reverse its output.",
    remediation:
      "Add `pause_capability: true` to config/human_oversight.yaml or document the stop/pause mechanism.",
  },
  async (system) => {
    const config = await system.evidence.loadConfig("human_oversight");
    if (config?.pause_capability === true || config?.pauseCapability === true) return;
    if (config?.stop_mechanism || config?.stopMechanism) return;

    const doc = await system.evidence.findDocument({
      category: "human-oversight",
      paths: ["docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (doc?.hasField("pause_capability") || doc?.hasField("stop_mechanism")) return;

    throw new ComplianceError(
      "No pause/stop capability documented. " +
        "Add `pause_capability: true` to config/human_oversight.yaml.",
    );
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-014-005-01",
    framework: "eu-ai-act",
    article: "14.5",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Human oversight training materials exist",
    obligation: "OBL-EU-AI-ACT-014-005",
    legalText:
      "Article 14(3): oversight persons must have the competence, training and authority to oversee the AI system.",
    remediation: "Create oversight training materials in docs/training/ or docs/oversight/.",
  },
  async (system) => {
    const doc = await system.evidence.findDocument({
      category: "training-materials",
      paths: ["docs/training/", "docs/oversight/", "docs/compliance/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (!doc) {
      throw new ComplianceError(
        "No human oversight training materials found. Create docs/training/ or docs/oversight/ documentation.",
      );
    }
  },
);

rule(
  {
    id: "ASSERT-EU-AI-ACT-014-006-01",
    framework: "eu-ai-act",
    article: "14.6",
    severity: MINOR,
    appliesTo: { actor: "provider", riskLevel: "high-risk" },
    title: "Audit logs are accessible to oversight personnel",
    obligation: "OBL-EU-AI-ACT-014-006",
    legalText:
      "Article 12: high-risk AI systems shall have logging capabilities for monitoring purposes.",
    remediation:
      "Enable audit logging in config/logging.yaml with `audit_log.enabled: true` or document the logging approach.",
  },
  async (system) => {
    const loggingConfig = await system.evidence.loadConfig("logging");
    if (loggingConfig) {
      const auditLog = loggingConfig.audit_log ?? loggingConfig.auditLog;
      if (
        auditLog &&
        typeof auditLog === "object" &&
        (auditLog as Record<string, unknown>).enabled === true
      ) {
        return;
      }
    }

    const doc = await system.evidence.findDocument({
      category: "technical-documentation",
      paths: ["docs/technical/", "docs/compliance/", "docs/"],
      formats: ["yaml", "md", "pdf", "docx"],
    });
    if (doc?.hasField("audit_logging") || doc?.hasField("monitoring")) return;

    throw new ComplianceError(
      "No audit logging configuration found. " +
        "Add `audit_log.enabled: true` to config/logging.yaml.",
    );
  },
);
