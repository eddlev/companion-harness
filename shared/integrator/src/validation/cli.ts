// shared/integrator/src/validation/cli.ts
import fs from "node:fs";
import path from "node:path";

import { validateCapsule, validateCommitProposal } from "./schema.js";

function usage(): never {
  // Keep it minimal and production-friendly.
  throw new Error(
    "Usage:\n" +
      "  node dist/validation/cli.js <capsule|commit> <path-to-json> [schemaDir]\n\n" +
      "Examples:\n" +
      "  node dist/validation/cli.js capsule ./some_capsule.json\n" +
      "  node dist/validation/cli.js commit  ./some_commit.json  ../../schema\n"
  );
}

const kind = process.argv[2];
const filePathArg = process.argv[3];
const schemaDirArg = process.argv[4];

if (!kind || !filePathArg) usage();
if (kind !== "capsule" && kind !== "commit") usage();

const abs = path.resolve(process.cwd(), filePathArg);
if (!fs.existsSync(abs)) {
  throw new Error(`File not found: ${abs}`);
}

const raw = fs.readFileSync(abs, "utf8");
const json = JSON.parse(raw) as unknown;

const schemaDir = schemaDirArg ? path.resolve(process.cwd(), schemaDirArg) : undefined;

if (kind === "capsule") {
  validateCapsule(json, schemaDir);
} else {
  validateCommitProposal(json, schemaDir);
}

// If we got here, validation passed.
process.stdout.write("ok\n");
