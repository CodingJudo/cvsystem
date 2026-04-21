# Milestones

## Completed

1. Import Cinode JSON and extract minimal domain model
2. Read-only CV overview with language toggle
3. Skills editor
4. Printable HTML preview/export
5. Canvas preview/export

### Phase A — De-brand and formalize the base ✓
> Goal: brand-neutral, forkable base. No new features.

- A1. ✓ Zod schemas for `DomainCV` at I/O boundaries (`spec/domain-schemas.md`)
- A2. ✓ Storage abstraction layer — `CVStorageAdapter` + `LocalStorageAdapter` (`spec/storage-abstraction.md`)
- A3. ✓ De-brand: extract Geisli identity into `brands/geisli/`; rename `GeisliCVFile` → `CVFile`; add format migration shim (`spec/de-branding.md`)
- A4. ✓ Enforce core package boundary via ESLint rules (`spec/core-package-boundary.md`)
- A5. ✓ Extract `formatDate` / `getBilingualText` into `packages/core/src/format/`
- A6. ✓ pnpm workspace restructure — `@cvsystem/core`, `@cvsystem/adapters-browser`, `@geisli/brand`, `apps/demo/`

---

## Active roadmap

### Phase B — Skill-tree categorization ✗ WON'T DO (superseded by ontology)
> The spec was written before the ontology system was built. The actual implementation
> took a different, better direction: `groupAs` on individual skills + `SkillOntology`
> (MIND-based graph + custom overrides) + `SkillGraphModal` for exploration/manipulation.
> `RenderSpec` and `applyRenderSpec` were implemented but with a simpler shape than specced.
> The tree hierarchy concept is rendered obsolete by the ontology graph.
> See `spec/skill-tree-categorization.md` for the original (superseded) design.

### Phase C — Firebase repo analysis *(can run parallel to Phase B)*
> Goal: understand the Firebase repo deeply enough to make Phase D decisions.

- C1. Priority probes: skill-tree, auth model, Cinode usage (first hours)
- C2. Full analysis using `spec/firebase-merge-analysis-checklist.md`
- C3. Deliver completed checklist

### Phase D — Merge design and execution
> Goal: one merged system. Informed by Phase A + B + C.

- D1. Write `spec/merge-strategy.md` based on analysis
- D2. Execute merge in safe increments
- D3. Migrate Firebase production users to merged schema
