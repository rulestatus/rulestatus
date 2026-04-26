import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { failed, warned } from "../core/result.js";
import type { RunReport } from "../core/result.js";
import type { Reporter } from "./types.js";

export class BadgeReporter implements Reporter {
  async render(report: RunReport, outputPath = "compliance-badge.svg"): Promise<void> {
    const criticalFails = failed(report).filter((r) => r.severity === "critical");
    const anyFail = failed(report).length > 0;

    let label: string;
    let color: string;

    if (criticalFails.length > 0) {
      label = "failing";
      color = "#e05d44";
    } else if (anyFail || warned(report).length > 0) {
      label = "warnings";
      color = "#dfb317";
    } else {
      label = "passing";
      color = "#4c1";
    }

    const svg = buildBadge("rulestatus", label, color);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, svg, "utf-8");
    console.log(`  Badge: ${outputPath}`);
  }
}

function buildBadge(leftText: string, rightText: string, rightColor: string): string {
  const leftW = leftText.length * 6.5 + 12;
  const rightW = rightText.length * 6.5 + 12;
  const totalW = leftW + rightW;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="20" fill="#555"/>
    <rect x="${leftW}" width="${rightW}" height="20" fill="${rightColor}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftW / 2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftW / 2}" y="14">${leftText}</text>
    <text x="${leftW + rightW / 2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${leftW + rightW / 2}" y="14">${rightText}</text>
  </g>
</svg>`;
}
