import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv, { type AnySchema } from "ajv";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({
  strict: true,
  allErrors: true,
  validateSchema: true,
});

// Register standard formats (date-time, uri, etc.)
addFormats(ajv);

// Explicitly activate Draft 2020-12
ajv.opts.defaultMeta = "https://json-schema.org/draft/2020-12/schema";
ajv.addMetaSchema(
  JSON.parse(
    fs.readFileSync(
      path.resolve(
        path.dirname(require.resolve("ajv")),
        "refs/json-schema-2020-12/schema.json"
      ),
      "utf-8"
    )
  )
);

function loadJsonFile(filePath: string): unknown {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, "utf-8");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON: ${absPath}`);
  }
}

function compileSchema(schemaPath: string) {
  const schema = loadJsonFile(schemaPath) as AnySchema;
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
  const data = loadJsonFile(capsulePath);

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
  const data = loadJsonFile(proposalPath);

  const valid = validate(data);
  if (!valid) {
    throw new Error(
      `Commit proposal validation failed:\n${ajv.errorsText(validate.errors, {
        separator: "\n",
      })}`
    );
  }
}
