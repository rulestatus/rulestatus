import { anyOf, config, doc } from "../../core/check.js";
import type { RuleMeta } from "../../core/rule.js";
import { MAJOR } from "../../core/severity.js";

const PATHS = ["docs/compliance/", "docs/", "public/"];
const FMTS = ["yaml", "md", "pdf", "docx"] as const;

export const rules: RuleMeta[] = [
  {
    id: "ASSERT-CO-SB24205-1705-001-01",
    framework: "colorado-sb24-205",
    cluster: "human-oversight",
    article: "§6-1-1705",
    severity: MAJOR,
    appliesTo: { actor: "deployer" },
    title: "Consumer data correction mechanism is documented",
    obligation: "OBL-CO-SB24205-1705-001",
    legalText:
      "§6-1-1705(1): Deployer shall provide a consumer with a way to correct personal data that was incorrect and was processed by the AI system in making a consequential decision.",
    remediation:
      "Add `data_correction` or `correction_mechanism` to your consumer-ai-disclosure document or human oversight config.",
    check: anyOf(
      config("human_oversight").requireAny(
        "data_correction",
        "correction_mechanism",
        "dataCorrection",
      ),
      doc("consumer-ai-disclosure")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("data_correction", "correction_process", "correctionMechanism"),
    ),
  },

  {
    id: "ASSERT-CO-SB24205-1705-002-01",
    framework: "colorado-sb24-205",
    cluster: "human-oversight",
    article: "§6-1-1705",
    severity: MAJOR,
    appliesTo: { actor: "deployer" },
    title: "Appeal process with human review option is documented",
    obligation: "OBL-CO-SB24205-1705-002",
    legalText:
      "§6-1-1705(2): When a deployer makes an adverse consequential decision, the deployer shall provide a consumer the opportunity to appeal and request human review, if technically feasible.",
    remediation:
      "Add `appeal_process` and `human_review` fields to your consumer-ai-disclosure document or human oversight config.",
    check: anyOf(
      config("human_oversight").requireAny("appeal_process", "appealProcess", "human_review"),
      doc("consumer-ai-disclosure")
        .inPaths(PATHS)
        .formats([...FMTS])
        .requireAny("appeal_process", "appeal_rights", "appealProcess")
        .requireAny("human_review", "humanReview", "human_review_option"),
    ),
  },
];
