# Spine Memory Protocol (External)

Spine memory is stored externally as capsules (compressed), not raw transcripts.
A session produces:
- a capsule proposal (what to add/change)
- a commit object (applied change) after user approval OR policy-gated automation

Recommended:
- GitHub private repo (monorepo, folders per companion)
- commits signed (optional)
- capsule content encrypted (optional)

In-chat, you reference spine capsules holographically:
- provide capsule ID + short mnemonic + hash
- only unpack when needed
