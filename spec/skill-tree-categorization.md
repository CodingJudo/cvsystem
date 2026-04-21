# Skill Tree Categorization — Feature Spec (Phase B)

## Goal

Allow skills to be classified in a tree hierarchy (e.g. ".NET 8" and ".NET 9" both under a ".NET" parent). The tree controls how skills are **displayed** to a reader — not the underlying career data. An audience can see skills at the right level of detail for them, and specific versions can be highlighted when relevant.

One `DomainCV` → many `RenderSpec`s → many tailored CVs.

## Design decisions (settled)

- **Audience scope is presentation-only.** A `RenderSpec` hides/shows/reorders/collapses but never rewrites text content. Summaries and descriptions live only on `DomainCV`.
- **Tree alongside flat list.** `cv.skills` remains the canonical flat list. A new `cv.skillTree` structure references skill IDs. Existing consumers are unaffected.
- **No tree = no change.** A CV without `skillTree` renders exactly as today — flat, sorted by level. The tree is additive, opt-in, backwards compatible.
- **`RenderSpec` is named and savable.** A CV can have multiple saved specs (e.g. "Java team", ".NET team") selectable at print/preview time.

---

## Part 1: Data model changes

### 1.1 `SkillNode` — the tree

Add to `src/domain/model/cv.ts`:

```ts
/**
 * A node in the skill classification tree.
 * The tree is a separate structure from cv.skills — it classifies skill IDs
 * into a hierarchy for display purposes. The flat cv.skills list remains canonical.
 */
export interface SkillNode {
  id: string;
  /** Human-readable display name for this level (e.g. ".NET", "Cloud") */
  displayName: string;
  /** ID of the parent node, or null for root nodes */
  parentId: string | null;
  /**
   * Skill IDs (from cv.skills) that belong directly to this node.
   * A skill can belong to only one node; unclassified skills are implicitly root-level.
   */
  skillIds: string[];
  /**
   * Alternative names/spellings that should auto-match skills from Cinode import.
   * e.g. a ".NET" node might have aliases ["dotnet", ".net", "asp.net core"]
   */
  aliases: string[];
  /**
   * The default depth at which to display this branch.
   * 'node' = show this node's displayName and collapse children.
   * 'leaf' = show individual skill names.
   * Default is 'leaf' when not set.
   */
  defaultDisplay?: 'node' | 'leaf';
}
```

Add `skillTree` to `DomainCV`:

```ts
export interface DomainCV {
  // ... existing fields ...
  /**
   * Optional skill classification tree.
   * When absent, skills render flat (existing behaviour).
   */
  skillTree?: SkillNode[];
  /**
   * Named audience-specific render configurations.
   */
  renderSpecs?: RenderSpec[];
}
```

### 1.2 `RenderSpec` — the audience filter

```ts
/**
 * A named, savable presentation configuration for a specific reader/audience.
 * Applied at render time: one DomainCV + one RenderSpec = one RenderedCV.
 * Never modifies source data — all fields are pure presentation projections.
 */
export interface RenderSpec {
  id: string;
  /** Human-readable name, e.g. "Java team", "Management", "Detailed" */
  name: string;
  /** Which locale to render (sv | en) */
  locale: Locale;
  /**
   * Skill tree display level override per node.
   * Key = SkillNode.id; value = 'node' | 'leaf'.
   * If a node is not listed here, its SkillNode.defaultDisplay is used.
   * If no tree exists, this is ignored.
   */
  skillNodeDisplay?: Record<string, 'node' | 'leaf'>;
  /**
   * Skill IDs to highlight/pin regardless of tree collapse level.
   * e.g. if ".NET" collapses to node-level, ".net-9" can still be shown explicitly.
   */
  pinnedSkillIds?: string[];
  /**
   * IDs of items to hide in this spec (roles, trainings, educations, commitments).
   * Key = item type; value = array of item IDs.
   * Complementary to the existing item-level `visible` flag:
   *   - item.visible = false → always hidden, regardless of spec
   *   - spec.hiddenItemIds = [...] → hidden for this spec only
   */
  hiddenItemIds?: {
    roles?: string[];
    trainings?: string[];
    educations?: string[];
    commitments?: string[];
    hobbyProjects?: string[];
  };
  /**
   * Custom skill display order for the competence section.
   * When set, overrides alphabetical/level sort for this spec.
   */
  skillOrder?: string[];
}
```

### 1.3 `RenderedCV` — the projection output

```ts
/**
 * The result of applying a RenderSpec to a DomainCV.
 * This is what print/preview layouts consume.
 * Read-only; never persisted.
 */
export interface RenderedSkill {
  /** Display name — either the original skill name or the SkillNode.displayName if collapsed */
  displayName: string;
  /** The underlying skill(s) represented. Multiple if collapsed to a node. */
  skillIds: string[];
  level: number | null;
  years: number | null;
  /** True if this skill was explicitly pinned in the RenderSpec */
  isPinned?: boolean;
  /** True if this represents a collapsed node (multiple underlying skills) */
  isCollapsed?: boolean;
}

export interface RenderedCV {
  source: DomainCV;        // reference to the original, for fields not affected by spec
  spec: RenderSpec | null; // null = default rendering (no spec applied)
  locale: Locale;
  skills: RenderedSkill[];
  roles: Role[];           // filtered by hiddenItemIds + item.visible
  trainings: Training[];
  educations: Education[];
  commitments: Commitment[];
  hobbyProjects: HobbyProject[];
}
```

---

## Part 2: `applyRenderSpec` — the projection function

Add to `src/lib/competence/competence-service.ts` (or a new `src/lib/render/render-spec.ts`):

```ts
/**
 * Apply a RenderSpec to a DomainCV to produce a RenderedCV.
 * Pure function. Does not mutate source data.
 */
export function applyRenderSpec(
  cv: DomainCV,
  spec: RenderSpec | null,
  locale: Locale,
): RenderedCV;
```

### Logic

1. **Filter items:** For each collection (roles, trainings, etc.), include only items where:
   - `item.visible !== false` (existing flag)
   - `spec?.hiddenItemIds?.[type]` does not contain `item.id`

2. **Resolve skills:**
   - If `cv.skillTree` is absent or spec is null: return `cv.skills` as flat `RenderedSkill[]` with `displayName = skill.name`, `skillIds = [skill.id]`. Preserves today's behaviour exactly.
   - If tree exists: build tree from `cv.skillTree` and `cv.skills`. For each tree node:
     - Determine display level: `spec.skillNodeDisplay?.[node.id] ?? node.defaultDisplay ?? 'leaf'`
     - If `'leaf'`: render each skill in `node.skillIds` individually.
     - If `'node'`: render a single collapsed `RenderedSkill` with `displayName = node.displayName`, `skillIds = node.skillIds`, `level = max(skill.level)`, `years = sum(unique months)`.
   - Pinned skills (`spec.pinnedSkillIds`) are always rendered at leaf level even inside a collapsed node. Mark with `isPinned: true`.
   - Unclassified skills (not in any node's `skillIds`) are always rendered at leaf level.

3. **Order skills:**
   - If `spec.skillOrder` is set: use that order.
   - Otherwise: sort by level descending, then alphabetically.

---

## Part 3: Competence service — tree operations

Add to `src/lib/competence/competence-service.ts`:

```ts
/** Build an in-memory tree from SkillNode[] for traversal */
export function buildSkillTree(nodes: SkillNode[]): SkillTreeNode[];

/** Return all ancestor node IDs for a given skill ID */
export function findAncestors(skillId: string, nodes: SkillNode[]): string[];

/** Return the SkillNode that directly contains a skill ID, or null */
export function findSkillNode(skillId: string, nodes: SkillNode[]): SkillNode | null;

/** Auto-classify unclassified skills by matching against node aliases */
export function autoClassifySkills(cv: DomainCV): DomainCV;
```

### `autoClassifySkills`

Called after Cinode import. For each skill in `cv.skills` that is not in any `SkillNode.skillIds`:
1. Check if `skill.name` (case-insensitive) matches any `node.aliases`.
2. If matched: add `skill.id` to `node.skillIds`.
3. If unmatched: leave as flat (no node assignment). User categorizes manually.

This means the Cinode importer gets better over time as the user populates aliases on tree nodes.

---

## Part 4: Schema versioning

Phase B bumps `schemaVersion` to `2`. Add a migration in `src/lib/file-formats/migrations.ts`:

```ts
// v1 → v2: add skillTree and renderSpecs if absent
migrations[1] = (data) => ({
  ...data,
  cv: {
    ...data.cv,
    skillTree: data.cv.skillTree ?? [],
    renderSpecs: data.cv.renderSpecs ?? [],
  },
});
```

This means any v1 file loaded after Phase B automatically gains empty `skillTree` and `renderSpecs` arrays — no breaking change, existing rendering still works.

---

## Part 5: Migration of existing flat skills

No migration needed — the tree is purely additive. Existing CVs load with `skillTree: []` and render flat as today. Users populate the tree manually via the editor (Part 6) or via Cinode auto-classification (Part 3).

**No existing career data is altered.** The `cv.skills` flat list never changes as a result of tree operations. Tree operations only affect `cv.skillTree`.

---

## Part 6: Editor UI

### 6.1 Skill tree manager (new section in skill editor)

Location: extend `src/app/cv/skill-editor.tsx` with a new "Skill Tree" tab or collapsible section.

Features:
- **Node list:** show all `SkillNode`s with their child skill count.
- **Add node:** name + optional parent picker (dropdown of existing nodes).
- **Edit node:** rename, change parent, add/remove aliases.
- **Assign skills:** each unclassified skill shows an "Assign to category..." button. Selecting a node adds the skill's id to `node.skillIds`.
- **Drag to re-parent:** optional later.

### 6.2 Render spec manager (new section in preview toolbar or cv-view)

Location: `src/app/cv/preview/preview-client.tsx` toolbar, or a new "Audience" panel in `cv-view.tsx`.

Features:
- **Spec list:** show all saved `RenderSpec`s. Select active spec for preview.
- **Add spec:** name + locale.
- **Edit spec:** per-node display level toggle (node/leaf), skill pinning, item hiding.
- **Default spec:** a built-in implicit spec that renders everything at leaf level (today's behaviour). Cannot be deleted.

### 6.3 Preview integration

`PaginatedPrintLayout` currently accepts `DomainCV` and `Locale`. After Phase B, it should accept `RenderedCV` (or derive it internally by calling `applyRenderSpec(cv, spec, locale)`).

Migration plan: add an optional `renderSpec` prop. When absent, behave as today (null spec = default rendering). Gradually move callers to pass a spec.

---

## Part 7: Cinode import integration

After `extractCv()` and `normalizeAfterImport()`, call `autoClassifySkills(cv)` if the CV has a non-empty `skillTree`.

Since a fresh import typically has `skillTree: []`, auto-classification is a no-op until the user has built some tree structure. This is correct — the user defines the tree for their domain, then re-imports benefit from it.

---

## Part 8: Test plan

New tests in `competence-service.test.ts` (or a new `render-spec.test.ts`):

- `applyRenderSpec` with null spec → identical output to current flat rendering.
- `applyRenderSpec` with a spec that collapses ".NET" node → ".NET 8" and ".NET 9" become one `RenderedSkill` with `displayName = ".NET"`.
- `applyRenderSpec` with a pinned ".NET 9" inside a collapsed ".NET" node → ".NET" collapsed, ".NET 9" pinned alongside.
- `applyRenderSpec` with `hiddenItemIds.roles = ['role-1']` → role-1 excluded.
- `autoClassifySkills` with aliases → correct skills classified.
- `buildSkillTree` with orphan nodes (parentId references non-existent node) → graceful degradation.
- Schema migration v1→v2 → `skillTree: []` and `renderSpecs: []` added.

---

## Open questions (defer to implementation)

1. **Tree depth limit.** Enforce max depth (e.g. 2 or 3 levels) to keep the UI manageable? Or unlimited? Unlimited is simpler to implement; the UI can warn when depth > 3.
2. **Shared skill tree across consultants.** When the system becomes multi-user, do all consultants share one skill tree taxonomy, or does each have their own? This is a Phase D decision. For now, `skillTree` is per-DomainCV.
3. **Collapsed skill years calculation.** A collapsed node's `years` = sum of unique months across all child skills. This could double-count if a consultant used ".NET 8" and ".NET 9" on the same role at the same time. Reuse the existing month-dedup logic from `calculateYearsForSkill`.
