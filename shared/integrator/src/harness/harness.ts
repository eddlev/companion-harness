// shared/integrator/src/harness/harness.ts

import path from "node:path";
import { binlingAdapter, toCapsuleHash } from "../binling_adapter/index.js";
import { extractCapsuleType } from "./extract.js";
import { readJsonFile, resolvePath } from "./io.js";
import { CapsuleObserver } from "./observers/capsule_observer.js";
import { ConsentObserver } from "./observers/consent_observer.js";
import { PolicyObserver } from "./observers/policy_observer.js";
import { MemoryObserver } from "./observers/memory_observer.js";

import type {
  FlowSpec,
  HarnessFailure,
  HarnessResult,
  HarnessTraceEntry,
  Json,
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function assertFlowSpec(x: Json, flowPath: string): FlowSpec {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    throw new Error(`Flow spec must be a JSON object: ${flowPath}`);
  }

  const flow_id = (x as any).flow_id;
  const steps = (x as any).steps;

  if (typeof flow_id !== "string" || !flow_id.trim()) {
    throw new Error(`Flow spec missing required string "flow_id": ${flowPath}`);
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Flow spec missing non-empty array "steps": ${flowPath}`);
  }

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (typeof s !== "object" || s === null || Array.isArray(s)) {
      throw new Error(`Flow step ${i} must be an object: ${flowPath}`);
    }
    if (typeof s.name !== "string" || !s.name.trim()) {
      throw new Error(`Flow step ${i} missing required string "name": ${flowPath}`);
    }
    if (typeof s.capsule_path !== "string" || !s.capsule_path.trim()) {
      throw new Error(`Flow step ${i} missing required string "capsule_path": ${flowPath}`);
    }
    if (s.expect_capsule_type !== undefined && typeof s.expect_capsule_type !== "string") {
      throw new Error(
        `Flow step ${i} "expect_capsule_type" must be a string if provided: ${flowPath}`
      );
    }
    if (s.compute_hashes !== undefined && typeof s.compute_hashes !== "boolean") {
      throw new Error(`Flow step ${i} "compute_hashes" must be a boolean if provided: ${flowPath}`);
    }
  }

  return x as unknown as FlowSpec;
}

export class HarnessCore {
  runFlowFromFile(flowSpecPath: string): HarnessResult {
    const started_at = nowIso();
    const failures: HarnessFailure[] = [];
    const trace: HarnessTraceEntry[] = [];

    // Auto-registered observers (Mode A)
    const capsuleObserver = new CapsuleObserver();
	const consentObserver = new ConsentObserver();
	const policyObserver = new PolicyObserver();
	const memoryObserver = new MemoryObserver();


    const flowAbs = path.resolve(flowSpecPath);
    const flowDir = path.dirname(flowAbs);

    let flow: FlowSpec;
    try {
      const raw = readJsonFile(flowAbs);
      flow = assertFlowSpec(raw, flowAbs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        flow_id: "UNKNOWN",
        ok: false,
        started_at,
        finished_at: nowIso(),
        failures: [
          {
            step_index: -1,
            step_name: "FLOW_LOAD",
            code: "FLOW_LOAD_FAILED",
            message: msg,
          },
        ],
        trace: [],
        observers: {
          capsule: capsuleObserver.snapshot(),
        },
      };
    }

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i]!;
      const stepName = step.name;

      try {
        const capsuleAbs = resolvePath(flowDir, step.capsule_path);
        const capsule = readJsonFile(capsuleAbs);
        const capsule_type = extractCapsuleType(capsule);

        if (step.expect_capsule_type && capsule_type !== step.expect_capsule_type) {
          throw new Error(
            `Capsule type mismatch: expected "${step.expect_capsule_type}", got "${capsule_type}"`
          );
        }

        const compute_hashes = step.compute_hashes !== false;

        let canonical_json: string | undefined;
        let hash_hex: string | undefined;
        let capsule_hash: string | undefined;

        if (compute_hashes) {
          const hv = binlingAdapter.hashValue(capsule);
          canonical_json = hv.canonicalJson;
          hash_hex = hv.hex;
          capsule_hash = toCapsuleHash(hv.hex);
        }

        const capsuleMeta: any = {
          capsule_type,
          capsule_path: capsuleAbs,
        };

        if (canonical_json !== undefined) {
          capsuleMeta.canonical_json = canonical_json;
        }
        if (hash_hex !== undefined) {
          capsuleMeta.hash_hex = hash_hex;
        }
        if (capsule_hash !== undefined) {
          capsuleMeta.capsule_hash = capsule_hash;
        }

        trace.push({
          step_index: i,
          step_name: stepName,
          capsule: capsuleMeta,
        });

        // Notify observers only for successful steps
        capsuleObserver.onCapsule(trace[trace.length - 1]!);
		consentObserver.onCapsule(trace[trace.length - 1]!);
		policyObserver.onCapsule(trace[trace.length - 1]!);
		memoryObserver.onCapsule(trace[trace.length - 1]!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({
          step_index: i,
          step_name: stepName,
          code: "STEP_FAILED",
          message: msg,
        });
      }
    }

    const finished_at = nowIso();
    return {
      flow_id: flow.flow_id,
      ok: failures.length === 0,
      started_at,
      finished_at,
      failures,
      trace,
      observers: {
        capsule: capsuleObserver.snapshot(),
		consent: consentObserver.snapshot(),
		policy: policyObserver.snapshot(),
		memory: memoryObserver.snapshot(),
      },
    };
  }
}
