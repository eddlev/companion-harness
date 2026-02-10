// shared/integrator/src/harness/runner.ts

import path from "node:path";
import { HarnessCore } from "./harness.js";
import { readJsonFile, resolvePath } from "./io.js";
import type { ExecutionAdapter } from "./adapter/types.js";
import type {
  FlowSpec,
  HarnessResult,
  Json,
} from "./types.js";

/**
 * HarnessRunner orchestrates execution of a flow through an adapter.
 *
 * - HarnessCore remains authoritative for structure, hashing, observers.
 * - Runner is responsible only for dispatching capsules to the adapter.
 */
export class HarnessRunner {
  private core: HarnessCore;
  private adapter: ExecutionAdapter;

  constructor(adapter: ExecutionAdapter) {
    this.core = new HarnessCore();
    this.adapter = adapter;
  }

  /**
   * Execute a flow spec file using the configured adapter.
   *
   * This method:
   * - loads the flow
   * - dispatches each capsule to the adapter in order
   * - allows HarnessCore to perform structural validation & observation
   *
   * @param flowSpecPath path to flow spec JSON
   */
  async runFlow(flowSpecPath: string): Promise<HarnessResult> {
    // First run the core logic to validate structure and build trace
    const coreResult = this.core.runFlowFromFile(flowSpecPath);

    // If structural validation already failed, do not dispatch
    if (!coreResult.ok) {
      return coreResult;
    }

    // Load flow spec again for execution context
    const flowAbs = path.resolve(flowSpecPath);
    const flowDir = path.dirname(flowAbs);
    const flow = this.loadFlow(flowAbs);

    // Dispatch capsules in order
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i]!;
      const capsuleAbs = resolvePath(flowDir, step.capsule_path);
      const capsule = readJsonFile(capsuleAbs);

      await this.adapter.dispatch(capsule, {
        flow_id: flow.flow_id,
        step_index: i,
      });
    }

    return coreResult;
  }

  private loadFlow(absPath: string): FlowSpec {
    const raw = readJsonFile(absPath);

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`Flow spec must be a JSON object: ${absPath}`);
    }

    return raw as unknown as FlowSpec;
  }
}
