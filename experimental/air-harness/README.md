# AIR Harness — detached portability experiment v0.1

**Not an AIR Foundation release, production execution gate, BinLing VM, Sluse implementation, or Graphify integration.** This opt-in experiment leaves the original Companion Harness and `main` unchanged.

## Purpose and architecture

AIR's portable prompt-based cognitive workflow remains independent of this Node.js harness. The harness is an optional external control plane. No backend enforcement or cross-model behavior may be claimed without observed evidence.

- **STANDALONE:** AIR Foundation on a compatible AI host, without software installation. This library can describe this mode but does not execute the AIR Foundation or prove host conformance.
- **HARNESS:** operator-supplied verification, dispatch and effect-evidence adapters. Registered interfaces are unverified and do not constitute independent assurance.
- **ENHANCED:** above, plus registered canonical-state and optional graph adapters. Neither BinLing nor Graphify is implemented here.

`src/air-harness.mjs` contains a reference scope-bound proposal controller, task binding, explicit scoped approval tokens, local proposal digest (not a BinLing canonical identity), single-use in-process dispatch, review-required uncertain effects, and portable handoff with **no transferred execution authority**.

**Security limits:** An adapter must genuinely authenticate the actor, enforce the action scope, mediate all actual tool side effects, and observe evidence independently. This code does not provide authenticated identity, durable replay defense after process restart, cryptographic receipt attestation, externally enforced tool interception, or independent host testing. The adapter callbacks in tests are *mocks*.

The API deliberately treats any imported handoff as an unauthenticated source and requires task scope and benchmark reconfirmation. It does not deserialize approvals. A registered callback is not a verified trustworthy adapter.

Run local tests using Node >=20, with no npm dependencies:

```bash
cd experimental/air-harness
npm test
```

The JSON Schemas in `contracts/` are contract declarations; strict runtime JSON Schema enforcement is not connected.

## Source boundaries

- AIR Kit v0.8.0 R23 is the published independent prompt framework: https://github.com/eddlev/vm4ai-air-kit
- AIR-P Minimal R2 and R135 are detached references, not automatically interchangeable with R23.
- Companion Harness ↔ BinLing contract remains separate: https://github.com/eddlev/companion-harness/blob/main/docs/contracts/capsule_binling_contract.md
- Graphify is optional and read-only in the proposed architecture.
- The repository is AGPL-3.0; AIR Kit is Apache-2.0. Legal/license review required before combining software.

See `MIGRATION_PLAN.md` for incomplete work and acceptance gates.
