import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ajv 2020-12 dialect (preloaded meta-schemas)
import * as Ajv2020Module from "ajv/dist/2020.js";
import * as FormatsModule from "ajv-formats/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Typed boundary fix for Ajv ESM + 2020-12 dialect
 */
const Ajv2020 =
  (Ajv2020Module as unknown as { default: new (opts: any) => any }).default;
const addFormats =
  (FormatsModule as unknown as { default: (ajv: any) => void }).default;

const ajv = new Ajv2020({
  strict: true,
  strictSchema: false, // required for 2020-12 ($dynamicAnchor etc.)
  allErrors: true,
  validateSchema: true,
});

// Register standard formats
addFormats(ajv);

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
  const schema = loadJsonFile(schemaPath) as any;
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
