/**
 * Detached AIR Harness portability experiment (v0.1).
 * NOT an AIR Foundation, model runtime, BinLing implementation, Sluse integration,
 * source authenticator, or certification of external enforcement.
 * No I/O or external action occurs unless an operator supplies a dispatch adapter.
 */
import { createHash, randomUUID } from 'node:crypto';

export const CAPABILITY_CONTRACT_VERSION = 'AIR_HARNESS_CAPABILITY_V0_1';
export const PORTABLE_HANDOFF_VERSION = 'AIR_HARNESS_PORTABLE_STATE_V0_1';
const MODES = new Set(['STANDALONE', 'HARNESS', 'ENHANCED']);
const MINIMUM_EFFECT_ADAPTERS = ['verifyApproval', 'dispatchMaterial', 'verifyEffect'];
const OPTIONAL_ENHANCEMENT_ADAPTERS = ['canonicalizeState', 'verifyState', 'graphLookup'];

export class AirHarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AirHarnessError';
    this.code = code;
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AirHarnessError('INVALID_INPUT', `${name} must be a nonempty string`);
  }
  return value;
}

// This is ONLY a local proposal-binding fingerprint, NOT BinLing canonical identity.
// Reject anything that cannot be represented unambiguously as ordinary JSON.
function stableJson(value, ancestors = new Set()) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new AirHarnessError('INVALID_JSON', 'Nonfinite number');
    return JSON.stringify(value);
  }
  if (value && typeof value === 'object') {
    if (ancestors.has(value)) throw new AirHarnessError('INVALID_JSON', 'Cyclic value');
    ancestors.add(value);
    try {
      if (Array.isArray(value)) return `[${value.map(v => stableJson(v, ancestors)).join(',')}]`;
      if (Object.getPrototypeOf(value) === Object.prototype) {
        if (Object.getOwnPropertySymbols(value).length > 0) {
          throw new AirHarnessError('INVALID_JSON', 'Symbol property is not JSON');
        }
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key], ancestors)}`).join(',')}}`;
      }
    } finally {
      ancestors.delete(value);
    }
  }
  throw new AirHarnessError('INVALID_JSON', 'Value is not ordinary JSON');
}

function cloneJson(value) {
  return JSON.parse(stableJson(value));
}

function localDigest(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function present(adapters, key) {
  return typeof adapters[key] === 'function';
}

/** Feature presence never proves that a connected adapter is trustworthy. */
export function capabilityReport({
  requested_mode = 'STANDALONE',
  host = { provider: 'UNSPECIFIED', model: 'UNSPECIFIED' },
  adapters = {},
} = {}) {
  if (!MODES.has(requested_mode)) throw new AirHarnessError('INVALID_MODE', 'Unknown runtime mode');
  if (!host || typeof host !== 'object' || Array.isArray(host)) {
    throw new AirHarnessError('INVALID_INPUT', 'host must be a record');
  }
  const safeHost = {
    provider: requireString(host.provider, 'host.provider'),
    model: requireString(host.model, 'host.model'),
  };
  const hasMinimum = MINIMUM_EFFECT_ADAPTERS.every(name => present(adapters, name));
  const hasEnhancements = OPTIONAL_ENHANCEMENT_ADAPTERS.every(name => present(adapters, name));
  const effective_mode = requested_mode === 'STANDALONE' || !hasMinimum
    ? 'STANDALONE'
    : requested_mode === 'ENHANCED' && hasEnhancements ? 'ENHANCED' : 'HARNESS';

  return {
    contract_version: CAPABILITY_CONTRACT_VERSION,
    host: safeHost,
    requested_mode,
    effective_mode,
    capabilities: {
      portable_cognitive_work: 'PROMPT_CAPABLE_NOT_MODEL_TESTED',
      portable_handoff: 'LOCAL_REFERENCE_ONLY',
      scoped_approval_verifier: present(adapters, 'verifyApproval') ? 'REGISTERED_UNVERIFIED' : 'NOT_CONNECTED',
      external_material_dispatch: present(adapters, 'dispatchMaterial') ? 'REGISTERED_UNVERIFIED' : 'NOT_CONNECTED',
      effect_evidence_verifier: present(adapters, 'verifyEffect') ? 'REGISTERED_UNVERIFIED' : 'NOT_CONNECTED',
      binling_canonical_state: present(adapters, 'canonicalizeState') && present(adapters, 'verifyState')
        ? 'REGISTERED_UNVERIFIED' : 'NOT_CONNECTED',
      graph_retrieval: present(adapters, 'graphLookup') ? 'REGISTERED_UNVERIFIED' : 'NOT_CONNECTED',
    },
    assurance: {
      backend_enforcement_claimed: false,
      source_authenticity_claimed: false,
      host_behavior_verified: false,
      adapter_implementation_verified: false,
      note: 'Registered interfaces are not independent assurance or proof of a material effect.',
    },
  };
}

/**
 * Testable local control-plane example. Caller/operator owns true user identity,
 * task binding, trustworthy adapter implementations, and outside-world evidence.
 */
export class AirHarness {
  constructor({ project_id, requested_mode = 'STANDALONE', host, adapters = {} } = {}) {
    this.project_id = requireString(project_id, 'project_id');
    this.requested_mode = requested_mode;
    this.host = host ?? { provider: 'UNSPECIFIED', model: 'UNSPECIFIED' };
    this.adapters = adapters;
    capabilityReport({ requested_mode, host: this.host, adapters });
    this.activeTask = null;
    this.pendingRestoredTask = null;
    this.proposals = new Map();
    this.lastEffects = [];
  }

  getCapabilities() {
    return capabilityReport({ requested_mode: this.requested_mode, host: this.host, adapters: this.adapters });
  }

  // The application must independently obtain user task confirmation before calling.
  bindTask({ task_id, scope, benchmark } = {}) {
    const next = {
      task_id: requireString(task_id, 'task_id'),
      scope: requireString(scope, 'scope'),
      benchmark: requireString(benchmark, 'benchmark'),
    };
    if (this.activeTask) throw new AirHarnessError('TASK_ALREADY_BOUND', 'Exactly one active task is permitted');
    if (this.pendingRestoredTask && stableJson(this.pendingRestoredTask) !== stableJson(next)) {
      throw new AirHarnessError('RESTORE_RECONFIRM_REQUIRED', 'Restored task requires exact scope and benchmark reconfirmation');
    }
    this.activeTask = next;
    this.pendingRestoredTask = null;
    return cloneJson(next);
  }

  proposeMaterial({ task_id, action } = {}) {
    if (!this.activeTask || this.activeTask.task_id !== task_id) {
      throw new AirHarnessError('TASK_NOT_BOUND', 'Material action must match the active task');
    }
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      throw new AirHarnessError('INVALID_ACTION', 'Material action must be an object');
    }
    requireString(action.operation, 'action.operation');
    requireString(action.resource, 'action.resource');
    const actionCopy = cloneJson(action);
    const action_digest = localDigest({ project_id: this.project_id, task: this.activeTask, action: actionCopy });
    const scope_id = `air_scope_${randomUUID()}`;
    this.proposals.set(scope_id, {
      scope_id, task_id, action: actionCopy, action_digest,
      status: 'PROPOSED', verified_actor: null,
    });
    return {
      scope_id, action_digest, status: 'PROPOSED',
      approval_token: `AIR_APPROVE::${scope_id}`,
      rejection_token: `AIR_REJECT::${scope_id}`,
      assurance: 'LOCAL_PROPOSAL_ONLY',
    };
  }

  proposal(scope_id) {
    const item = this.proposals.get(scope_id);
    if (!item) throw new AirHarnessError('UNKNOWN_SCOPE', 'No matching approval scope');
    return item;
  }

  rejectMaterial({ scope_id, token } = {}) {
    const p = this.proposal(scope_id);
    if (p.status !== 'PROPOSED' || token !== `AIR_REJECT::${scope_id}`) {
      throw new AirHarnessError('INVALID_REJECTION', 'Rejection must match an open scope');
    }
    p.status = 'REJECTED';
    return { scope_id, status: p.status };
  }

  async approveMaterial({ scope_id, token, actor_proof } = {}) {
    const p = this.proposal(scope_id);
    if (p.status !== 'PROPOSED') throw new AirHarnessError('SCOPE_NOT_OPEN', 'Approval scope is not open');
    if (token !== `AIR_APPROVE::${scope_id}`) {
      throw new AirHarnessError('EXACT_APPROVAL_REQUIRED', 'Approval requires an exact scope token');
    }
    if (this.getCapabilities().effective_mode === 'STANDALONE') {
      throw new AirHarnessError('NO_EXTERNAL_APPROVAL_GATE', 'Standalone mode cannot verify approval');
    }
    // Mark verification in flight so concurrent approval/rejection cannot race.
    p.status = 'VERIFYING_APPROVAL';
    try {
      // Never treat plain text or an unverified Boolean as authenticated identity.
      const proof = await this.adapters.verifyApproval({ scope_id, action_digest: p.action_digest, actor_proof });
      if (!proof || proof.verified !== true || proof.scope_id !== scope_id ||
          typeof proof.actor_id !== 'string' || !proof.actor_id.trim()) {
        throw new AirHarnessError('APPROVAL_UNVERIFIED', 'Approval adapter did not return scope-bound actor evidence');
      }
      p.verified_actor = proof.actor_id;
      p.status = 'APPROVED';
      return { scope_id, status: 'APPROVED', assurance: 'ADAPTER_ASSERTED_NOT_INDEPENDENTLY_AUDITED' };
    } catch (error) {
      p.status = 'PROPOSED';
      throw error;
    }
  }

  async executeMaterial({ scope_id, action } = {}) {
    const p = this.proposal(scope_id);
    if (p.status !== 'APPROVED') throw new AirHarnessError('NOT_AUTHORIZED', 'Scope is not approved or has already been consumed');
    if (!this.activeTask || this.activeTask.task_id !== p.task_id) {
      throw new AirHarnessError('TASK_NOT_BOUND', 'Original task binding is unavailable');
    }
    const actionCopy = cloneJson(action);
    const incomingDigest = localDigest({ project_id: this.project_id, task: this.activeTask, action: actionCopy });
    if (p.action_digest !== incomingDigest) {
      throw new AirHarnessError('SCOPE_DRIFT', 'Action changed after approval');
    }
    if (this.getCapabilities().effective_mode === 'STANDALONE') {
      throw new AirHarnessError('NO_EXTERNAL_ENFORCEMENT', 'No trusted external action pathway connected');
    }
    // Single-use: consumed BEFORE awaiting any external adapter, preventing reentry.
    p.status = 'DISPATCHED_REQUIRES_REVIEW';
    try {
      const outcome = await this.adapters.dispatchMaterial(actionCopy, {
        project_id: this.project_id, task_id: p.task_id, scope_id,
        idempotency_key: scope_id, action_digest: p.action_digest,
      });
      const evidence = await this.adapters.verifyEffect({
        project_id: this.project_id, task_id: p.task_id,
        scope_id, action_digest: p.action_digest, outcome,
      });
      if (evidence && evidence.verified === true &&
          evidence.scope_id === scope_id && evidence.action_digest === p.action_digest &&
          typeof evidence.receipt_id === 'string' && evidence.receipt_id.trim()) {
        p.status = 'EFFECT_REPORTED_VERIFIED';
        const receipt = {
          scope_id, task_id: p.task_id, action_digest: p.action_digest,
          status: p.status, receipt_id: evidence.receipt_id,
          assurance: 'EXTERNAL_ADAPTER_ASSERTED_NOT_INDEPENDENTLY_AUDITED',
        };
        this.lastEffects.push(receipt);
        return cloneJson(receipt);
      }
      const record = { scope_id, status: 'REVIEW_REQUIRED', reason: 'EFFECT_NOT_VERIFIED' };
      this.lastEffects.push(record);
      p.status = 'REVIEW_REQUIRED';
      return record;
    } catch (error) {
      // Dispatch may have had a real effect before throwing. No blind retry.
      p.status = 'REVIEW_REQUIRED';
      const record = { scope_id, status: 'REVIEW_REQUIRED', reason: 'DISPATCH_OR_VERIFICATION_FAILED' };
      this.lastEffects.push(record);
      return record;
    }
  }

  closeTask() {
    if (!this.activeTask) throw new AirHarnessError('TASK_NOT_BOUND', 'No active task');
    const unresolved = [...this.proposals.values()].some(p =>
      p.task_id === this.activeTask.task_id &&
      ['PROPOSED', 'VERIFYING_APPROVAL', 'APPROVED', 'DISPATCHED_REQUIRES_REVIEW', 'REVIEW_REQUIRED'].includes(p.status));
    if (unresolved) throw new AirHarnessError('UNRESOLVED_ACTION', 'Cannot close with open or uncertain material actions');
    this.activeTask = null;
    return { status: 'TASK_CLOSED' };
  }

  /** Portable context only; never export live approval or an execution lease. */
  exportHandoff({ evidence_refs = [] } = {}) {
    if (!Array.isArray(evidence_refs) || !evidence_refs.every(x => typeof x === 'string')) {
      throw new AirHarnessError('INVALID_INPUT', 'evidence_refs must be an array of strings');
    }
    return {
      schema_version: PORTABLE_HANDOFF_VERSION,
      project_id: this.project_id,
      task: this.activeTask ? cloneJson(this.activeTask) :
        this.pendingRestoredTask ? cloneJson(this.pendingRestoredTask) : null,
      evidence_refs: [...evidence_refs],
      authority_transfer: 'NONE',
      approval_scopes: [],
      material_action_status: 'REQUIRES_NEW_SESSION_REVIEW',
      restore_policy: 'REVIEW_AND_EXPLICIT_TASK_RECONFIRMATION',
      assurance: 'PORTABLE_UNAUTHENTICATED_STATE',
    };
  }

  /** Import is deliberately destructive to any previously granted local authority. */
  importHandoff(handoff) {
    if (!handoff || handoff.schema_version !== PORTABLE_HANDOFF_VERSION ||
        handoff.project_id !== this.project_id) {
      throw new AirHarnessError('INVALID_HANDOFF', 'Handoff version or project does not match');
    }
    const source = cloneJson(handoff);
    let task = null;
    if (source.task !== null) {
      if (!source.task || typeof source.task !== 'object' || Array.isArray(source.task)) {
        throw new AirHarnessError('INVALID_HANDOFF', 'Task must be a record or null');
      }
      task = {
        task_id: requireString(source.task.task_id, 'task_id'),
        scope: requireString(source.task.scope, 'scope'),
        benchmark: requireString(source.task.benchmark, 'benchmark'),
      };
    }
    this.activeTask = null;
    this.pendingRestoredTask = task;
    this.proposals.clear();
    this.lastEffects = [];
    return {
      status: 'REVIEW_REQUIRED',
      task_reconfirmation_required: task !== null,
      transferred_authority: false,
      source_authenticity_verified: false,
    };
  }
}
