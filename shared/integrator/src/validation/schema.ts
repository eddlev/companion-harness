// shared/integrator/src/validation/schema.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import type { AnySchema, ValidateFunction } from "ajv";

export type SchemaId = "capsule" | "commit_proposal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/validation/schema.js -> repoRoot/schema/*.json
const DEFAULT_SCHEMA_DIR = path.resolve(__dirname, "../../../../schema");

const SCHEMA_FILES: Record<SchemaId, string> = {
  capsule: "capsule_schema.json",
  commit_proposal: "commit_proposal_schema.json",
};

type AjvInstance = InstanceType<typeof Ajv2020>;

let _ajv: AjvInstance | null = null;
let _compiled: Map<SchemaId, ValidateFunction> | null = null;

export function createAjv(): AjvInstance {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateSchema: true,
  });

  // ajv-formats is a function export
  (addFormats as unknown as (a: AjvInstance) => void)(ajv);

  return ajv;
}

function getAjv(): AjvInstance {
  if (_ajv) return _ajv;
  _ajv = createAjv();
  return _ajv;
}

function readSchemaFile(schemaDir: string, id: SchemaId): AnySchema {
  const abs = path.resolve(schemaDir, SCHEMA_FILES[id]);

  if (!fs.existsSync(abs)) {
    throw new Error(
      `Schema file not found: ${abs}\n` +
        `Expected schema directory: ${schemaDir}`
    );
  }

  return JSON.parse(fs.readFileSync(abs, "utf8")) as AnySchema;
}

function compileAll(schemaDir: string): Map<SchemaId, ValidateFunction> {
  const ajv = getAjv();
  const out = new Map<SchemaId, ValidateFunction>();

  (Object.keys(SCHEMA_FILES) as SchemaId[]).forEach((id) => {
    const schema = readSchemaFile(schemaDir, id);
    out.set(id, ajv.compile(schema));
  });

  return out;
}

export function getValidators(
  schemaDir: string = DEFAULT_SCHEMA_DIR
): {
  validateCapsule: ValidateFunction;
  validateCommitProposal: ValidateFunction;
} {
  if (!_compiled) _compiled = compileAll(schemaDir);

  const validateCapsule = _compiled.get("capsule");
  const validateCommitProposal = _compiled.get("commit_proposal");

  if (!validateCapsule || !validateCommitProposal) {
    throw new Error("Internal error: validators missing after compile.");
  }

  return { validateCapsule, validateCommitProposal };
}

export function validateCapsule(value: unknown, schemaDir?: string): void {
  const { validateCapsule } = getValidators(schemaDir);
  if (!validateCapsule(value)) {
    throw new Error(
      `capsule_schema validation failed:\n${JSON.stringify(
        validateCapsule.errors ?? [],
        null,
        2
      )}`
    );
  }
}

export function validateCommitProposal(value: unknown, schemaDir?: string): void {
  const { validateCommitProposal } = getValidators(schemaDir);
  if (!validateCommitProposal(value)) {
    throw new Error(
      `commit_proposal_schema validation failed:\n${JSON.stringify(
        validateCommitProposal.errors ?? [],
        null,
        2
      )}`
    );
  }
}
