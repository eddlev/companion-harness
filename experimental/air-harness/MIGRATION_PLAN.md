# AIR Harness migration plan — experimental, non-authorizing

## Refactoring map

| Companion Harness component | AIR target | Status |
| --- | --- | --- |
| Companion identity/genesis | AIR Foundation and project onboarding | Not implemented |
| Relational geometry / trust / intimacy modules | Remove from AIR normative runtime | Excluded in experiment |
| External spine capsules | Project state, references and review-only handoff | Small local prototype |
| Holographic Indexer / retriever | Evidence-linked task retrieval | Not implemented |
| Dreamer / macro-beliefs | Scoped MII contributions with nonauthority boundary | Not implemented |
| Consent / Policy observers | Scope-bound authorization and state transitions | Local controller only |
| HarnessRunner | Pre-dispatch approval and independent effect checks | Local controller only |
| BinLing adapter | Separately verified canonical state identity | Interface only |
| Graphify | Optional read-only graph and dependency search | Interface only |
| Browser / host bridge | Adapter-based provider independence | Not implemented |

## Mandatory invariants

1. Portable AIR Foundation still works without this harness; no runtime-host dependency may be introduced.
2. State references and retrieved data never authorize external actions.
3. Exact scoped approval must be independently authenticated and tied to the original task/action digest.
4. Material effects must pass pre-dispatch gates and separately observed outcome checks.
5. No handoff transfers approval, lease, actor authority, or effect attestation.
6. Missing capabilities and uncertain outcomes must remain explicitly unverified.
7. Canonicalization belongs to the independently tested BinLing contract, not this experimental SHA fingerprint.
8. No released AIR Kit, R135 baseline, Sluse, or existing companion behavior is changed by the experiment.

## Acceptance gates

| Gate | Status |
| --- | --- |
| G0 Detached branch, no edits to main | Branch created; audit before adoption |
| G1 Local control-plane tests, simulated adapters | Executed locally; rerunnable tests in this folder |
| G2 Strict schema validation, negative mutations | Not run |
| G3 Genuine BinLing canonicalization and cross-host fixtures | Not connected |
| G4 Authenticated broker, tamper-evident evidence, durable idempotency | Not implemented |
| G5 AIR standalone and harness live model-host comparisons | Not run |
| G6 AIR release law/behavior regression against source | Not run |
| G7 Graphify optional privacy/provenance evaluation | Not run |
| G8 Human-approved adoption after evidence and licensing review | Not approved |

**Before live execution** reconcile the original Companion Harness's post-dispatch checks, time-incorrect observer snapshots, revocation handling and competing canonicalization paths. Do not attach a side-effecting adapter to legacy `HarnessRunner` without that review.

## v0.2 checkpoint

- **Implemented in detached branch:** separated local development hashing and unverified external BinLing adapter assertions; handoff state envelope and review-only restore; Graphify no longer required for ENHANCED mode.
- **Not implemented:** direct Rust VM bridge; signed source and actor authentication; durable idempotency; executable policy-core verification; complete R23/R135 reconciliation; real host acceptance; external adapter validation; real-environment runner acceptance.
- **Evidence limitation:** the committed state-integrity test suite is present but has not been executed against a checked-out GitHub branch; development reference had 17/17 local tests. Run `npm test` in a clean checkout before acceptance.
