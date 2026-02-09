import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

// Explicit Draft 2020-12 meta-schema (NO remote fetching)
import draft2020MetaSchema from "ajv/dist/refs/json-schema-2020-12/schema.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type CompiledSchema = ReturnType<Ajv2020["compile"]>;

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

export function compileSchema(schemaPath: string): CompiledSchema {
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    validateSchema: true,
    loadSchema: undefined, // hard-disable remote resolution
  });

  // Explicitly register Draft 2020-12 meta-schema
  ajv.addMetaSchema(draft2020MetaSchema);

  addFormats(ajv);

  const schema = loadJsonSchema(schemaPath);

  return ajv.compile(schema);
}
