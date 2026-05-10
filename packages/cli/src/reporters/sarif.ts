import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RunReport } from "../core/result.js";
import { attested, failed, warned } from "../core/result.js";
import type { Reporter } from "./types.js";

const SARIF_LEVEL: Record<string, string> = {
  critical: "error",
  major: "error",
  minor: "warning",
  info: "note",
};

export class SarifReporter implements Reporter {
  async render(report: RunReport, outputPath = "rulestatus-results.sarif"): Promise<void> {
    // ATTESTED results appear as notes (not warnings/errors) so they don't block PRs
    const actionable = [...failed(report), ...warned(report), ...attested(report)];

    const ruleIds = new Set(actionable.map((r) => r.ruleId));
    const allRules = report.results.filter((r) => ruleIds.has(r.ruleId));

    const sarifRules = [...ruleIds].flatMap((id) => {
      const r = allRules.find((x) => x.ruleId === id);
      if (!r) return [];
      return [
        {
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
        },
      ];
    });

    const sarifResults = actionable.map((r) => ({
      ruleId: r.ruleId,
      level: r.status === "ATTESTED" ? "none" : (SARIF_LEVEL[r.severity] ?? "warning"),
      message: {
        text:
          r.status === "ATTESTED"
            ? `Attested by ${r.attestedBy} on ${r.attestedAt} (expires ${r.attestationExpiresAt})`
            : (r.message ?? r.title),
      },
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
      $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
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
            regulatoryBaselines: Object.entries(report.frameworkBaselines).map(([fw, b]) => ({
              framework: fw,
              citation: b.citation,
              publishedDate: b.publishedDate,
              note: "No implementing acts incorporated.",
            })),
          },
        },
      ],
    };

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(sarif, null, 2), "utf-8");
    console.log(`  SARIF report: ${outputPath}`);
  }
}
