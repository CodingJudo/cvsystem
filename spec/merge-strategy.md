# Merge Strategy (Phase D)

> **Status:** STUB — do not fill in until both Phase C (Firebase repo analysis) and Phase B (skill-tree) are complete.  
> This document will be the output of the third planning session.

---

## Inputs required before writing this document

- [ ] `spec/firebase-merge-analysis-checklist.md` — fully completed
- [ ] Phase A (de-branding, schemas, storage abstraction, core boundary) — done
- [ ] Phase B (skill-tree, RenderSpec) — done or design frozen

---

## Sections to complete

### 1. Architecture verdict

> Copy the three Q&A answers from the Firebase analysis checklist and expand.

- Can their repo fork our base?
- Which print renderer wins?
- Which editor UI wins?

### 2. Merge approach

> One of:
> - **Fork:** Firebase repo becomes a fork of this base. They adopt our core, schemas, and `CVStorageAdapter`. They keep their Firebase adapter, theme, and deployment.
> - **Shared package:** Extract `@cvsystem/core` as an npm package. Both repos depend on it. Each keeps their own app layer.
> - **Full merge:** One unified codebase with pluggable adapters for storage, brand, and import format.

Chosen approach: _______  
Rationale: _______

### 3. Shared data schema

> Document the canonical `DomainCV` schema that both repos will use after the merge.
> Identify any fields that exist in one repo but not the other and how they are handled.

Fields to add to our schema from theirs: _______  
Fields to deprecate from our schema: _______  
Fields to add to theirs from ours: _______

### 4. Storage adapter plan

> How does the Firebase repo get a `CVStorageAdapter`?

- Firestore adapter location: _______
- `CVStorageContext.userId` mapping to Firebase Auth UID: _______
- Multi-CV per user: _______

### 5. Production data migration

> The Firebase repo has production users. This must be concrete before any merge begins.

- Migration approach (lazy / one-time script): _______
- Rollback plan: _______
- Feature flag / gradual rollout: _______

### 6. Feature reconciliation table

> Filled from the Firebase analysis checklist Section 5. For each conflicting feature, finalize the decision.

| Feature | Decision | Owner | Notes |
|---------|----------|-------|-------|
| | | | |

### 7. View and rendering reconciliation

> Which layout system, which theme system, which editor components.

### 8. Brand / theme plan

> How does the Geisli brand theme and the Firebase repo's brand coexist in the merged system?

### 9. Phased rollout

> Break the merge into safe increments that don't break either repo's production users.

Phase D1: _______  
Phase D2: _______  
Phase D3: _______

### 10. Success criteria

> How will we know the merge is complete and correct?

- [ ] _______
- [ ] _______
