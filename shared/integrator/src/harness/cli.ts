#!/usr/bin/env node
// shared/integrator/src/harness/cli.ts

import path from "node:path";
import { HarnessCore } from "./harness.js";
import { writeJsonFile } from "./io.js";
import { HarnessRunner } from "./runner.js";
import { MockAdapter } from "./adapter/mock_adapter.js";

function usage(): void {
  console.error(
    "Usage:\n" +
      "  harness run <flow_spec.json> [--out <result.json>] [--adapter mock]\n"
  );
}

type AdapterName = "mock" | null;

const [, , cmd, flowSpecPath, ...rest] = process.argv;

if (!cmd || !flowSpecPath) {
  usage();
  process.exit(1);
}

// At this point, flowSpecPath is guaranteed to be a string
const flowPath: string = flowSpecPath;

if (cmd !== "run") {
  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}

let outPath: string | null = null;
let adapterName: AdapterName = null;

for (let i = 0; i < rest.length; i++) {
  const a = rest[i]!;
  if (a === "--out") {
    const v = rest[i + 1];
    if (!v) {
      console.error("Missing value for --out");
      process.exit(1);
    }
    outPath = v;
    i++;
  } else if (a === "--adapter") {
    const v = rest[i + 1];
    if (!v) {
      console.error("Missing value for --adapter");
      process.exit(1);
    }
    if (v !== "mock") {
      console.error(`Unknown adapter: ${v}`);
      usage();
      process.exit(1);
    }
    adapterName = "mock";
    i++;
  } else {
    console.error(`Unknown argument: ${a}`);
    usage();
    process.exit(1);
  }
}

async function main(): Promise<void> {
  let result;
  if (adapterName === "mock") {
    const runner = new HarnessRunner(new MockAdapter());
    result = await runner.runFlow(flowPath);
  } else {
    const core = new HarnessCore();
    result = core.runFlowFromFile(flowPath);
  }

  if (outPath) {
    const abs = path.resolve(outPath);
    writeJsonFile(abs, result);
    console.log(JSON.stringify({ ok: result.ok, flow_id: result.flow_id, out: abs }, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(result.ok ? 0 : 2);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Harness failed: ${msg}`);
  process.exit(2);
});
