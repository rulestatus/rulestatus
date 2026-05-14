import type { RuleRegistry } from "../../core/rule.js";
import { rules as governRules } from "./govern.js";
import { rules as manageRules } from "./manage.js";
import { rules as mapRules } from "./map.js";
import { rules as measureRules } from "./measure.js";

export function register(registry: RuleRegistry): void {
  for (const r of [...governRules, ...mapRules, ...measureRules, ...manageRules]) {
    registry.register(r);
  }
}
