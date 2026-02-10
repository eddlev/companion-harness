// shared/integrator/src/harness/observers/consent_observer.ts

import type { HarnessTraceEntry } from "../types.js";

export type ConsentState = "NONE" | "ASSERTED" | "REVOKED";

export interface ConsentSnapshot {
  state: ConsentState;
  scope: string | null;
  asserted_by: string | null;
  revoked_by: string | null;
  assertion_capsule_hash: string | null;
  revocation_capsule_hash: string | null;
}

export class ConsentObserver {
  private state: ConsentState = "NONE";
  private scope: string | null = null;
  private assertedBy: string | null = null;
  private revokedBy: string | null = null;
  private assertionCapsule: string | null = null;
  private revocationCapsule: string | null = null;

  onCapsule(entry: HarnessTraceEntry): void {
    const type = entry.capsule.capsule_type;

    if (type === "CONSENT_ASSERTION") {
      const payload = this.extractPayload(entry);

      this.state = "ASSERTED";
      this.scope = payload.scope ?? null;
      this.assertedBy = payload.asserted_by ?? null;
      this.revokedBy = null;
      this.assertionCapsule = entry.capsule.capsule_hash ?? null;
      this.revocationCapsule = null;
    }

    if (type === "POLICY_REVOCATION") {
      // Policy revocation may also revoke consent if explicitly scoped
      const payload = this.extractPayload(entry);

      if (payload.revokes_consent === true) {
        this.state = "REVOKED";
        this.revokedBy = payload.revoked_by ?? null;
        this.revocationCapsule = entry.capsule.capsule_hash ?? null;
      }
    }
  }

  snapshot(): ConsentSnapshot {
    return {
      state: this.state,
      scope: this.scope,
      asserted_by: this.assertedBy,
      revoked_by: this.revokedBy,
      assertion_capsule_hash: this.assertionCapsule,
      revocation_capsule_hash: this.revocationCapsule,
    };
  }

  private extractPayload(entry: HarnessTraceEntry): any {
    // Payload is already validated by schema; observer treats it as opaque JSON
    const capsule: any = entry as any;
    return capsule?.capsule?.payload ?? {};
  }
}
