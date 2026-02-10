# Capsule ↔ BinLing Contract
Version: 1.0  
Status: Active  
Scope: Companion-Harness

---

## 1. Purpose

This document defines the authoritative contract between:

- **JSON Capsules** produced and consumed by Companion-Harness, and
- **BinLing Capsules (BLE)** executed within the BinLing VM.

The goal of this contract is to guarantee:
- Deterministic identity
- Token-minimal addressing
- Vendor-agnostic portability
- Fail-closed execution semantics

This contract is binding for all future development.

---

## 2. Non-Goals

This contract explicitly does NOT define:
- UI behavior
- Conversational tone
- Model-specific optimizations
- Execution geometry or lattice layout
- Memory storage implementation

Those concerns are out of scope.

---

## 3. Two-Capsule Model

The system intentionally uses **two distinct capsule forms**.

### 3.1 JSON Capsule (Companion-Harness)

**Role**
- Governance
- Auditability
- Transport
- Human inspection
- Schema validation

**Properties**
- JSON encoded
- Versioned
- Schema-validated
- Not executable
- Reducible

This capsule exists **outside** the BinLing VM boundary.

---

### 3.2 BinLing Capsule (BLE)

**Role**
- Deterministic execution
- Canonical addressing
- Symbolic compression
- Fail-closed semantics

**Properties**
- Byte-oriented
- Canonicalized
- Opaque
- Executable
- Deterministic

This capsule exists **inside** the BinLing VM boundary.

The two capsule types MUST NOT be conflated.

---

## 4. Canonical Responsibility Split

| Stage | Responsible Component |
|-----|-----------------------|
| Capsule creation | Human / AI / Harness |
| Schema validation | Companion-Harness |
| Canonicalization | BinLing |
| Identity derivation | BinLing |
| Execution | BinLing VM |

Companion-Harness MUST NOT attempt to define canonical form.

---

## 5. Authoritative Hash Definition

The `hash` field of a JSON Capsule is defined as:

> **The cryptographic digest of the BinLing-canonicalized form of the payload.**

Formally:

hash = H( Canonicalize(payload) )


Where:
- Canonicalization uses BinLing rules
- Hash algorithm is defined by BinLing
- JSON structure, ordering, metadata, or timestamps are excluded

Hashing the JSON document itself is forbidden.

---

## 6. Capsule Field Semantics

### 6.1 capsule_version
- Governs JSON capsule schema evolution
- Does not affect identity
- Must not be hashed

---

### 6.2 capsule_type
- Declares intent class (e.g. memory request, policy assertion)
- Guides payload reduction
- Does not affect identity directly

---

### 6.3 id
- Stable identifier derived from BinLing hash
- Recommended form:

<capsule_type>:<binling_hash>


- Must remain stable across transports

---

### 6.4 created_at
- Audit metadata only
- Must not affect identity or execution
- Must not be hashed

---

### 6.5 hash
- Deterministic identity anchor
- Derived exclusively from BinLing canonical form
- Must be reproducible across environments

---

### 6.6 payload
- Human-readable intent
- Schema-validated if applicable
- Reducible to canonical form
- Not executable

---

## 7. Explicit Prohibitions

JSON Capsules MUST NOT:
- Encode BinLing instructions
- Reference lattice coordinates
- Include execution geometry
- Transport memory contents
- Depend on vendor-specific model behavior

---

## 8. Portability Guarantee

A valid capsule conforming to this contract MUST:
- Remain valid across model vendors
- Remain valid across model versions
- Remain valid across transport mechanisms
- Preserve identity under context loss

---

## 9. Failure Semantics

If:
- Payload cannot be reduced
- Canonicalization fails
- Hash mismatch occurs

Then execution MUST fail closed.

---

## 10. Contract Stability

Changes to this contract require:
- Explicit version bump
- Migration guidance
- Backward-compatibility analysis

Silent reinterpretation is forbidden.
