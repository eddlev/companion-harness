// shared/integrator/src/binling_adapter/canonicalize.ts

import { CanonicalBytes, CanonicalizeOptions } from "./types";

/**
 * CJSON v1 (JCS-like) canonicalization.
 *
 * Rules:
 * - UTF-8, no BOM
 * - No insignificant whitespace
 * - Object keys lexicographically sorted (Unicode code points)
 * - Strings normalized to NFC (default)
 * - Arrays preserve order
 * - Numbers: fixed rounding discipline (default 6 decimals), trim trailing zeros, no exponent form
 * - No NaN/Infinity
 *
 * Note: JSON.parse already eliminates duplicate keys by overwriting; detecting duplicates
 * requires a streaming parser. For v1, we assume upstream JSON was well-formed.
 */
export function canonicalizeToBytes(
  value: unknown,
  opts: CanonicalizeOptions = {}
): CanonicalBytes {
  const decimals = typeof opts.decimals === "number" ? opts.decimals : 6;
  const normalizeNFC = opts.normalizeNFC !== false;

  const normalized = normalizeValue(value, { decimals, normalizeNFC });

  const canonicalJson = stableStringify(normalized);
  const bytes = new TextEncoder().encode(canonicalJson);

  return { bytes, canonicalJson };
}

type NormCtx = { decimals: number; normalizeNFC: boolean };

function normalizeValue(v: unknown, ctx: NormCtx): unknown {
  if (v === null) return null;

  const t = typeof v;

  if (t === "string") {
    return ctx.normalizeNFC ? (v as string).normalize("NFC") : v;
  }

  if (t === "boolean") return v;

  if (t === "number") {
    const n = v as number;
    if (!Number.isFinite(n)) {
      throw new Error(`canonicalize: non-finite number is forbidden: ${String(n)}`);
    }
    return normalizeNumber(n, ctx.decimals);
  }

  if (Array.isArray(v)) {
    return v.map((x) => normalizeValue(x, ctx));
  }

  if (t === "object") {
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    // Sort keys lexicographically by Unicode code point (JS default string sort is OK here).
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      const nk = ctx.normalizeNFC ? k.normalize("NFC") : k;
      out[nk] = normalizeValue(obj[k], ctx);
    }
    return out;
  }

  // undefined / function / symbol are not valid JSON; we forbid them.
  throw new Error(`canonicalize: unsupported type: ${t}`);
}

function normalizeNumber(n: number, decimals: number): number {
  // Clamp tiny negative zero: -0 -> 0
  if (Object.is(n, -0)) return 0;

  // Round to fixed decimals, then trim zeros via numeric conversion.
  // We must avoid exponent output later; stableStringify handles number -> string.
  // But JS may produce exponent for very small values; so we convert to decimal string ourselves.
  // We keep the number as number for internal tree, but stableStringify will use our numberToString.
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(n * factor) / factor;

  // Again, eliminate -0 after rounding
  if (Object.is(rounded, -0)) return 0;

  return rounded;
}

/**
 * Stable stringify that:
 * - emits no whitespace
 * - preserves array order
 * - relies on already-sorted object keys
 * - renders numbers in decimal (no exponent) with trimmed trailing zeros up to 6 decimals (or ctx)
 *
 * We don’t use JSON.stringify directly because it can emit exponent form.
 */
function stableStringify(v: unknown): string {
  if (v === null) return "null";

  const t = typeof v;

  if (t === "string") return JSON.stringify(v); // standard JSON escaping
  if (t === "boolean") return v ? "true" : "false";
  if (t === "number") return numberToDecimalString(v as number);

  if (Array.isArray(v)) {
    let s = "[";
    for (let i = 0; i < v.length; i++) {
      if (i) s += ",";
      s += stableStringify(v[i]);
    }
    s += "]";
    return s;
  }

  if (t === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj); // assumed already sorted by normalizeValue
    let s = "{";
    for (let i = 0; i < keys.length; i++) {
      if (i) s += ",";
      const k = keys[i]!;
      s += JSON.stringify(k);
      s += ":";
      s += stableStringify(obj[k]);
    }
    s += "}";
    return s;
  }

  throw new Error(`stableStringify: unsupported type: ${t}`);
}

/**
 * Render a JS number to a decimal string without exponent notation.
 * Assumes the number has already been rounded to <= 6 decimals (or configured).
 */
function numberToDecimalString(n: number): string {
  if (!Number.isFinite(n)) throw new Error("numberToDecimalString: non-finite");

  // Integers: fast path
  if (Number.isInteger(n)) return String(n);

  // We need decimal without exponent. Use toFixed with a generous cap,
  // then trim trailing zeros + dot.
  // 12 decimals is plenty since we already rounded earlier; keeps safety margin.
  const raw = n.toFixed(12);
  // Trim trailing zeros
  let out = raw.replace(/0+$/, "");
  // Trim trailing dot
  out = out.replace(/\.$/, "");
  // Normalize "-0" just in case
  if (out === "-0") out = "0";
  return out;
}

