// shared/integrator/src/harness/observers/consent_observer.ts

import type { HarnessTraceEntry, HarnessFailure, ConsentSnapshot } from "../types.js";

export class ConsentObserver {
  private state: "ASSERTED" | "REVOKED" | "UNKNOWN" = "UNKNOWN";
  private assertionCapsule: string | null = null;
  private revocationCapsule: string | null = null;
  
  // Track scopes per active consent hash
  private activeScopes: Map<string, string[]> = new Map();

  observe(entry: HarnessTraceEntry): HarnessFailure[] {
    if (!entry.capsule || !entry.capsule.canonical_json) return [];

    const { capsule_type, capsule_hash, canonical_json } = entry.capsule;

    if (capsule_type === "CONSENT_ASSERTION") {
      this.state = "ASSERTED";
      this.assertionCapsule = capsule_hash ?? null;
      this.revocationCapsule = null;

      // Parse payload to extract scope
      try {
        const payload = JSON.parse(canonical_json);
        const scopes = payload?.consent?.scope;
        
        if (capsule_hash && Array.isArray(scopes)) {
          this.activeScopes.set(capsule_hash, scopes);
        }
      } catch {
        // If JSON parse fails, we can't track scope, but harness validation 
        // would likely have caught malformed JSON earlier.
      }
    }

    if (capsule_type === "CONSENT_REVOCATION") {
      this.state = "REVOKED";
      this.revocationCapsule = capsule_hash ?? null;
      
      // Revoke all active scopes (simplest safe default)
      this.activeScopes.clear();
    }

    return [];
  }

  snapshot(): ConsentSnapshot {
    // Convert Map to Record for JSON snapshot
    const scopeRecord: Record<string, string[]> = {};
    for (const [hash, scopes] of this.activeScopes.entries()) {
      scopeRecord[hash] = scopes;
    }

    return {
      state: this.state,
      assertion_capsule_hash: this.assertionCapsule,
      revocation_capsule_hash: this.revocationCapsule,
      active_scopes: scopeRecord,
    };
  }
}