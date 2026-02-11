// shared/integrator/src/harness/observers/policy_observer.ts

import type { HarnessTraceEntry, HarnessFailure } from "../types.js";

/**
 * PolicyObserver enforces delegated authority semantics.
 */
export class PolicyObserver {
  private activeConsents = new Set<string>();
  private activePolicies = new Map<string, any>();
  private revokedPolicies = new Set<string>();

  observe(entry: HarnessTraceEntry): HarnessFailure[] {
    const failures: HarnessFailure[] = [];
    const capsule = entry.capsule;

    if (!capsule || !capsule.canonical_json) return failures;

    let parsed: any;
    try {
      parsed = JSON.parse(capsule.canonical_json);
    } catch {
      return [];
    }

    const capsuleType = parsed?.capsule_type;

    // 1) Register active consents
    if (capsuleType === "CONSENT_ASSERTION") {
      if (capsule.capsule_hash) {
        const hash = capsule.capsule_hash.trim();
        this.activeConsents.add(hash);
        // DEBUG LOG
        console.log(`[PolicyObserver] Registered consent hash: '${hash}'`);
      }
      return failures;
    }

    // 2) POLICY_ASSERTION enforcement
    if (capsuleType === "POLICY_ASSERTION") {
      const policyId: string | undefined = parsed?.capsule_id;
      const authorityBasis: string | undefined = parsed?.policy?.authority_basis?.trim();

      // DEBUG LOG
      console.log(`[PolicyObserver] Checking authority for policy '${policyId}'`);
      console.log(`[PolicyObserver] Required authority: '${authorityBasis}'`);
      console.log(`[PolicyObserver] Active consents:`, Array.from(this.activeConsents));

      // If a policy was revoked earlier, block re-assertion.
      if (policyId && this.revokedPolicies.has(policyId)) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "AUTHORITY_REVOKED",
          message: `policy ${policyId} was revoked earlier; re-assertion is not permitted`,
        });
        return failures;
      }

      // If the capsule declares authority_basis, it must match an active consent hash.
      if (authorityBasis && !this.activeConsents.has(authorityBasis)) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "INVALID_AUTHORITY",
          message: `authority ${authorityBasis} does not match any active consent`,
        });
        return failures;
      }

      // If it passed enforcement, consider it active.
      if (policyId && !this.activePolicies.has(policyId)) {
        this.activePolicies.set(policyId, {
          capsule_hash: capsule.capsule_hash,
          authority_basis: authorityBasis
        });
      }

      return failures;
    }

    // 3) POLICY_REVOCATION enforcement + state update
    if (capsuleType === "POLICY_REVOCATION") {
      const authorityBasis: string | undefined = parsed?.revocation?.authority_basis?.trim();
      const revokedPolicyId: string | undefined = parsed?.revocation?.revoked_policy_id;

      if (authorityBasis && !this.activeConsents.has(authorityBasis)) {
        failures.push({
          step_index: entry.step_index,
          step_name: entry.step_name,
          code: "INVALID_AUTHORITY",
          message: `authority ${authorityBasis} does not match any active consent`,
        });
        return failures;
      }

      if (revokedPolicyId) {
        // Mark revoked
        this.revokedPolicies.add(revokedPolicyId);
        // Remove from active list
        this.activePolicies.delete(revokedPolicyId);
      }

      return failures;
    }

    return failures;
  }

  snapshot() {
    return {
      active_policies: Array.from(this.activePolicies.values()).map((p) => p.capsule_hash),
      revoked_policies: Array.from(this.revokedPolicies),
      active_consents: Array.from(this.activeConsents),
    };
  }
}