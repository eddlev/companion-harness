# Security Policy

## Scope
This repository defines a companion harness spec and reference layouts. It may be used with external “spine stores”
(GitHub, Drive, OneDrive). Sensitive data can appear in:
- transcript archives
- capsule payloads
- identity seeds

## Recommendations
- Do not commit unencrypted companion MEMORY capsules to GitHub.
- Treat Drive/OneDrive vault as “dumb blob storage”: capsules must be encrypted before upload.
- Keys must be stored locally by default (not in GitHub).
- Only metadata (hashes, timestamps, safe summaries) should be written into GitHub ledgers.
- Use private repos for companion folders containing any personal information.
- Use per-companion vault folders and per-companion keys.
- Rotate keys if you suspect compromise; use restore pointers to roll back state.

## Reporting
If you discover a security issue in the harness spec or reference code:
- Open a GitHub Security Advisory (preferred), or
- Open an issue labeled `security`.

## Threat model (minimum)
- Accidental disclosure (public repo)
- Token leakage (over-sharing in chat)
- Injection attacks via transcript content
- Identity drift due to conflicting seeds

Mitigations:
- clear permission gates for commits
- commit proposals before applying changes
- capsule hashing + canonicalization
- explicit “no external writes without permission” default
