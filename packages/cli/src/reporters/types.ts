import type { RunReport } from "../core/result.js";

export interface Reporter {
  render(report: RunReport, outputPath?: string): Promise<void>;
}
