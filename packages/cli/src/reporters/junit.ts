import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RuleResult, RunReport } from "../core/result.js";
import type { Reporter } from "./types.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function testcaseXml(r: RuleResult): string {
  const classname = esc(`${r.framework}.article.${r.article}`);
  const name = esc(r.title);
  const time = (r.durationMs / 1000).toFixed(3);

  const open = `    <testcase name="${name}" classname="${classname}" time="${time}">`;
  const close = "    </testcase>";

  if (r.status === "PASS") {
    return `    <testcase name="${name}" classname="${classname}" time="${time}"/>`;
  }
  if (r.status === "SKIP") {
    return `${open}\n      <skipped/>\n${close}`;
  }
  if (r.status === "MANUAL") {
    const msg = esc(r.message ?? "Manual review required");
    return `${open}\n      <error message="${msg}" type="MANUAL">${msg}</error>\n${close}`;
  }
  // FAIL or WARN
  const msg = esc(r.message ?? r.title);
  const type = r.status === "WARN" ? "WARN" : "FAIL";
  return `${open}\n      <failure message="${msg}" type="${type}">[${r.severity}] ${msg}</failure>\n${close}`;
}

export class JunitReporter implements Reporter {
  async render(report: RunReport, outputPath = "rulestatus-results.xml"): Promise<void> {
    const totalMs = report.finishedAt.getTime() - report.startedAt.getTime();

    // Group results by article
    const suites = new Map<string, RuleResult[]>();
    for (const r of report.results) {
      const key = `${r.framework}.article.${r.article}`;
      const bucket = suites.get(key) ?? [];
      bucket.push(r);
      suites.set(key, bucket);
    }

    const failures = report.results.filter(
      (r) => r.status === "FAIL" || r.status === "WARN",
    ).length;
    const errors = report.results.filter((r) => r.status === "MANUAL").length;
    const skipped = report.results.filter((r) => r.status === "SKIP").length;

    const suiteXmls: string[] = [];
    for (const [suiteName, results] of suites) {
      const sf = results.filter((r) => r.status === "FAIL" || r.status === "WARN").length;
      const se = results.filter((r) => r.status === "MANUAL").length;
      const ss = results.filter((r) => r.status === "SKIP").length;
      const st = results.reduce((acc, r) => acc + r.durationMs, 0);

      const cases = results.map(testcaseXml).join("\n");
      suiteXmls.push(
        `  <testsuite name="${esc(suiteName)}" tests="${results.length}" failures="${sf}" errors="${se}" skipped="${ss}" time="${(st / 1000).toFixed(3)}">\n${cases}\n  </testsuite>`,
      );
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites name="${esc(report.systemName)}" tests="${report.results.length}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="${(totalMs / 1000).toFixed(3)}">`,
      ...suiteXmls,
      "</testsuites>",
    ].join("\n");

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, xml, "utf-8");
    console.log(`  JUnit XML report: ${outputPath}`);
  }
}
