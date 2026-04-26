import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { failed, warned } from "../core/result.js";
import type { RuleResult, RunReport } from "../core/result.js";
import type { Reporter } from "./types.js";

const SARIF_LEVEL: Record<string, string> = {
  critical: "error",
  major: "error",
  minor: "warning",
  info: "note",
};

export class SarifReporter implements Reporter {
  async render(report: RunReport, outputPath = "rulestatus-results.sarif"): Promise<void> {
    const actionable = [...failed(report), ...warned(report)];

    const ruleIds = new Set(actionable.map((r) => r.ruleId));
    const allRules = report.results.filter((r) => ruleIds.has(r.ruleId));

    const sarifRules = [...ruleIds].map((id) => {
      const r = allRules.find((x) => x.ruleId === id)!;
      return {
        id: r.ruleId,
        name: r.title.replace(/\s+/g, ""),
        shortDescription: { text: r.title },
        fullDescription: { text: `EU AI Act, Article ${r.article}: ${r.title}` },
        defaultConfiguration: { level: SARIF_LEVEL[r.severity] ?? "warning" },
        properties: {
          tags: ["compliance", "ai-regulation", `article-${r.article}`, r.framework],
          severity: r.severity,
        },
        helpUri: `https://eur-lex.europa.eu/eli/reg/2024/1689/oj`,
      };
    });

    const sarifResults = actionable.map((r) => ({
      ruleId: r.ruleId,
      level: SARIF_LEVEL[r.severity] ?? "warning",
      message: { text: r.message ?? r.title },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: ".", uriBaseId: "%SRCROOT%" },
          },
        },
      ],
    }));

    const sarif = {
      version: "2.1.0",
      $schema:
        "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "Rulestatus",
              version: "1.0.0",
              informationUri: "https://rulestatus.dev",
              rules: sarifRules,
            },
          },
          results: sarifResults,
          properties: {
            system: report.systemName,
            actor: report.actor,
            riskLevel: report.riskLevel,
          },
        },
      ],
    };

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(sarif, null, 2), "utf-8");
    console.log(`  SARIF report: ${outputPath}`);
  }
}
