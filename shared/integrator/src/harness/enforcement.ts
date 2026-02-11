// src/harness/enforcement.ts

import type { HarnessTraceEntry, HarnessFailure } from "./types.js";

export function enforceCapsulePresence(
  trace: HarnessTraceEntry[]
): HarnessFailure[] {
  const failures: HarnessFailure[] = [];

  for (const entry of trace) {
    if (!entry.capsule) {
      failures.push({
        step_index: entry.step_index,
        step_name: entry.step_name,
        code: "MISSING_CAPSULE",
        message: "flow step did not produce a capsule",
      });
    }
  }

  return failures;
}
