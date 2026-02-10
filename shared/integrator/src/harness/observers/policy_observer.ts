// shared/integrator/src/harness/observers/policy_observer.ts

import type { HarnessTraceEntry } from "../types.js";

export interface PolicyRecord {
  policy_id: string | null;
  asserted_by: string | null;
  authority_basis: string | null;
  capsule_hash: string | null;
}

export interface PolicyObserverSnapshot {
  active_policies: PolicyRecord[];
  revoked_policies: PolicyRecord[];
}

export class PolicyObserver {
  private active: PolicyRecord[] = [];
  private revoked: PolicyRecord[] = [];

  onCapsule(entry: HarnessTraceEntry): void {
    const type = entry.capsule.capsule_type;

    if (type === "POLICY_ASSERTION") {
      const payload = this.extractPayload(entry);

      const record: PolicyRecord = {
        policy_id: payload.policy_id ?? null,
        asserted_by: payload.asserted_by ?? null,
        authority_basis: payload.authority_basis ?? null,
        capsule_hash: entry.capsule.capsule_hash ?? null,
      };

      this.active.push(record);
    }

    if (type === "POLICY_REVOCATION") {
      const payload = this.extractPayload(entry);

      const revokedId = payload.policy_id ?? null;

      const remaining: PolicyRecord[] = [];
      for (const p of this.active) {
        if (revokedId !== null && p.policy_id === revokedId) {
          this.revoked.push({
            ...p,
            capsule_hash: entry.capsule.capsule_hash ?? null,
          });
        } else {
          remaining.push(p);
        }
      }

      this.active = remaining;
    }
  }

  snapshot(): PolicyObserverSnapshot {
    return {
      active_policies: [...this.active],
      revoked_policies: [...this.revoked],
    };
  }

  private extractPayload(entry: HarnessTraceEntry): any {
    const capsule: any = entry as any;
    return capsule?.capsule?.payload ?? {};
  }
}
