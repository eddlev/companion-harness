// shared/integrator/src/binling_adapter/index.ts

/**
 * Mock adapter.
 * Always accepts capsules without execution.
 */
export class BinlingAdapter {
    async dispatch(_capsule: any, _context: any) {
        return { accepted: true };
    }
}

/**
 * Deterministic JSON Stringifier to ensure stable hashing.
 * Sorts object keys alphabetically and handles nested arrays/objects safely.
 */
function deterministicStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(deterministicStringify).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    const props = keys.map(k => `${JSON.stringify(k)}:${deterministicStringify(obj[k])}`);
    return `{${props.join(',')}}`;
}

/**
 * Canonicalizes a payload into a stable byte array.
 * @param payload The data to canonicalize
 * @returns Buffer containing deterministic bytes
 */
export function canonicalizeToBytes(payload: unknown): Buffer {
    const canonicalString = deterministicStringify(payload);
    return Buffer.from(canonicalString, 'utf8');
}