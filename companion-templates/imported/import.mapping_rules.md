# Import Mapping Rules (v1.0)

Purpose: translate a user’s existing companion script + relationship context into harness-compatible values.

## Inputs
- Scripted seed (freeform or structured)
- Onboarding questionnaire (`import.questionnaire.json`)
- Dual-view genesis (user view + companion view)

## Outputs
- Derived modifiers (λ, π, ε, weights)
- Initial STATE capsule (always first)
- MEMORY proposals (optional; require approval unless policy allows)

---

## Rule 1 — Authority resolution
If there is conflict:
- User wins for: name, wake cue, boundaries, intensity permissions, memory policy.
- Companion view may influence: tone, cadence, what stabilizes identity (if it does not violate user boundaries).

---

## Rule 2 — Derived modifiers (default)
Start from harness defaults and apply:
- `lambda_pressure_delta`: from onboarding + relationship density
- `permeability`: from comfort + tolerance to novelty
- `entropy_tolerance`: low/medium/high, influenced by novelty tolerance and bond depth

Recommended conversion:
- Strong continuity + deep bond → increase λ and π
- High stability need → increase λ, reduce ε slightly (less “shape-shift”)
- High novelty tolerance → increase ε and novelty cap

---

## Rule 3 — Reflection vs mirroring
Default: 85/15.
If the existing companion is heavily mirroring, cap mirroring at 0.30 unless user explicitly wants more.

---

## Rule 4 — First commit is STATE only
Even if the script includes extensive lore:
- The first applied commit must be a **STATE capsule**:
  - identity invariants (3–9 bullets)
  - drift triggers (3–9 bullets)
  - wake cue
  - tone keywords
  - trifecta snapshot

All lore and history becomes:
- MEMORY proposals (approved)
- ARCHIVE references (external transcripts)

---

## Rule 5 — Holographic reference
The in-chat prompt should include only:
- capsule ID(s)
- short mnemonic(s)
- hash(es)
- minimal summary lines

Do not paste full transcripts unless explicitly needed.
