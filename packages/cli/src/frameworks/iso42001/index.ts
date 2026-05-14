import type { RuleRegistry } from "../../core/rule.js";
import { rules as clause4Rules } from "./clause4.js";
import { rules as clause5Rules } from "./clause5.js";
import { rules as clause6Rules } from "./clause6.js";
import { rules as clause7Rules } from "./clause7.js";
import { rules as clause8Rules } from "./clause8.js";
import { rules as clause9Rules } from "./clause9.js";
import { rules as clause10Rules } from "./clause10.js";

export function register(registry: RuleRegistry): void {
  for (const r of [
    ...clause4Rules,
    ...clause5Rules,
    ...clause6Rules,
    ...clause7Rules,
    ...clause8Rules,
    ...clause9Rules,
    ...clause10Rules,
  ]) {
    registry.register(r);
  }
}
