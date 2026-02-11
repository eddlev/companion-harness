// shared/integrator/src/binling_adapter/tests/smoke.ts

import { BinlingAdapter } from "../index.js";

async function run() {
  const adapter = new BinlingAdapter();

  const res = await adapter.dispatch(
    { test: "capsule" },
    { flow_id: "SMOKE", step_index: 0 }
  );

  console.log("adapter response:", res);
}

run().catch(console.error);
