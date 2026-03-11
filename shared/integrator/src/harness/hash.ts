import { createHash } from 'node:crypto';
// IMPORTANT: This imports the canonicalization authority from your submodule.
// Ensure the relative path matches your actual adapter export.
import { canonicalizeToBytes } from '../binling_adapter/index.js';

/**
 * HarnessHasher: Strict Cryptographic Authority for the Companion Harness.
 * * CONTRACT ENFORCEMENT:
 * The Harness MUST NOT attempt to define canonical form.
 * All object canonicalization is delegated to the BinLing adapter to ensure
 * cross-platform deterministic hashing (NFC normalization, standard exponent handling).
 */
export class HarnessHasher {
    
    /**
     * Derives a stable SHA-256 hash from a payload using BinLing canonicalization.
     * * @param payload Any raw object, array, or primitive.
     * @returns A 64-character lowercase hex string.
     */
    public static hashCanonical(payload: unknown): string {
        if (payload === undefined || payload === null) {
            throw new Error("[HarnessHasher] Cannot hash null or undefined payload.");
        }

        try {
            // 1. Delegate canonicalization to BinLing Adapter
            const canonicalBytes = canonicalizeToBytes(payload);
            
            // 2. Hash the deterministic byte array
            return createHash('sha256').update(canonicalBytes).digest('hex');
        } catch (error) {
            console.error("[HarnessHasher] BinLing Canonicalization failed:", error);
            throw new Error(`Canonicalization failure: ${(error as Error).message}`);
        }
    }

    /**
     * Generates a stable, standard-compliant Capsule ID (e.g., mem_a1b2c3d4e5f6).
     * Automatically strips pre-existing capsule_id fields to prevent recursive hashing errors.
     * * @param prefix The domain prefix (e.g., 'mem', 'macro', 'ctr', 'pup')
     * @param payload The data object to hash.
     * @returns A prefixed 12-character ID.
     */
    public static generateCapsuleId(prefix: string, payload: Record<string, unknown>): string {
        // 1. Isolate the payload to ensure we aren't hashing an existing ID
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { capsule_id, ...cleanPayload } = payload;

        // 2. Generate full canonical hash
        const fullHash = this.hashCanonical(cleanPayload);

        // 3. Return standard formatted ID (prefix + 12 chars of SHA-256)
        return `${prefix}_${fullHash.substring(0, 12)}`;
    }

    /**
     * Validates if an existing payload matches its attached capsule_id.
     * Used by the Auditor to ensure memory capsules haven't been tampered with.
     */
    public static verifyCapsuleIntegrity(prefix: string, payload: Record<string, unknown>): boolean {
        if (!payload.capsule_id || typeof payload.capsule_id !== 'string') {
            return false;
        }

        const expectedId = this.generateCapsuleId(prefix, payload);
        return payload.capsule_id === expectedId;
    }
}