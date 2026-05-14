import type { RuleRegistry } from "../../core/rule.js";
import { rules as article6Rules } from "./article6.js";
import { rules as article9Rules } from "./article9.js";
import { rules as article10Rules } from "./article10.js";
import { rules as article11Rules } from "./article11.js";
import { rules as article13Rules } from "./article13.js";
import { rules as article14Rules } from "./article14.js";
import { rules as article15Rules } from "./article15.js";

export function register(registry: RuleRegistry): void {
  for (const r of [
    ...article6Rules,
    ...article9Rules,
    ...article10Rules,
    ...article11Rules,
    ...article13Rules,
    ...article14Rules,
    ...article15Rules,
  ]) {
    registry.register(r);
  }
}
