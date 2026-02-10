// shared/integrator/src/harness/types.ts

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export interface FlowStep {
  name: string;
  capsule_path: string;
  expect_capsule_type?: string;
  compute_hashes?: boolean;
}

export interface FlowSpec {
  flow_id: string;
  description?: string;
  steps: FlowStep[];
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
  capsule: CapsuleMeta;
}

export interface HarnessFailure {
  step_index: number;
  step_name: string;
  code: string;
  message: string;
}

export interface HarnessResult {
  flow_id: string;
  ok: boolean;

  started_at: string;
  finished_at: string;

  failures: HarnessFailure[];
  trace: HarnessTraceEntry[];

  /**
   * Observer snapshots keyed by observer name.
   */
  observers: Record<string, unknown>;
}
