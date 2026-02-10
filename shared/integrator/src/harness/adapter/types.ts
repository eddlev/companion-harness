// shared/integrator/src/harness/adapter/types.ts

import type { Json } from "../types.js";

/**
 * Minimal envelope returned by any adapter after dispatching a capsule.
 * This is intentionally sparse and deterministic.
 */
export interface AdapterResponse {
  /**
   * Whether the adapter accepted the capsule.
   * This does NOT imply semantic success.
   */
  accepted: boolean;

  /**
   * Optional adapter-specific status string.
   * Examples: "ok", "noop", "rejected", "skipped"
   */
  status?: string;

  /**
   * Optional machine-readable reason for rejection or special handling.
   */
  reason?: string;

  /**
   * Adapter-visible metadata (e.g. synthetic token counts).
   * Must be JSON-serializable.
   */
  meta?: Json;
}

/**
 * Execution adapter contract.
 *
 * Adapters MUST:
 * - be deterministic unless explicitly documented otherwise
 * - never mutate capsule JSON
 * - never throw on normal rejection (use accepted=false instead)
 */
export interface ExecutionAdapter {
  /**
   * Dispatch a single capsule.
   *
   * @param capsule  The parsed capsule JSON (already schema-validated).
   * @param context  Optional execution context (flow id, step index, etc.).
   */
  dispatch(
    capsule: Json,
    context?: {
      flow_id?: string;
      step_index?: number;
    }
  ): Promise<AdapterResponse>;
}
