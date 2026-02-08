// shared/integrator/src/validation/schema.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import AjvImport from "ajv";
import type { AnySchema, ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";

export type SchemaId = "capsule" | "commit_proposal";

type AjvInstance = import("ajv").default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// shared/integrator/src/validation/schema.ts  ->  repoRoot/schema/*.json (4 levels up)
const DEFAULT_SCHEMA_DIR = path.resolve(__dirname, "../../../../schema");

const SCHEMA_FILES: Record<SchemaId, string> = {
  capsule: "capsule_schema.json",
  commit_proposal: "commit_proposal_schema.json",
};

let _ajv: AjvInstance | null = null;
let _compiled: Map<SchemaId, ValidateFunction> | null = null;

function getAjvConstructor(): typeof AjvImport {
  // Works whether Ajv is exported as default or as a module object.
  return ((AjvImport as unknown as { default?: typeof AjvImport }).default ?? AjvImport) as typeof AjvImport;
}

function getAddFormatsFn(): (ajv: AjvInstance) => void {
  // Works whether ajv-formats is exported as default or as a module object.
  return ((addFormatsImport as unknown as { default?: (ajv: AjvInstance) => void }).default ??
    (addFormatsImport as unknown as (ajv: AjvInstance) => void)) as (ajv: AjvInstance) => void;
}

export function createAjv(): AjvInstance {
    const AjvCtor = getAjvConstructor() as unknown as new (opts: any) => AjvInstance;
  const ajv = new AjvCtor({
    allErrors: true,
    strict: true,
    validateSchema: true,
  }) as AjvInstance;

  const addFormats = getAddFormatsFn();
  addFormats(ajv);

  return ajv;
}

function getAjv(): AjvInstance {
  if (_ajv) return _ajv;
  _ajv = createAjv();
  return _ajv;
}

function readSchemaFile(schemaDir: string, id: SchemaId): AnySchema {
  const filename = SCHEMA_FILES[id];
  const abs = path.resolve(schemaDir, filename);

  if (!fs.existsSync(abs)) {
    throw new Error(
      `Schema file not found: ${abs}\n` +
        `Expected schema directory: ${schemaDir}\n` +
        `If your repo layout differs, pass a different schemaDir from the CLI.`
    );
  }

  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw) as AnySchema;
}

function compileAll(schemaDir: string): Map<SchemaId, ValidateFunction> {
  const ajv = getAjv();
  const out = new Map<SchemaId, ValidateFunction>();

  (Object.keys(SCHEMA_FILES) as SchemaId[]).forEach((id) => {
    const schema = readSchemaFile(schemaDir, id);
    const validate = ajv.compile(schema);
    out.set(id, validate);
  });

  return out;
}

export function getValidators(schemaDir: string = DEFAULT_SCHEMA_DIR): {
  validateCapsule: ValidateFunction;
  validateCommitProposal: ValidateFunction;
} {
  if (!_compiled) {
    _compiled = compileAll(schemaDir);
  }

  const validateCapsule = _compiled.get("capsule");
  const validateCommitProposal = _compiled.get("commit_proposal");

  if (!validateCapsule || !validateCommitProposal) {
    throw new Error("Internal error: schema validators missing after compile.");
  }

  return { validateCapsule, validateCommitProposal };
}

export function validateCapsule(value: unknown, schemaDir?: string): void {
  const { validateCapsule } = getValidators(schemaDir);
  const ok = validateCapsule(value);
  if (!ok) {
    const details = JSON.stringify(validateCapsule.errors ?? [], null, 2);
    throw new Error(`capsule_schema validation failed:\n${details}`);
  }
}

export function validateCommitProposal(value: unknown, schemaDir?: string): void {
  const { validateCommitProposal } = getValidators(schemaDir);
  const ok = validateCommitProposal(value);
  if (!ok) {
    const details = JSON.stringify(validateCommitProposal.errors ?? [], null, 2);
    throw new Error(`commit_proposal_schema validation failed:\n${details}`);
  }
}
