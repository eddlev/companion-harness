// shared/integrator/src/harness/runner.ts

import path from "node:path";
import { HarnessCore } from "./harness.js";
import { readJsonFile, resolvePath } from "./io.js";
import type { ExecutionAdapter } from "./adapter/types.js";
import type {
  FlowSpec,
  HarnessResult,
  Json,
  HarnessFailure,
  FlowStepEnforced,
} from "./types.js";
import { enforceStep } from "./enforcement.js";

export class HarnessRunner {
  private core: HarnessCore;
  private adapter: ExecutionAdapter;

  constructor(adapter: ExecutionAdapter) {
    this.core = new HarnessCore();
    this.adapter = adapter;
  }

  async runFlow(flowSpecPath: string): Promise<HarnessResult> {
    const flowAbsPath = path.resolve(process.cwd(), flowSpecPath);
    const flowDir = path.dirname(flowAbsPath);

    // 1. Run core validation + observation
    const coreResult = this.core.runFlowFromFile(flowAbsPath);
    if (!coreResult.ok) return coreResult;

    const flow = this.loadFlow(flowAbsPath);
    const finalFailures: HarnessFailure[] = [];

    // 2. Dispatch and Enforce Loop
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i] as FlowStepEnforced;
      const capsuleAbsPath = resolvePath(flowDir, step.capsule_path);
      const capsuleJson = readJsonFile(capsuleAbsPath) as Json;

      // Dispatch to adapter
      await this.adapter.dispatch(capsuleJson, {
        flow_id: flow.flow_id,
        step_index: i,
      });

      // Semantic Enforcement
      const traceEntry = coreResult.trace[i];
      if (!traceEntry) throw new Error(`Missing trace entry at ${i}`);

      const enforcement = enforceStep(i, step.name, traceEntry, coreResult.observers);
      const hasViolations = enforcement.violations.length > 0;

      if (hasViolations) {
        if (!step.expect_failure) {
          // Unexpected failure: Add to results
          finalFailures.push(...enforcement.violations);
        }
        // If expected, we swallow the violation as a "success"
      } else if (step.expect_failure) {
        // No violation but one was expected: Regression failure
        finalFailures.push({
          step_index: i,
          step_name: step.name,
          code: "EXPECTED_FAILURE_NOT_TRIGGERED",
          message: step.failure_reason ?? "Expected failure did not occur",
        });
      }
    }

    return {
      ...coreResult,
      ok: finalFailures.length === 0,
      failures: finalFailures,
    };
  }

  private loadFlow(absPath: string): FlowSpec {
    const raw = readJsonFile(absPath);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`Invalid JSON: ${absPath}`);
    }
    return raw as unknown as FlowSpec;
  }
}