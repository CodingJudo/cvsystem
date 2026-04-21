# RenderSpec — Audience-Specific CV Rendering

## Business intent

A single CV must often be presented in different ways to different audiences — a technical recruiter, a hiring manager, a consulting firm sourcing a specific project. The RenderSpec feature lets the user save named "views" of their CV that control:

1. **Which items are hidden** — specific roles, projects, trainings, or educations can be excluded from a given audience view.
2. **How role-level skills are displayed** — skills can be shown individually (full list) or collapsed under a shared label (grouped) so a "C# senior" audience sees ".NET" rather than a dozen individual version tags.

Specs are saved on the CV itself (`cv.renderSpecs[]`) so they persist alongside the data. The user can then select a spec in the print preview to instantly see — and export — the filtered, presentation-ready version.

---

## Data model

### `RenderSpec` (on `DomainCV`)

```ts
interface RenderSpec {
  id: string;
  name: string;                  // Human-readable, e.g. "Senior .NET — Technical Recruiter"
  skillDisplay: 'individual' | 'grouped';
  /**
   * Per-groupAs overrides. Key is the groupAs label; value overrides skillDisplay for that group.
   * Allows "show .NET as grouped but Azure services individually".
   */
  skillOverrides?: Record<string, 'individual' | 'grouped'>;
  /**
   * Items to hide in this view.
   * Each key is a collection name; value is an array of item IDs.
   */
  hiddenItemIds?: {
    roles?: string[];
    hobbyProjects?: string[];
    trainings?: string[];
    educations?: string[];
    commitments?: string[];
  };
}
```

`cv.activeRenderSpecId?: string | null` — the spec that is "on" in the editor (persisted so the preview tab opens with the same selection).

### `groupAs` on `Skill`

```ts
interface Skill {
  // ...
  groupAs?: string;   // e.g. ".NET", "Azure", "AWS"
}
```

When `skillDisplay === 'grouped'` and a skill has a `groupAs` value, all visible role skills sharing the same `groupAs` are collapsed into a single display entry showing the group label.

---

## Current implementation (as of 2026-04-20)

### What is wired

| Layer | Status |
|---|---|
| `RenderSpec` type and `cv.renderSpecs`/`cv.activeRenderSpecId` fields | ✅ Domain model |
| Reducer cases: `ADD_RENDER_SPEC`, `UPDATE_RENDER_SPEC`, `DELETE_RENDER_SPEC`, `SET_ACTIVE_RENDER_SPEC` | ✅ `cv-reducer.ts` |
| Action types | ✅ `cv-types.ts` |
| `useRenderSpecs()` hook (addSpec, updateSpec, removeSpec, setActiveSpec, activeSpec) | ✅ `cv-context.tsx` (also exported from `cv-store.tsx`) |
| `resolveRoleSkills(role, cv, spec)` — computes `RenderedRoleSkill[]` per role | ✅ `apps/demo/src/lib/render-spec/index.ts` |
| `applyRenderSpec(cv, spec, locale)` — full RenderedCV with filtered collections | ✅ same file |
| `BlockContent` — receives `spec`, calls `resolveRoleSkills` for roles and hobby projects | ✅ `components/print/block-content.tsx` |
| `PrintMeasurementRoot` — receives same `spec` so grouped pills measure correctly | ✅ `components/PrintMeasurementRoot.tsx` |
| `BlockRenderer` — threads `spec` through to `BlockContent` | ✅ `components/BlockRenderer.tsx` |
| `PaginatedPrintLayout` — accepts `spec`, passes to measurement root, block renderer, and pagination hook | ✅ `app/cv/print-layout-paginated.tsx` |
| `useCvPagination` — accepts `spec`, calls `applyRenderSpec` before building sections | ✅ `hooks/useCvPagination.ts` |
| `PreviewClient` — spec selector persists `activeRenderSpecId` back to storage on change | ✅ `app/cv/preview/preview-client.tsx` |
| `RenderSpecEditor` — create/rename/delete specs, hide-item checkboxes, skillDisplay toggle | ✅ `app/cv/render-spec-editor.tsx` |
| `groupAs` editor on skills | ✅ `app/cv/skill-editor.tsx` (label + input in edit mode) |

### What is NOT yet built

| Feature | Notes |
|---|---|
| **Per-groupAs skill overrides** — fine-grained `skillOverrides` per group key (always individual / always grouped) | Advanced use case; spec model supports it but no UI yet |

---

## Key files

| File | Purpose |
|---|---|
| `packages/core/src/domain/model/cv.ts` | `RenderSpec` type, `DomainCV` fields |
| `apps/demo/src/lib/render-spec/index.ts` | `applyRenderSpec`, `resolveRoleSkills`, `RenderedRoleSkill` |
| `apps/demo/src/lib/store/cv-reducer.ts` | Reducer cases for spec CRUD |
| `apps/demo/src/lib/store/cv-types.ts` | Action union types |
| `apps/demo/src/lib/store/cv-context.tsx` | `useRenderSpecs()` hook |
| `apps/demo/src/components/print/block-content.tsx` | Consumes `resolveRoleSkills` per role |
| `apps/demo/src/app/cv/preview/preview-client.tsx` | Spec selector in print preview toolbar |

---

## Building the editor UI — what an AI tool needs to know

### Creating a spec

Call `useRenderSpecs().addSpec({ name, skillDisplay: 'individual', hiddenItemIds: {} })`. Returns the new spec with a generated id.

### Hiding a role from a spec

```ts
const { specs, updateSpec } = useRenderSpecs();
const spec = specs.find(s => s.id === targetSpecId);
updateSpec(targetSpecId, {
  hiddenItemIds: {
    ...spec.hiddenItemIds,
    roles: [...(spec.hiddenItemIds?.roles ?? []), roleIdToHide],
  },
});
```

### Enabling grouped skill display

```ts
updateSpec(targetSpecId, { skillDisplay: 'grouped' });
// Or override one group to stay individual:
updateSpec(targetSpecId, {
  skillOverrides: { ...spec.skillOverrides, 'Azure': 'individual' },
});
```

### Setting groupAs on a skill

Use `useSkills().updateSkill({ ...skill, groupAs: '.NET' })`. The value must match across skills that should collapse together — the print renderer does a string-equality check.

### Persisting the active spec from preview

`PreviewClient` currently manages `activeSpecId` in local state. To persist it, call `useRenderSpecs().setActiveSpec(id)` (or dispatch `SET_ACTIVE_RENDER_SPEC`) on spec change. This requires the `CVProvider` context to be available in the preview route, which it currently is not (preview is a separate route that reads from storage). The cleanest fix is to dispatch on close/navigate back, or to write through `LocalStorageAdapter` directly in preview.

### Spec-aware section filtering (most impactful remaining work)

`useCvPagination` in `apps/demo/src/hooks/useCvPagination.ts` calls `buildSectionsFromCv(cv)` without a spec, so hidden roles still appear in the paginated layout. To fix:

1. Add a `spec?: RenderSpec | null` parameter to `useCvPagination`.
2. Call `applyRenderSpec(cv, spec, locale)` inside the hook to get a filtered `RenderedCV`.
3. Pass `renderedCv.roles`, `renderedCv.hobbyProjects`, etc. to `buildSectionsFromCv` (which needs to accept filtered collections, or accept a partial CV).

Skill grouping in `resolveRoleSkills` is already wired and working correctly for the roles that do appear.
