# BinLing Adapter (companion-harness)

This folder is the production adapter layer between the companion-harness integrator and the BinLing library.

## Purpose

- Provide canonicalization + hashing (policy_hash / capsule_hash) used by the harness protocol.
- Provide HREF (Holographic Reference) encode/parse utilities.
- Insulate the rest of the harness from direct BinLing coupling.

## Dependency policy

This adapter requires `@noble/hashes`.

Install from the integrator root:

```bash
cd shared/integrator
npm i
