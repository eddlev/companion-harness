// shared/integrator/src/harness/adapter/mock_adapter.ts

import type { ExecutionAdapter, AdapterResponse } from "./types.js";
import type { Json } from "../types.js";

/**
 * Deterministic mock adapter for CI and local testing.
 *
 * This adapter:
 * - never calls a model
 * - never performs I/O
 * - never fails nondeterministically
 * - emits predictable responses
 */
export class MockAdapter implements ExecutionAdapter {
  async dispatch(
    _capsule: Json,
    _context?: {
      flow_id?: string;
      step_index?: number;
    }
  ): Promise<AdapterResponse> {
    return {
      accepted: true,
      status: "mock-ok",
      meta: {
        tokens_in: 0,
        tokens_out: 0,
      },
    };
  }
}
