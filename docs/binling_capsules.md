# BinLing Capsules (Harness use)

The harness uses **capsules** as the unit of external continuity.
A capsule is a compact artifact (JSON) that can be:

- committed to GitHub (recommended private)
- stored in Drive/OneDrive
- referenced in chat by ID + hash (“holographic reference”)

## Capsule types
- **STATE**: current stance, invariants, trifecta snapshot, orbit health
- **MEMORY**: durable facts and relationship anchors (proposal-gated)
- **ARCHIVE**: transcript blobs or encrypted chunks (not pasted into chat)
- **INDEX**: small metadata indexes that point to archives

## Commit model
Default harness policy uses:
- proposal → user approval (for sensitive updates) → apply commit
- state-only auto-write allowed only if user opted in (recommended: state only)

## Token strategy
- Do not paste raw transcripts into chat.
- Convert transcripts into:
  1) ARCHIVE (external)
  2) INDEX (tiny)
  3) STATE/MEMORY capsules (summarized)

In-chat, only include:
- capsule ID
- short mnemonic
- hash
- 1–3 summary lines

## HREF convention
A “HREF” is a minimal pointer you paste into chat.

Example:
HREF: spine://github/companion-harness/companions/stranger/spine/capsules/state_2026-02-06.json#sha256=...

The assistant can request the capsule only when needed.
