import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import ESM modules as opaque values
import * as AjvModule from "ajv/dist/ajv.js";
import * as FormatsModule from "ajv-formats/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ---- Typed boundary fix ----
 * Ajv and ajv-formats publish ESM runtimes whose typings
 * do not correctly describe their default exports under NodeNext.
 * We assert the runtime shape explicitly here and keep the rest type-safe.
 */
const AjvConstructor = (AjvModule as unknown as { default: new (opts: any) => any }).default;
const addFormats = (FormatsModule as unknown as { default: (ajv: any) => void }).default;

const ajv = new AjvConstructor({
  strict: true,
  allErrors: true,
  validateSchema: true,
});

// Register standard formats
addFormats(ajv);

// Explicitly activate Draft 2020-12 (local, no network)
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
