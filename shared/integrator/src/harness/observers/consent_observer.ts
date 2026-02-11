import type { HarnessTraceEntry, HarnessFailure } from "../types.js";

export interface ConsentSnapshot {
  state: "UNKNOWN" | "ASSERTED" | "REVOKED";
  assertion_capsule_hash: string | null;
  revocation_capsule_hash: string | null;
}

export class ConsentObserver {
  private state: ConsentSnapshot["state"] = "UNKNOWN";
  private assertionCapsule: string | null = null;
  private revocationCapsule: string | null = null;

  observe(entry: HarnessTraceEntry): HarnessFailure[] {
    if (!entry.capsule) return [];

    const { capsule_type, capsule_hash } = entry.capsule;

    if (capsule_type === "CONSENT_ASSERTION") {
      this.state = "ASSERTED";
      this.assertionCapsule = capsule_hash ?? null;
    }

    if (capsule_type === "CONSENT_REVOCATION") {
      this.state = "REVOKED";
      this.revocationCapsule = capsule_hash ?? null;
    }

    return [];
  }

  snapshot(): ConsentSnapshot {
    return {
      state: this.state,
      assertion_capsule_hash: this.assertionCapsule,
      revocation_capsule_hash: this.revocationCapsule,
    };
  }
}
