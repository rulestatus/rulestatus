import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import PDFDocument from "pdfkit";
import type { RuleResult, RunReport } from "../core/result.js";
import { failed, manual, passed, skipped, warned } from "../core/result.js";
import type { Reporter } from "./types.js";

const STATUS_COLOR: Record<string, string> = {
  PASS: "#2e7d32",
  FAIL: "#c62828",
  WARN: "#f57f17",
  SKIP: "#757575",
  MANUAL: "#1565c0",
};

export class PdfReporter implements Reporter {
  async render(report: RunReport, outputPath = "compliance-report.pdf"): Promise<void> {
    mkdirSync(dirname(outputPath), { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: true });
      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      // ── Cover page ──────────────────────────────────────────────────────────
      doc
        .fontSize(28)
        .fillColor("#1a237e")
        .text("Rulestatus", { align: "center" })
        .fontSize(14)
        .fillColor("#333")
        .text("Evidence Readiness Report", { align: "center" })
        .moveDown(1)
        .fontSize(11)
        .text(`System: ${report.systemName}`, { align: "center" })
        .text(`Actor: ${report.actor} | Risk Level: ${report.riskLevel}`, { align: "center" })
        .text(`Framework: EU AI Act (2024/1689)`, { align: "center" })
        .text(`Generated: ${new Date().toISOString().split("T")[0]}`, { align: "center" })
        .moveDown(2);

      // Summary box
      const p = passed(report).length;
      const f = failed(report).length;
      const w = warned(report).length;
      const s = skipped(report).length;
      const m = manual(report).length;
      const overallLabel = f > 0 ? "EVIDENCE GAPS FOUND" : "EVIDENCE COMPLETE";
      const statusColor = f > 0 ? "#c62828" : "#2e7d32";

      doc
        .fontSize(16)
        .fillColor(statusColor)
        .text(overallLabel, { align: "center" })
        .moveDown(0.5)
        .fontSize(11)
        .fillColor("#333")
        .text(
          `${p} evidence found  |  ${f} gaps  |  ${w} warnings  |  ${s} skipped  |  ${m} manual`,
          { align: "center" },
        )
        .moveDown(1.5);

      // Disclaimer box
      doc
        .fontSize(8.5)
        .fillColor("#555")
        .rect(50, doc.y, doc.page.width - 100, 52)
        .stroke("#bbb")
        .text(
          "DISCLAIMER: This report documents the results of automated evidence scanning against " +
            "structured assertion specifications derived from the EU AI Act (Regulation (EU) 2024/1689). " +
            "Evidence present in the required format does not constitute a legal determination of compliance. " +
            "For high-risk AI systems, conformity assessment under Article 43 may require evaluation by a notified body. " +
            "This report should be treated as due diligence documentation, not a compliance certificate. " +
            "Consult qualified legal counsel for compliance determinations.",
          { align: "left", width: doc.page.width - 120 },
        )
        .moveDown(2)
        .fillColor("#333");

      // ── Results by article ───────────────────────────────────────────────────
      doc.addPage();
      doc
        .fontSize(16)
        .fillColor("#1a237e")
        .text("Evidence Check Results by Article")
        .moveDown(0.3)
        .fontSize(8)
        .fillColor("#888")
        .text("Evidence present ≠ legally compliant. Not legal advice or a conformity assessment.")
        .fillColor("#333")
        .moveDown(0.5);

      const byArticle = groupByArticle(report.results);
      for (const [article, results] of Object.entries(byArticle).sort(articleSort)) {
        doc
          .fontSize(13)
          .fillColor("#333")
          .text(`Article ${article}`, { underline: true })
          .moveDown(0.3);

        for (const r of results) {
          const color = STATUS_COLOR[r.status] ?? "#333";
          doc
            .fontSize(10)
            .fillColor(color)
            .text(`[${r.status}]`, { continued: true })
            .fillColor("#333")
            .text(`  ${r.ruleId}  —  ${r.title}`);

          if (r.message && (r.status === "FAIL" || r.status === "WARN")) {
            doc
              .fontSize(9)
              .fillColor("#555")
              .text(`     ${r.message.split("\n")[0]}`)
              .fillColor("#333");
          }
          doc.moveDown(0.2);
        }
        doc.moveDown(0.5);
      }

      // ── Evidence gap provenance appendix ────────────────────────────────────
      const failures = failed(report);
      if (failures.length > 0) {
        doc.addPage();
        doc.fontSize(14).fillColor("#1a237e").text("Evidence Gap Provenance").moveDown(0.5);

        for (const r of failures) {
          doc
            .fontSize(11)
            .fillColor("#c62828")
            .text(r.ruleId, { underline: true })
            .fillColor("#333")
            .fontSize(10)
            .text(`Article: ${r.article} | Severity: ${r.severity}`)
            .text(`Title: ${r.title}`)
            .text(`Reason: ${r.message ?? "—"}`)
            .moveDown(0.8);
        }
      }

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log(`  PDF report: ${outputPath}`);
  }
}

function groupByArticle(results: RuleResult[]): Record<string, RuleResult[]> {
  const groups: Record<string, RuleResult[]> = {};
  for (const r of results) {
    const key = r.article.split(".")[0] ?? r.article;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

function articleSort(a: [string, unknown], b: [string, unknown]): number {
  return Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10);
}
