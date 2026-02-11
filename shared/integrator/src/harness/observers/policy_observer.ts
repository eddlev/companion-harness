// shared/integrator/src/harness/observers/policy_observer.ts

import type {
  HarnessTraceEntry,
  HarnessFailure,
} from "../types.js";

interface ActivePolicy {
  capsule_hash: string;
  authority_basis: string;
}

export class PolicyObserver {
  private activePolicies = new Map<string, ActivePolicy>();
  private activeConsents = new Set<string>();
  private revokedPolicies: string[] = [];

  observe(entry: HarnessTraceEntry): HarnessFailure[] {
    const failures: HarnessFailure[] = [];
    const capsule = entry.capsule;

    if (!capsule || !capsule.canonical_json) {
      return failures;
    }

    const payload = JSON.parse(capsule.canonical_json);
    const type = capsule.capsule_type;

    if (type === "CONSENT_ASSERTION") {
      if (capsule.capsule_hash) {
        this.activeConsents.add(capsule.capsule_hash);
      }
      return failures;
    }

    if (type === "POLICY_ASSERTION") {
      const authority = payload.policy?.authority_basis;

      if (!authority) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "MISSING_AUTHORITY",
          message: "policy assertion requires delegated authority",
        });
        return failures;
      }

      if (!this.activeConsents.has(authority)) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "INVALID_AUTHORITY",
          message: `authority ${authority} does not match any active consent`,
        });
        return failures;
      }

      if (capsule.capsule_hash) {
        this.activePolicies.set(payload.capsule_id, {
          capsule_hash: capsule.capsule_hash,
          authority_basis: authority,
        });
      }
    }

    if (type === "POLICY_REVOCATION") {
      const revokedId = payload.revocation?.revoked_policy_id;
      const authority = payload.revocation?.authority_basis;

      if (!revokedId || !authority) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "MISSING_AUTHORITY",
          message: "policy revocation requires authority and policy id",
        });
        return failures;
      }

      if (!this.activeConsents.has(authority)) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "INVALID_AUTHORITY",
          message: `authority ${authority} does not match any active consent`,
        });
        return failures;
      }

      if (!this.activePolicies.has(revokedId)) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "UNKNOWN_POLICY",
          message: "cannot revoke unknown or inactive policy",
        });
        return failures;
      }

      this.activePolicies.delete(revokedId);
      this.revokedPolicies.push(revokedId);
    }

    return failures;
  }

  snapshot() {
    return {
      active_policies: Array.from(this.activePolicies.values()).map(
        (p) => p.capsule_hash
      ),
      revoked_policies: this.revokedPolicies,
      active_consents: Array.from(this.activeConsents),
    };
  }
}
