// shared/integrator/src/harness/enforcement.ts

import type { HarnessTraceEntry, ObserversSnapshot } from "./types.js";

export type EnforcementViolation = {
  step_index: number;
  step_name: string;
  code: string;
  message: string;
};

export type EnforcementResult = {
  violations: EnforcementViolation[];
};

/**
 * Enforces semantic expectations for a single step.
 */
export function enforceStep(
  stepIndex: number,
  stepName: string,
  traceEntry: HarnessTraceEntry,
  observers: ObserversSnapshot
): EnforcementResult {
  const violations: EnforcementViolation[] = [];
  const capsule = traceEntry.capsule;

  if (!capsule || !capsule.canonical_json) return { violations };

  let payload: any;
  try {
    payload = JSON.parse(capsule.canonical_json);
  } catch {
    return { violations };
  }

  const type = capsule.capsule_type;

  // ---- FLOW C: MEMORY GOVERNANCE RULES ----
  if (type === "MEMORY_COMMIT") {
    const commitBody = payload.commit;
    const consentRef = commitBody?.consent_reference;

    // Rule C1: Memory Commit must reference a consent capsule
    if (!consentRef) {
      violations.push({
        step_index: stepIndex,
        step_name: stepName,
        code: "MISSING_CONSENT",
        message: "memory commit requires active consent",
      });
    } else {
      // Rule C2: Referenced consent must be active in ConsentObserver
      const scopes = observers.consent.active_scopes[consentRef];

      if (!scopes) {
        violations.push({
          step_index: stepIndex,
          step_name: stepName,
          code: "INVALID_CONSENT",
          message: "referenced consent is not active",
        });
      } else {
        // Rule C3: Consent must explicitly grant 'memory_commit' scope
        if (!scopes.includes("memory_commit")) {
          violations.push({
            step_index: stepIndex,
            step_name: stepName,
            code: "SCOPE_VIOLATION",
            message: "active consent does not grant memory_commit scope",
          });
        }
      }
    }
  }

  return { violations };
}