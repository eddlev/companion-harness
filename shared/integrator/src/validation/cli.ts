#!/usr/bin/env node

import { validateCapsule, validateCommitProposal } from "./schema.js";

const [, , command, schemaPath, targetPath] = process.argv;

if (!command || !schemaPath || !targetPath) {
  console.error(
    "Usage:\n" +
      "  validate:capsule <schema.json> <capsule.json>\n" +
      "  validate:commit  <schema.json> <proposal.json>"
  );
  process.exit(1);
}

try {
  switch (command) {
    case "capsule":
      validateCapsule(schemaPath, targetPath);
      break;

    case "commit":
      validateCommitProposal(schemaPath, targetPath);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
