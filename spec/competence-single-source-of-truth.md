# Competence / Techniques – Single Source of Truth – Implementation Plan

## Goals

1. **Single source of truth**: `cv.skills` is the only list of competencies; no duplicates (unique by skill name).
2. **Level**: Stored as 1–5 in the data model; displayed in Kompetenser when editing; translated to Medel / Hög / Mycket Hög in print.
3. **Years**: Calculated from role durations where the skill is tagged; user can override in Kompetenser only; override takes precedence.
4. **Role ↔ Skill link**: When editing work experience, skills are added by choosing from the same kompetenser list (type-ahead from existing); level defaults from Kompetenser but can be changed on the role, and that change updates the global skill level.
5. **Centralized logic**: A dedicated service (no UI) handles add/update/calculate; rendering stays in components so the logic can be refactored out later.

---

## Current State (Summary)

- **`cv.skills`**: Main list (`Skill`: id, name, level, years, calculatedYears, overriddenYears). Used for Kompetenser and for the competence print section.
- **`role.skills`**: Per-role list (`RoleSkill`: id, name, level, category). When adding “from existing”, `roleSkill.id === skill.id`. When adding “new”, a new `role-skill-*` id is generated and optionally a new `Skill` is added to `cv.skills` by name (risk of duplicate names).
- **skill-calculator.ts**: Deprecated. Calculated years are now provided by the competence service (`recalculateYears`, `calculatedYears`); the store and import layer use that.
- **Skill editor**: Shows level (1–5), effective years (override → calculated → years), allows setting override; no explicit “calculated” display.
- **Role editor**: “Lägg till från befintliga” (buttons) + “Eller skapa ny” (name + level). No type-ahead; level is not synced back to Kompetenser when changed on role.

---

## Data Model Decisions

- **Uniqueness**: Skills are unique by **exact name after trim** (case-sensitive). "React", "React.js", and "react" are **three separate skills**; recruiters often parse specific spellings, so we keep all combinations; no merging of different spellings.
- **Reference**: `role.skills[].id` must always equal the id of an entry in `cv.skills` (canonical reference). So we never use `role-skill-*` ids; we use `skill.id` from the main list.
- **Level**: Stored on `Skill` (1–5). When a skill is added to a role, `RoleSkill.level` is set from `Skill.level`. If the user changes level on the role, update `Skill.level` in `cv.skills` (single source).
- **Years**: On `Skill` only. `calculatedYears` = sum of role durations (via skill-calculator). `overriddenYears` = user input in Kompetenser; when set, it overrides for display. Not editable on the role.
- **Dedupe (legacy data)**: When `ensureUniqueSkills` finds two skills with the **exact same name** (after trim), keep **one** and reassign all `role.skills` to that id. **Keep the skill with the highest level** (1–5), since that is most likely the most up to date; remove the other.
- **Extensibility**: Keep `RoleSkill.category` and the Skill model flexible. Skills are used in editing, print, and preview; in the future they may map to external services (e.g. multiple profiles). The centralized service stays decoupled so it can be refactored or reused without tying the UI or other platforms to one implementation.

---

## Step-by-Step Implementation Plan

### Phase 1: Centralized competence service and tests

**Step 1.1 – Create competence service module (no UI)**  
- Add `src/lib/competence/` (or `src/domain/competence/`): e.g. `competence-service.ts` and `competence-service.test.ts`.
- Move / adapt logic from `skill-calculator.ts` into the service (e.g. `calculateSkillYears(skillIdOrName, cv)`, `calculateAllSkillYears(cv)` returning `Map<skillId, number>`).
- Service API (pure functions or a small class, no React):
  - `normalizeSkillName(name: string): string` – trim only (no case fold); used for display and for exact-name lookup.
  - `findSkillByName(cv: DomainCV, name: string): Skill | undefined` – match by exact name after trim (case-sensitive).
  - `ensureUniqueSkills(cv: DomainCV): DomainCV` – dedupe `cv.skills` by exact name (trim, case-sensitive). When duplicates exist, keep the skill with the **highest level**; reassign all `role.skills` that referenced the removed id to the kept skill’s id.
  - `addSkill(cv: DomainCV, skill: Omit<Skill, 'id'>): DomainCV` – add if exact name (after trim) not present; return new cv (or throw / return result type).
  - `updateSkill(cv: DomainCV, skillId: string, updates: Partial<Skill>): DomainCV`
  - `removeSkill(cv: DomainCV, skillId: string): DomainCV` – remove from `cv.skills` and from all `role.skills` where `roleSkill.id === skillId`.
  - `addSkillToRole(cv: DomainCV, roleId: string, skillId: string, levelOverride?: number): DomainCV` – add RoleSkill with `id: skillId`, name/level from Skill (or levelOverride); if levelOverride, also update Skill.level.
  - `removeSkillFromRole(cv: DomainCV, roleId: string, skillId: string): DomainCV`
  - `updateSkillLevelOnRole(cv: DomainCV, roleId: string, skillId: string, level: number): DomainCV` – update RoleSkill.level and Skill.level.
  - `recalculateYears(cv: DomainCV): DomainCV` – set `calculatedYears` on each skill from role durations (use existing month-based logic); do not overwrite `overriddenYears`.
  - `linkRoleSkillsToMainSkills(cv: DomainCV): DomainCV` – for each role.skill whose id is not in cv.skills, resolve by exact name (trim): use existing skill id or add new Skill; ensure every role.skills[].id is in cv.skills.
  - `normalizeAfterImport(cv: DomainCV): DomainCV` – run `linkRoleSkillsToMainSkills` then `ensureUniqueSkills` then `recalculateYears`; use after Geisli or Cinode import.
- No rendering; only CV in/out (or immutable updates). This keeps the layer portable.

**Step 1.2 – Tests for competence service**  
- Tests for: `normalizeSkillName`, `findSkillByName`, `ensureUniqueSkills` (dedupe + role refs), `addSkill`, `updateSkill`, `removeSkill` (removal from roles too), `addSkillToRole` / `removeSkillFromRole`, `updateSkillLevelOnRole` (level synced to Skill), `recalculateYears` (overlap handling, override preserved), `linkRoleSkillsToMainSkills`, `normalizeAfterImport` (e.g. Cinode-like role-skill-* ids become main skill refs).
- Test that role.skills always reference cv.skills by id after each operation.

**Step 1.3 – Wire calculated years into app lifecycle**  
- Where CV is loaded or restored (e.g. store init, LOAD_FROM_STORAGE, IMPORT_CV), after setting `state.cv`, run `recalculateYears(state.cv)` and store the result so `calculatedYears` is always set.
- Optionally run `recalculateYears` after any change that affects role dates or role.skills (e.g. after ADD_ROLE_SKILL, REMOVE_ROLE_SKILL, UPDATE_ROLE with start/end, etc.) so the UI always sees up-to-date calculated years.

---

### Phase 2: Store and UI use the service (single source, no duplicates)

**Step 2.1 – Store uses competence service**  
- Replace inline skill/role-skill logic in `cv-store` with calls to the competence service. E.g. `ADD_SKILL` → `addSkill`, `ADD_ROLE_SKILL` → resolve skill by id or name, then `addSkillToRole` (and optionally `addSkill` if creating new); then run `recalculateYears`.
- Ensure `addRoleSkill` / `addExistingSkillToRole` never create a RoleSkill with a non–cv.skills id. If user types a new name, call service to `addSkill` first, then `addSkillToRole` with the new skill’s id.
- On load/import, call `ensureUniqueSkills` (and optionally `recalculateYears`) so legacy data is deduped and years are filled.

**Step 2.2 – Kompetenser: no duplicates, show level (1–5) and years**  
- Kompetenser list is `cv.skills` (already). Ensure add skill goes through service so duplicates by name are rejected or merged.
- In skill editor: show **level as number (1–5)**; show **years** as calculated (and indicate “calculated” or “override”); allow setting override; “clear override” resets to calculated.

**Step 2.3 – Role editor: type-ahead from Kompetenser, level sync**  
- Replace “Lägg till från befintliga” (and “Eller skapa ny”) with a **single input**: user types technique name.
  - **Debounced** (e.g. 200–300 ms) filter `cv.skills` by name containing the query (substring match, case-insensitive for filtering only); show suggestions (same list as “Lägg till från befintliga” but filtered).
  - On select: add that skill to the role via service (`addSkillToRole` with existing skill id). Pre-fill level from `Skill.level`.
  - If user does not select and instead “creates new” (e.g. “Add Reac” as new): service `addSkill` with that name (and default level), then `addSkillToRole`. So we never have a role-only skill.
- When editing level for a skill on the role, call `updateSkillLevelOnRole` so the global `Skill.level` is updated (single source).
- In role editor, **do not** show or edit “years” for the skill (years only in Kompetenser).

---

### Phase 3: UX and edge cases

**Step 3.1 – Debounced type-ahead component**  
- Implement debounced filter on keypress (or onChange) and show dropdown with matching skills from `cv.skills` (excluding already added to this role). Option “Create new: &lt;name&gt;” if no match and name is non-empty.

**Step 3.2 – Display of years in Kompetenser**  
- Show calculated years clearly; when user sets a number, show as “override” and allow “reset to calculated”.

**Step 3.3 – Print / export**  
- Already using `cv.skills` for competence section (Medel / Hög / Mycket Hög) and role.skills for per-role tags. Ensure after Phase 2 that role.skills[].id always matches cv.skills, so any future logic that joins by id is correct.

---

## Decided clarifications

1. **Spelling**: Treat "React", "React.js", "react" etc. as **separate skills**. Recruiters parse specific spellings; keep all combinations. Uniqueness = exact name after trim (case-sensitive).
2. **Dedupe**: When two skills have the exact same name, keep **one** and reassign all role refs to it. **Keep the skill with the highest level** (most likely most up to date); remove the other.
3. **Category & architecture**: Keep `RoleSkill.category` and a flexible Skill model. Skills are used in editing, print, and preview; later they may map to external services (e.g. profiles). Keep the competence service decoupled so it can be refactored or reused without coupling to one platform.

---

## Import compatibility (JSON Geisli + Cinode)

Both import formats must produce a CV that satisfies the single-source-of-truth rules: **every `role.skills[].id` must reference a skill in `cv.skills`** (no orphan `role-skill-*` ids). After any import, run a **post-import normalization** so that existing and legacy data conform.

### Post-import normalization (single place, used by both import paths)

1. **Link role skills to main skills**  
   For each role and each `role.skills[]`: if `skill.id` is not in `cv.skills`, resolve by **exact name (trim)**:
   - If a skill with that name exists in `cv.skills`, set `role.skill.id` to that skill's id (and keep name/level in sync).
   - If not, add a new `Skill` to `cv.skills` (with that name and the role skill's level) and set `role.skill.id` to the new skill's id.  
   Result: every `role.skills[].id` is in `cv.skills`.

2. **Ensure unique skills**  
   Run `ensureUniqueSkills(cv)` (dedupe by exact name, keep highest level, reassign role refs).

3. **Recalculate years**  
   Run `recalculateYears(cv)` so `calculatedYears` is set from role durations; leave `overriddenYears` unchanged.

Implement this as a single function, e.g. **`normalizeAfterImport(cv: DomainCV): DomainCV`** in the competence service, and call it from both import flows **after** building the CV and **before** returning the result.

### Geisli JSON import

- **Format**: Geisli export is `{ cv: DomainCV, metadata, ... }`. So `cv.skills` and `cv.roles[].skills` are whatever was last saved (may include legacy `role-skill-*` ids).
- **Handling**: After parsing and validating, run **`normalizeAfterImport(result.cv)`** and return the normalized CV. No change to file shape or detect logic.

### Cinode import

- **Extract today**: `extractSkills()` dedupes by **normalizedName (lowercase)** and by id, so "React" and "react" are merged. `extractRoleSkills()` sets `role.skills[].id` from Cinode or `role-skill-*`; that id may not exist in `cv.skills`.
- **Changes**:  
  1. **Dedupe in extract**: In `extractSkills()`, dedupe by **exact name (trim)** only, not by lowercase, so "React" and "react" remain two skills when both appear in Cinode.  
  2. **Post-extract**: After `extractCv()` returns, run **`normalizeAfterImport(result.cv)`** in the import layer (`importCinodeFiles` and `importFromJson` for Cinode). That links role.skills to cv.skills, dedupes by exact name (keep highest level), and recalculates years.

### Where to call `normalizeAfterImport`

- **`import.ts`**: In `importGeisliFile()`, after building `cv`, set `cv = normalizeAfterImport(cv)` before returning. In `importCinodeFiles()` (and single-file Cinode path), after `extractCv(...)`, set `result.cv = normalizeAfterImport(result.cv)` before returning.
- **Store**: When applying `IMPORT_CV` / `LOAD_FROM_STORAGE`, the CV has already been normalized by the import layer.

---

## File / Module Overview

| Area | Files |
|------|--------|
| Service | `src/lib/competence/competence-service.ts`, `competence-service.test.ts` |
| Model | `src/domain/model/cv.ts` (unchanged; Skill / RoleSkill as today) |
| Store | `src/lib/store/cv-store.tsx` (use service in reducers) |
| Import | `src/lib/file-formats/import.ts` (call `normalizeAfterImport` in Geisli + Cinode paths); `src/domain/cinode/extract.ts` (dedupe skills by exact name trim) |
| Skill calculator | `src/lib/skill-calculator.ts` (can be re-exported from or replaced by competence-service) |
| Kompetenser UI | `src/app/cv/skill-editor.tsx` (show level 1–5, years + override) |
| Role UI | `src/app/cv/role-editor.tsx` (one input, debounced suggestions, level editable, no years) |

---

## Order of Implementation (recommended)

1. Implement competence service + tests (Phase 1), including `linkRoleSkillsToMainSkills` and `normalizeAfterImport`.
2. Wire `recalculateYears` into store on load and on role/skill changes (Phase 1.3).
3. **Import**: Call `normalizeAfterImport(cv)` in `importGeisliFile` and `importCinodeFiles` (and Cinode path in `importFromJson`) after building the CV. In Cinode `extractSkills()`, change dedupe to exact name (trim) instead of lowercase.
4. Switch store to use service for add/update/remove skill and add/remove/update role skill (Phase 2.1).
5. Add `ensureUniqueSkills` on load/import in store when applying loaded/imported CV (Phase 2.1) if not already normalized by import.
6. Kompetenser UI: ensure level and years/override display (Phase 2.2).
7. Role editor: type-ahead input + “create new” + level sync (Phase 2.3, 3.1).
8. Polish: debounce tuning, “reset to calculated” (Phase 3).

This keeps the data layer correct and tested first; import compatibility is ensured before or alongside store changes, then UI and UX on top.
