// shared/integrator/src/harness/harness.ts

import crypto from "node:crypto";
import path from "node:path";
import { readJsonFile } from "./io.js";
import { CapsuleObserver } from "./observers/capsule_observer.js";
import { ConsentObserver } from "./observers/consent_observer.js";
import { PolicyObserver } from "./observers/policy_observer.js";
import { MemoryObserver } from "./observers/memory_observer.js";
import type { 
  FlowSpec, 
  HarnessResult, 
  HarnessTraceEntry, 
  HarnessFailure,
  Json
} from "./types.js";

/**
 * HarnessCore: The authoritative structural engine.
 * Hardened by Information Security Analyst (15-1212.00) for cryptographic continuity.
 */
export class HarnessCore {
  private capsuleObserver = new CapsuleObserver();
  private consentObserver = new ConsentObserver();
  private policyObserver = new PolicyObserver();
  private memoryObserver = new MemoryObserver();

  /**
   * BinLing Canonical Hash Utility.
   * Recursively sorts keys and removes whitespace to produce a platform-invariant hash.
   */
  public static computeCanonicalHash(data: Json): string {
    const canonicalize = (val: any): any => {
      // Recursively sort object keys
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return Object.keys(val)
          .sort()
          .reduce((sorted: any, k) => {
            sorted[k] = canonicalize(val[k]);
            return sorted;
          }, {});
      }
      // Handle arrays (order preserved, but elements canonicalized)
      if (Array.isArray(val)) {
        return val.map(canonicalize);
      }
      return val;
    };
    
    // Stringify the canonical object with zero whitespace
    const canonicalString = JSON.stringify(canonicalize(data));
    const hash = crypto.createHash("sha256").update(canonicalString).digest("hex");
    return `cap_${hash}`;
  }

  runFlowFromFile(absPath: string): HarnessResult {
    const startedAt = new Date().toISOString();
    const flowDir = path.dirname(absPath);
    const flow = readJsonFile(absPath) as unknown as FlowSpec;
    
    const trace: HarnessTraceEntry[] = [];
    const failures: HarnessFailure[] = [];

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      if (!step) continue;

      try {
        // SECURITY GATE: Resolve path relative to the flow file directory
        const capsuleAbsPath = path.resolve(flowDir, step.capsule_path);
        const capsuleJson = readJsonFile(capsuleAbsPath) as Json;
        
        // SECURITY GATE: Compute Deterministic Canonical Hash
        const capsuleHash = HarnessCore.computeCanonicalHash(capsuleJson);

        const entry: HarnessTraceEntry = {
          step_index: i,
          step_name: step.name,
          capsule: {
            capsule_type: (capsuleJson as any).capsule_type || "UNKNOWN",
            capsule_path: capsuleAbsPath,
            canonical_json: JSON.stringify(capsuleJson),
            capsule_hash: capsuleHash,
            hash_hex: capsuleHash.replace("cap_", "")
          }
        };

        trace.push(entry);

        // OBSERVER GATE: Multi-Layer Semantic Observation
        failures.push(...this.capsuleObserver.observe(entry));
        failures.push(...this.consentObserver.observe(entry));
        failures.push(...this.policyObserver.observe(entry));
        failures.push(...this.memoryObserver.observe(entry));

      } catch (err: any) {
        failures.push({
          step_index: i,
          step_name: step.name,
          code: "FILE_ERROR",
          message: `Path resolution failed for: ${step.capsule_path}. Error: ${err.message}`
        });
      }
    }

    return {
      flow_id: flow.flow_id,
      ok: failures.length === 0,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      failures,
      trace,
      observers: {
        capsule: this.capsuleObserver.snapshot(),
        consent: this.consentObserver.snapshot(),
        policy: this.policyObserver.snapshot(),
        memory: this.memoryObserver.snapshot()
      }
    };
  }
}