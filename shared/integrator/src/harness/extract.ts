// shared/integrator/src/harness/extract.ts

import { Json } from "./types.js";

function isObject(v: Json): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Best-effort capsule type extraction.
 * We will accept either:
 *  - capsule_type (preferred)
 *  - type (fallback)
 */
export function extractCapsuleType(capsule: Json): string {
  if (!isObject(capsule)) {
    throw new Error("Capsule must be a JSON object");
  }

  const ct = capsule["capsule_type"];
  if (typeof ct === "string" && ct.trim()) return ct.trim();

  const t = capsule["type"];
  if (typeof t === "string" && t.trim()) return t.trim();

  throw new Error('Capsule missing required string field "capsule_type" (or fallback "type")');
}
