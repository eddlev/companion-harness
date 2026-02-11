// shared/integrator/src/harness/hash.ts

import crypto from "node:crypto";

export interface CapsuleHashes {
  hash_hex: string;
  capsule_hash: string;
}

/**
 * Computes the deterministic hash of a capsule's canonical JSON.
 *
 * Contract:
 * - Input: Canonical JSON string
 * - Algo: SHA-256 (compatible with BinLing v0.1 text representation)
 * - Output: Hex digest and "cap_" prefixed identifier
 */
export function computeCapsuleHashes(canonicalJson: string): CapsuleHashes {
  const hash = crypto.createHash("sha256");
  hash.update(canonicalJson);
  const hex = hash.digest("hex");

  return {
    hash_hex: hex,
    capsule_hash: `cap_${hex}`,
  };
}