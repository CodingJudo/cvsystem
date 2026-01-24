# Step 2: Role/Work Experience Editing

## Goal
Enable editing of roles/work experiences with technology badges and visibility control, while maintaining proper data import from Cinode format.

## Cinode Data Structure (Reference)

Each work experience in Cinode has:
```json
{
  "title": "System Developer",
  "description": "...",
  "employer": "Company Name",
  "location": { "city": "Malmö", "country": "Sverige", ... },
  "startDate": "2023-03-01T00:00:00",
  "endDate": null,
  "disabled": true,      // Visibility flag 1
  "isIncluded": true,    // Visibility flag 2
  "skills": [            // Technologies used in this role
    {
      "name": "JavaScript",
      "level": 4,
      "keywordTypeName": "Techniques",
      "id": "..."
    }
  ]
}
```

## Data Model Changes

### 1. Expand `Role` interface in `src/domain/model/cv.ts`

```typescript
export interface RoleSkill {
  id: string;
  name: string;
  level?: number | null;
  /** Category: Techniques, Tools, Platforms, etc. */
  category?: string | null;
}

export interface Role {
  id: string;
  title: string | null;
  company: string | null;
  location?: string | null;
  start?: string | null;
  end?: string | null;
  isCurrent?: boolean;
  description: BilingualText;
  /** Technologies/skills used in this role */
  skills: RoleSkill[];
  /** Whether to include this role in exports */
  visible: boolean;
}
```

### 2. Update extraction in `src/domain/cinode/extract.ts`

- Extract `skills` array from each work experience
- Map `disabled` to `visible` (inverted: `visible = !disabled`)
- Extract `location.city` or `location.formattedAddress`
- Deduplicate skills by ID

### 3. Update CV store for role editing

Add role-related actions to `cv-store.tsx`:
- `UPDATE_ROLE` - edit role fields (title, description, etc.)
- `TOGGLE_ROLE_VISIBILITY` - toggle visible flag
- `ADD_ROLE_SKILL` - add a technology to a role
- `REMOVE_ROLE_SKILL` - remove a technology from a role
- `SYNC_ROLE_SKILL_TO_MAIN` - when adding a skill to role, also add to main skills

## Implementation Tasks

### Phase 1: Data Model & Extraction
1. [ ] Update `Role` interface with `skills` and `visible` fields
2. [ ] Create `RoleSkill` interface
3. [ ] Update `extractRoles()` to extract role skills from Cinode
4. [ ] Update `extractRoles()` to map `disabled` → `visible`
5. [ ] Update `extractRoles()` to extract location
6. [ ] Add/update unit tests for role extraction

### Phase 2: State Management
7. [ ] Add role-related action types to cv-store
8. [ ] Implement role reducers (update, toggle visibility, add/remove skill)
9. [ ] Add `useRoles()` hook for role editing
10. [ ] Implement skill sync logic (role skill → main skills)

### Phase 3: UI Components
11. [ ] Create `RoleEditor` component (inline editing)
12. [ ] Create `RoleSkillBadge` component (with remove button)
13. [ ] Create `AddRoleSkillForm` component (autocomplete from main skills)
14. [ ] Add visibility toggle to role cards
15. [ ] Update print/export to respect visibility flag

## Skill Sync Logic

When a skill is added to a role:
1. Check if skill already exists in main `skills` array (by name, case-insensitive)
2. If not, add it to main skills with:
   - Same name and level
   - Generated ID
   - `years` = 0 (or calculated from role duration)
3. If already exists, optionally update level if new level is higher

## Visibility Behavior

- `visible: true` = show in exports (print, canvas, HTML)
- `visible: false` = hidden in exports, but visible in editor with visual indicator
- Editor shows all roles with a toggle switch
- Print/canvas/HTML exports filter to `visible: true` only

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ 👁 System Developer @ Inter Ikea Group       Mar 2023 - Now │
│     Malmö, Sverige                                          │
├─────────────────────────────────────────────────────────────┤
│ Description: [editable text area]                           │
├─────────────────────────────────────────────────────────────┤
│ Technologies: [JavaScript ×] [React ×] [TypeScript ×]       │
│               [+ Add technology]                            │
└─────────────────────────────────────────────────────────────┘
```

- Eye icon (👁) toggles visibility
- Faded appearance when `visible: false`
- Click × to remove technology
- Click "+ Add" to add from main skills or create new

## Non-Goals (for this step)
- Drag-and-drop reordering of roles
- Adding completely new roles (only edit imported ones)
- Editing employer/company logo
- Rich text editing for description
