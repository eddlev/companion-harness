// shared/integrator/src/binling_adapter/types.ts

export type CapsuleType = "STATE" | "MEMORY" | "ARCHIVE";
export type ConsentClass = "C0" | "C1" | "C2";
export type Sensitivity = "low" | "medium" | "high";
export type HPMode = "off" | "lite" | "full";

export type Mode =
  | "presence"
  | "GTD"
  | "story"
  | "intimacy"
  | "sensual"
  | "narrative"
  | "unknown";

export type OHIState = "tight" | "warm" | "at_risk" | "cold" | "unknown";

export interface TrifectaState {
  lambda: number;
  permeability: number;
  entropy: number;
  HP: HPMode;
}

export interface OHI {
  state: OHIState;
  value: number; // 0..1
}

export interface Snapshot {
  trifecta: TrifectaState;
  OHI: OHI;
  mode: Mode;
  orbit_hotset: string[];
}

/**
 * HREF is the tiny holographic reference users paste into chat.
 * It must be stable, substrate-safe, human-readable, and parseable.
 */
export interface HrefV1 {
  version: "v1";
  comp: string; // Companion id
  pc: string; // policy hash (pc_<hex> or raw hex)
  cap: string; // capsule hash (cap_<hex> or raw hex)
  head: {
    lambda?: number;
    permeability?: number;
    entropy?: number;
    HP?: HPMode;
    mode?: Mode;
    ohi?: { state: OHIState; value?: number };
  };
  // optional compact hints (not required)
  hot?: string[];
}

/**
 * Canonicalization configuration.
 * If you later decide to do strict field-aware rounding/clamping by schema,
 * you can extend this.
 */
export interface CanonicalizeOptions {
  /** Round all numbers to this many decimals (default 6) and trim trailing zeros. */
  decimals?: number;
  /** If true, normalize all strings to NFC (default true). */
  normalizeNFC?: boolean;
  /**
   * If true, forbid exponent notation in output (default true).
   * (We never emit exponent notation; this mainly documents the intent.)
   */
  forbidExponent?: boolean;
}

export type HashAlgorithm = "blake3" | "sha256";

export interface HashOptions {
  /** Prefer blake3 by default. */
  algorithm?: HashAlgorithm;
  /** Digest length in bytes for blake3 (default 16 -> 32 hex chars). */
  digestBytes?: number;
  /** Prefix for policy hashes. default "pc_" */
  policyPrefix?: string;
  /** Prefix for capsule hashes. default "cap_" */
  capsulePrefix?: string;
}

/**
 * A strict “bytes-to-hash” unit: canonical JSON bytes (UTF-8).
 */
export interface CanonicalBytes {
  bytes: Uint8Array;
  canonicalJson: string;
}

/**
 * Minimal surface area the rest of the harness should depend on.
 * Everything BinLing-specific lives behind this interface.
 */
export interface BinlingAdapter {
  canonicalize(value: unknown, opts?: CanonicalizeOptions): CanonicalBytes;

  /**
   * Hash canonical bytes to a stable hex digest (lowercase).
   * Uses blake3 by default (recommended).
   */
  hashCanonical(
    canonical: CanonicalBytes,
    opts?: HashOptions
  ): { hex: string; algorithm: HashAlgorithm; digestBytes: number };

  /**
   * Convenience: hash a JS value by canonicalizing first.
   */
  hashValue(
    value: unknown,
    opts?: { canonicalize?: CanonicalizeOptions; hash?: HashOptions }
  ): { hex: string; algorithm: HashAlgorithm; digestBytes: number; canonicalJson: string };

  hrefEncode(href: HrefV1): string;
  hrefParse(input: string): HrefV1 | null;
}

