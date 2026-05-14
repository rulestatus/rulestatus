import type { RuleRegistry } from "../../core/rule.js";
import { rules as section1702Rules } from "./section1702.js";
import { rules as section1703Rules } from "./section1703.js";
import { rules as section1704Rules } from "./section1704.js";
import { rules as section1705Rules } from "./section1705.js";

export function register(registry: RuleRegistry): void {
  for (const r of [
    ...section1702Rules,
    ...section1703Rules,
    ...section1704Rules,
    ...section1705Rules,
  ]) {
    registry.register(r);
  }
}
