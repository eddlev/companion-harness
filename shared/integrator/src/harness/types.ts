// shared/integrator/src/harness/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface FlowStep {
  name: string;
  capsule_path: string;
}

export interface FlowStepEnforced extends FlowStep {
  expect_capsule_type?: string;
  compute_hashes?: boolean;
  expect_failure?: boolean;
  failure_reason?: string;
}

export interface FlowSpec {
  flow_id: string;
  steps: FlowStepEnforced[];
}

export interface CapsuleMeta {
  capsule_type: string;
  capsule_path: string;
  canonical_json?: string;
  hash_hex?: string;
  capsule_hash?: string;
}

export interface HarnessTraceEntry {
  step_index: number;
  step_name: string;
  capsule?: CapsuleMeta;
}

export interface HarnessFailure {
  step_index: number;
  step_name: string;
  code: string;
  message: string;
}

export interface CapsuleObserverSnapshot {
  total_capsules: number;
  by_type: Record<string, number>;
  ordered_types: string[];
}

export interface ConsentSnapshot {
  state: "ASSERTED" | "REVOKED" | "UNKNOWN";
  assertion_capsule_hash: string | null;
  revocation_capsule_hash: string | null;
  /**
   * Map of active consent hashes to their allowed scopes.
   * Key: capsule_hash
   * Value: string[] (e.g. ["memory_commit", "relational_interaction"])
   */
  active_scopes: Record<string, string[]>;
}

export interface PolicySnapshot {
  active_policies: string[];
  revoked_policies: string[];
  active_consents: string[];
}

export interface MemoryObserverSnapshot {
  requests: string[];
  commits: string[];
  references: string[];
}

export interface ObserversSnapshot {
  capsule: CapsuleObserverSnapshot;
  consent: ConsentSnapshot;
  policy: PolicySnapshot;
  memory: MemoryObserverSnapshot;
}

export interface HarnessResult {
  flow_id: string;
  ok: boolean;
  started_at: string;
  finished_at: string;
  failures: HarnessFailure[];
  trace: HarnessTraceEntry[];
  observers: ObserversSnapshot;
}