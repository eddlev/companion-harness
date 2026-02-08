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
The lockfile (package-lock.json) must be committed for reproducible installs.

Runtime policy
This adapter must remain deterministic across platforms.

Hashing must be stable across environments (canonical JSON + NFC normalization + deterministic number rendering).

Do not import non-exported subpaths from dependencies. Only use exported entrypoints.


### 2) Dependency + scripts policy (what you do now)
- **Do NOT** add `package.json` or `package-lock.json` to `.gitignore`
- Verify `shared/integrator/package.json` includes:
  - `dependencies: { "@noble/hashes": ... }`
  - `scripts.smoke` pointing to your smoke test
- Commit both files.

### 3) Test / verification for Step 1
Run (from `shared/integrator`):
- `npm ci`
- `npm run smoke`

### Completion criteria
Step 1 is complete when:
- README exists at the correct path
- `npm ci` succeeds
- `npm run smoke` succeeds
- changes are committed + pushed

When you’ve done that, paste the `git status` output and the smoke output (just the final lines). Then we proceed to **Step 2: `tsconfig.json`**.
::contentReference[oaicite:0]{index=0}
