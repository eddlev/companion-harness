// shared/integrator/src/harness/harness.ts

import path from "node:path";
import { readJsonFile, resolvePath } from "./io.js";
import { computeCapsuleHashes } from "./hash.js";

import type {
  FlowSpec,
  FlowStep,
  HarnessFailure,
  HarnessResult,
  HarnessTraceEntry,
  Json,
} from "./types.js";

import { CapsuleObserver } from "./observers/capsule_observer.js";
import { ConsentObserver } from "./observers/consent_observer.js";
import { PolicyObserver } from "./observers/policy_observer.js";
import { MemoryObserver } from "./observers/memory_observer.js";

/**
 * HarnessCore
 *
 * Responsibilities:
 * - Load and validate flow spec
 * - Resolve capsule paths relative to the flow file
 * - Build execution trace
 * - Compute deterministic hashes
 * - Run observers
 *
 * NOTE: Enforcement is handled by the Runner (Flow D), not here.
 */
export class HarnessCore {
  private capsuleObserver = new CapsuleObserver();
  private consentObserver = new ConsentObserver();
  private policyObserver = new PolicyObserver();
  private memoryObserver = new MemoryObserver();

  runFlowFromFile(flowSpecPath: string): HarnessResult {
    const started_at = new Date().toISOString();
    const failures: HarnessFailure[] = [];
    const trace: HarnessTraceEntry[] = [];

    // ---- load flow ----
    const flowAbs = path.resolve(flowSpecPath);
    const flowDir = path.dirname(flowAbs);

    const raw = readJsonFile(flowAbs);

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return {
        flow_id: "UNKNOWN",
        ok: false,
        started_at,
        finished_at: new Date().toISOString(),
        failures: [
          {
            step_index: -1,
            step_name: "__flow__",
            code: "INVALID_FLOW",
            message: "Flow spec must be a JSON object",
          },
        ],
        trace: [],
        observers: this.snapshotObservers(),
      };
    }

    const flow = raw as unknown as FlowSpec;

    // ---- execute steps ----
    for (let stepIndex = 0; stepIndex < flow.steps.length; stepIndex++) {
      const step: FlowStep = flow.steps[stepIndex]!;

      const capsuleAbs = resolvePath(flowDir, step.capsule_path);
      const capsuleJson = readJsonFile(capsuleAbs);

      if (typeof capsuleJson !== "object" || capsuleJson === null) {
        failures.push({
          step_index: stepIndex,
          step_name: step.name,
          code: "INVALID_CAPSULE",
          message: "Capsule JSON must be an object",
        });
        continue;
      }

      const capsuleType = (capsuleJson as any).capsule_type;
      
      // 1. Canonicalize
      const canonical_json = JSON.stringify(capsuleJson);
      
      // 2. Hash (Crucial for Authority Binding)
      const hashes = computeCapsuleHashes(canonical_json);

      const entry: HarnessTraceEntry = {
        step_index: stepIndex,
        step_name: step.name,
        capsule: {
          capsule_type: String(capsuleType),
          capsule_path: capsuleAbs,
          canonical_json: canonical_json,
          // 3. Inject Hashes
          hash_hex: hashes.hash_hex,
          capsule_hash: hashes.capsule_hash
        },
      };

      trace.push(entry);

      // ---- observers (Single Entry Contract) ----
      // Fixed: Removed array brackets [] to match observer signatures
      failures.push(...this.capsuleObserver.observe(entry));
      failures.push(...this.consentObserver.observe(entry));
      failures.push(...this.policyObserver.observe(entry));
      failures.push(...this.memoryObserver.observe(entry));
    }

    const finished_at = new Date().toISOString();

    return {
      flow_id: flow.flow_id,
      ok: failures.length === 0,
      started_at,
      finished_at,
      failures,
      trace,
      observers: this.snapshotObservers(),
    };
  }

  private snapshotObservers() {
    return {
      capsule: this.capsuleObserver.snapshot(),
      consent: this.consentObserver.snapshot(),
      policy: this.policyObserver.snapshot(),
      memory: this.memoryObserver.snapshot(),
    };
  }
}