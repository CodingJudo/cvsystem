# Firebase Repo — Analysis Checklist (Phase C)

> **Status:** TEMPLATE — fill in during Phase C analysis session.  
> Start Phase C once Phase A schemas and de-branding are stable.  
> **Priority probe:** answer sections 1 and 2 in the first hours, before Phase B skill-tree design freezes.

---

## Priority probes (answer first)

### P1 — Does the Firebase repo have a skill-tree / categorization concept?

> If yes, Phase B must align with their model before our design solidifies.

- [ ] Searched for: skill category, skill group, skill taxonomy, skill tree, skill node
- Finding: _______
- Impact on Phase B: _______

### P2 — What is their auth and per-user data model?

> Shapes how `CVStorageContext.userId` should be structured in the Firestore adapter.

- Auth mechanism: ☐ Firebase Auth  ☐ Custom  ☐ Anonymous  ☐ None  ☐ Other: _______
- User scoping: ☐ Per-user Firestore document  ☐ Subcollection  ☐ Flat collection with userId field  ☐ Other
- How is `userId` available at runtime? _______
- Impact on `CVStorageAdapter` interface: _______

### P3 — Do they use Cinode import?

> Expected: No. Confirm to validate our assumption that the Cinode extractor stays Geisli-specific.

- [ ] Searched codebase for "cinode", "Cinode"
- Finding: ☐ Uses Cinode  ☐ Does NOT use Cinode  ☐ Partial/unclear
- Notes: _______

---

## Section 1 — Tech stack

| Question | Answer |
|----------|--------|
| Framework | |
| React version | |
| TypeScript? | |
| UI component library | |
| State management | |
| Build tool | |
| Test framework | |
| Package manager | |

**Compatibility concerns with this base repo's stack (Next.js 16 / React 19 / Tailwind 4):**

_______

---

## Section 2 — Data model

### 2.1 CV data structure

Does a `DomainCV`-equivalent exist? What is it called?

_______

Compare each field against our `DomainCV` in `src/domain/model/cv.ts`:

| Our field | Their equivalent | Same? | Notes |
|-----------|-----------------|-------|-------|
| `id` | | | |
| `name { first, last }` | | | |
| `title: BilingualText` | | | |
| `summary: BilingualText` | | | |
| `skills: Skill[]` | | | |
| `roles: Role[]` | | | |
| `trainings: Training[]` | | | |
| `educations: Education[]` | | | |
| `commitments: Commitment[]` | | | |
| `hobbyProjects: HobbyProject[]` | | | |
| `featuredProjects: FeaturedProject[]` | | | |
| `coverPageGroups` | | | |
| `printBreakBefore` | | | |
| `skillTree` (Phase B — may not exist yet) | | | |
| `renderSpecs` (Phase B — may not exist yet) | | | |

**Fields in their model that do not exist in ours:**

| Their field | Description | Merge decision |
|-------------|-------------|---------------|
| | | |

### 2.2 Skill model

| Question | Answer |
|----------|--------|
| Is there a `Skill.level`? What scale? | |
| Is there a `years`/`calculatedYears` concept? | |
| Is there a per-role skill visibility concept? | |
| Is there a skill dedup mechanism? | |
| Is there a skill hierarchy/tree/category? | |

### 2.3 Bilingual support

| Question | Answer |
|----------|--------|
| Are fields bilingual (sv/en)? | |
| Same `BilingualText` shape `{ sv, en }`? | |
| Locale handling at render vs. store level? | |

### 2.4 Data versioning

| Question | Answer |
|----------|--------|
| Is there a schema version field? | |
| Is there a migration mechanism? | |
| File format identifier (equivalent of `"cv-system"`)? | |

---

## Section 3 — Persistence model

### 3.1 Firestore structure

Describe the Firestore collection/document structure:

```
(sketch it here — e.g.:)
/users/{userId}/cvs/{cvId}  →  CVDocument
/users/{userId}/cvs/{cvId}/roles/{roleId}  →  RoleDocument
(or flat document vs. subcollections)
```

| Question | Answer |
|----------|--------|
| Is the CV one Firestore document or split across subcollections? | |
| Real-time listeners (`onSnapshot`) or one-shot reads? | |
| Offline persistence enabled? | |
| Max document size concerns? (1 MB Firestore limit) | |

### 3.2 Implications for `CVStorageAdapter`

- Does their load/save fit the `load() / save()` async interface we designed?
- Do they need `subscribe()` (real-time updates)? If yes, our adapter interface already has an optional `subscribe`.
- Does `CVStorageContext.userId` / `cvId` match how they scope data?

Notes: _______

---

## Section 4 — Authentication

| Question | Answer |
|----------|--------|
| Auth library | |
| Sign-in methods (email, Google, etc.) | |
| Is auth required to view CVs? | |
| Is auth required to edit CVs? | |
| Are there guest/public CV sharing links? | |
| Are roles/permissions used (admin, viewer, editor)? | |

**Impact on merged system:**

_______

---

## Section 5 — Features comparison

For each feature area, decide: **keep ours / keep theirs / merge / rebuild**.

| Feature | Exists here? | Exists there? | Merge decision | Notes |
|---------|-------------|--------------|---------------|-------|
| Cinode import | ✅ Yes | ☐ | Ours only | — |
| Geisli file import/export | ✅ Yes | ☐ | | |
| Conflict resolution on import | ✅ Yes | ☐ | | |
| Bilingual SV/EN | ✅ Yes | ☐ | | |
| Print themes | ✅ Yes (3 themes) | ☐ | | |
| Paginated print layout | ✅ Yes | ☐ | | |
| Canvas/image export | ✅ Yes | ☐ | | |
| localStorage persistence | ✅ Yes | — | Replace with Firebase | — |
| Firebase/Firestore persistence | — | ✅ Yes | Theirs | — |
| Skill calculation from roles | ✅ Yes | ☐ | | |
| Skill dedup | ✅ Yes | ☐ | | |
| Skill tree / categorization | ☐ Phase B | ☐ | | |
| RenderSpec / audience variants | ☐ Phase B | ☐ | | |
| Multi-user / auth | — | ☐ | | |
| Multi-CV per user | — | ☐ | | |
| Real-time collaboration | — | ☐ | | |
| Cover page / featured projects | ✅ Yes | ☐ | | |
| Print break management | ✅ Yes | ☐ | | |

**Features unique to their repo (not listed above):**

| Feature | Description | Include in merged? |
|---------|-------------|-------------------|
| | | |

---

## Section 6 — View architecture

| Question | Answer |
|----------|--------|
| How many distinct views? (edit / preview / print) | |
| Are print and preview separate or the same? | |
| Any notion of a CV "viewer" route (public/read-only)? | |
| Theming system (how do they switch styles)? | |

**Can our `PaginatedPrintLayout` + theme system replace theirs?**

_______

**Can their rendering be preserved alongside ours (parallel themes)?**

_______

---

## Section 7 — Production data migration

> The Firebase repo has production users. This section must be completed before Phase D begins.

### 7.1 Existing data inventory

| Question | Answer |
|----------|--------|
| Number of production CVs (approx.) | |
| Number of active users | |
| Are all CVs owned by a single user (John) or multiple consultants? | |
| Is there any data that exists in their format that cannot be expressed in our `DomainCV` schema? | |

### 7.2 Migration path

Describe the proposed data migration:

1. _______
2. _______

**Can existing Firestore documents be loaded by our `CVStorageAdapter` + schema migration?**

_______

**Is a one-time migration script needed, or can it be done lazily (migrate on first read)?**

_______

---

## Section 8 — Architecture verdict

Answer these three questions after completing the analysis:

### Q1: Can their repo become a fork of our base?

☐ Yes — their architecture is compatible; they adopt our core, schemas, and storage adapter interface; they keep their Firebase adapter, theme, and UI.

☐ Partial — compatible in domain model and business logic, but view architecture diverges. Share core as npm package; each repo keeps its own app layer.

☐ No — architectures diverge too much. Agree on a shared data schema only; rebuild one or both app layers.

**Rationale:** _______

### Q2: Which print renderer wins?

☐ Ours (`PaginatedPrintLayout` + theme system)  
☐ Theirs  
☐ Rebuild  
☐ Keep both as separate themes in the merged system

**Rationale:** _______

### Q3: Which editor UI wins?

☐ Ours  
☐ Theirs  
☐ Merge the best of both  
☐ Rebuild

**Rationale:** _______

---

## Next step

Complete this checklist → feed findings into `spec/merge-strategy.md` → Phase D planning session.
