// shared/integrator/src/binling_adapter/hash.ts

import { createHash } from "crypto";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils";
import { CanonicalBytes, HashAlgorithm, HashOptions } from "./types";

/**
 * Hash canonical bytes.
 *
 * Default: blake3, 16 bytes digest (32 hex chars), lowercase.
 * Fallback: sha256.
 */
export function hashCanonicalBytes(
  canonical: CanonicalBytes,
  opts: HashOptions = {}
): { hex: string; algorithm: HashAlgorithm; digestBytes: number } {
  const algorithm: HashAlgorithm = opts.algorithm ?? "blake3";

  if (algorithm === "blake3") {
    const digestBytes = opts.digestBytes ?? 16;
    const digest = blake3(canonical.bytes, { dkLen: digestBytes });
    return { hex: bytesToHex(digest), algorithm, digestBytes };
  }

  // sha256 fallback
  const h = createHash("sha256");
  h.update(Buffer.from(canonical.bytes));
  const hex = h.digest("hex");
  return { hex, algorithm: "sha256", digestBytes: 32 };
}

/**
 * Convenience helpers for prefixed ids.
 */
export function toPolicyHash(hex: string, prefix = "pc_"): string {
  return `${prefix}${hex.toLowerCase()}`;
}

export function toCapsuleHash(hex: string, prefix = "cap_"): string {
  return `${prefix}${hex.toLowerCase()}`;
}
