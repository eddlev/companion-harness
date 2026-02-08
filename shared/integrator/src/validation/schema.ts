// shared/integrator/src/validation/schema.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import Ajv2020Import from "ajv/dist/2020";
import type { AnySchema, ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";

export type SchemaId = "capsule" | "commit_proposal";

type Ajv2020Ctor = typeof Ajv2020Import;
type AjvInstance = InstanceType<Ajv2020Ctor>;

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

function getAjv2020Constructor(): Ajv2020Ctor {
  // Works whether the module exports the class directly or under .default
  return (
    (Ajv2020Import as unknown as { default?: Ajv2020Ctor }).default ??
    (Ajv2020Import as unknown as Ajv2020Ctor)
  );
}

function getAddFormatsFn(): (ajv: AjvInstance) => void {
  // Works whether ajv-formats is exported as default or as a module object
  return (
    (addFormatsImport as unknown as { default?: (ajv: AjvInstance) => void }).default ??
    (addFormatsImport as unknown as (ajv: AjvInstance) => void)
  );
}

function addDraft202012MetaSchema(ajv: AjvInstance): void {
  // Force-register the draft 2020-12 meta schema so `$schema: .../draft/2020-12/schema` compiles.
  const require = createRequire(import.meta.url);
  const metaSchema2020 = require("ajv/dist/refs/json-schema-2020-12/schema.json") as AnySchema;
  ajv.addMetaSchema(metaSchema2020);
}

export function createAjv(): AjvInstance {
  const Ajv2020 = getAjv2020Constructor() as unknown as new (opts: any) => AjvInstance;

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateSchema: true,
  });

  addDraft202012MetaSchema(ajv);

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

export function getValidators(
  schemaDir: string = DEFAULT_SCHEMA_DIR
): {
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
