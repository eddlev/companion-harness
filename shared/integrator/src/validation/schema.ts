import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Ajv } from "ajv";
import { addFormats } from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({
  strict: true,
  allErrors: true,
  validateSchema: true,
  loadSchema: undefined, // forbid remote resolution
});

// Register standard formats (date-time, uri, etc.)
addFormats(ajv);

// Explicitly enable Draft 2020-12 support
// (Ajv ships the meta-schema internally; this activates it deterministically)
ajv.opts.defaultMeta = "https://json-schema.org/draft/2020-12/schema";
ajv.addMetaSchema(
  require("ajv/dist/refs/json-schema-2020-12/schema.json")
);

function loadJsonSchema(schemaPath: string): unknown {
  const absPath = path.resolve(schemaPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Schema file not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, "utf-8");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in schema file: ${absPath}`);
  }
}

function compileSchema(schemaPath: string) {
  const schema = loadJsonSchema(schemaPath);
  return ajv.compile(schema);
}

/* ------------------------------------------------------------------ */
/* PUBLIC API — REQUIRED BY cli.ts                                     */
/* ------------------------------------------------------------------ */

export function validateCapsule(
  schemaPath: string,
  capsulePath: string
): void {
  const validate = compileSchema(schemaPath);
  const data = loadJsonSchema(capsulePath);

  const valid = validate(data);
  if (!valid) {
    throw new Error(
      `Capsule validation failed:\n${ajv.errorsText(validate.errors, {
        separator: "\n",
      })}`
    );
  }
}

export function validateCommitProposal(
  schemaPath: string,
  proposalPath: string
): void {
  const validate = compileSchema(schemaPath);
  const data = loadJsonSchema(proposalPath);

  const valid = validate(data);
  if (!valid) {
    throw new Error(
      `Commit proposal validation failed:\n${ajv.errorsText(validate.errors, {
        separator: "\n",
      })}`
    );
  }
}
