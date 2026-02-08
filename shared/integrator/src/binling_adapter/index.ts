// shared/integrator/src/binling_adapter/index.ts

import {
  BinlingAdapter,
  CanonicalBytes,
  CanonicalizeOptions,
  HashOptions,
  HrefV1,
} from "./types";

import { canonicalizeToBytes } from "./canonicalize";
import { hashCanonicalBytes, toCapsuleHash, toPolicyHash } from "./hash";
import { hrefEncodeV1, hrefParseV1 } from "./href";

/**
 * Public adapter instance. Keep this surface area small.
 * Everything else in the harness should talk to this object, not to BinLing directly.
 */
export const binlingAdapter: BinlingAdapter = {
  canonicalize(value: unknown, opts?: CanonicalizeOptions): CanonicalBytes {
    return canonicalizeToBytes(value, opts);
  },

  hashCanonical(canonical: CanonicalBytes, opts?: HashOptions) {
    return hashCanonicalBytes(canonical, opts);
  },

  hashValue(value: unknown, opts?: { canonicalize?: CanonicalizeOptions; hash?: HashOptions }) {
    const canonical = canonicalizeToBytes(value, opts?.canonicalize);
    const h = hashCanonicalBytes(canonical, opts?.hash);
    return { ...h, canonicalJson: canonical.canonicalJson };
  },

  hrefEncode(href: HrefV1): string {
    return hrefEncodeV1(href);
  },

  hrefParse(input: string): HrefV1 | null {
    return hrefParseV1(input);
  },
};

export { toPolicyHash, toCapsuleHash };

// Re-export types for convenience
export * from "./types";

