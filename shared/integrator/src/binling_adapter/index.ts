// shared/integrator/src/binling_adapter/index.ts

import type { ExecutionAdapter, AdapterResponse } from "../harness/adapter/types.js";
import type { Json } from "../harness/types.js";

/**
 * Mock adapter.
 * Always accepts capsules without execution.
 */
export class BinlingAdapter implements ExecutionAdapter {
  async dispatch(
    _capsule: Json,
    _context?: { flow_id?: string; step_index?: number }
  ): Promise<AdapterResponse> {
    return { accepted: true };
  }
}
