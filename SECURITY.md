# Security Policy

## Scope
This repository defines a companion harness spec and reference layouts. It may be used with external “spine stores”
(GitHub, Drive, OneDrive). Sensitive data can appear in:
- transcript archives
- capsule payloads
- identity seeds

## Recommendations
- Treat all spine capsules as sensitive by default.
- Use private repos for real companions.
- Avoid committing raw transcripts in public.
- Prefer capsule summaries + hashes + HREF references over full text dumps.
- If you store real relationship content, encrypt capsule payloads at rest (client-side).

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
