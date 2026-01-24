# Step 3: Skill Experience & UI Enhancements

## Goals

1. **Auto-calculate skill years** from work experience durations
2. **Manual override** with visual indicator when user sets custom value
3. **Expandable role descriptions** with show more/less
4. **Reorder sections**: Work experience first, then Skills
5. **Move technologies** below description in role cards
6. **Apply Geisli design system** - colors, fonts, logo

---

## Design System: Geisli

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Accent** | `#FF6B00` (Deep Orange) | CTAs, highlights, energy |
| **Primary** | `#8C52FF` (Purple) | Logo, UI components, tech feel |
| **Secondary** | `#101B29` (Dark Blue) | Backgrounds, titles |
| **Neutral** | `#FFFFFF` (White) | Text on dark, light sections |
| **Complement** | `#E1E3E8` (Light Gray) | Soft backgrounds, dividers |

### Typography

- **Primary Font**: Poppins Light
- **Headings**: Poppins Light 24px+ (use Medium/Bold for emphasis)
- **Body**: Poppins Light/Regular 14-18px
- **UI Elements**: Poppins Light/Regular 12-16px

### Logo

- File: `logo.svg` (500x500)
- Use in header/navbar

---

## 1. Skill Years Calculation

### Logic

For each skill in the main skills list:
1. Find all roles where this skill appears in `role.skills[]`
2. Calculate total months of experience from role durations
3. Convert to years (rounded)

```typescript
function calculateSkillYears(skillName: string, roles: Role[]): number {
  let totalDays = 0;
  
  for (const role of roles) {
    if (!role.skills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) {
      continue;
    }
    
    const start = role.start ? new Date(role.start) : null;
    const end = role.end ? new Date(role.end) : new Date(); // current = now
    
    if (start && end) {
      totalDays += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
  }
  
  return Math.round(totalDays / 365);
}
```

### Data Model Changes

```typescript
interface Skill {
  id: string;
  name: string;
  level?: number | null;
  /** Calculated years from role durations */
  calculatedYears?: number | null;
  /** User-overridden years (null = use calculated) */
  overriddenYears?: number | null;
  /** Effective years = overriddenYears ?? calculatedYears */
  years?: number | null; // Keep for backwards compat
}
```

### Visual Indicator

- **Normal skill**: Default blue badge
- **Overridden skill**: Orange/amber badge with small icon (e.g., ✎ or *)
- **Legend**: At bottom of skills section explaining the colors

```
┌─────────────────────────────────────────────────────────────┐
│ Skills                                                       │
├─────────────────────────────────────────────────────────────┤
│ [JavaScript 7y] [React 5y] [TypeScript* 3y] [Node.js 4y]    │
│                                                              │
│ * = manually adjusted experience                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Expandable Role Descriptions

### Behavior

- Default: Show first 3-4 lines (truncated with `...`)
- Click "Show more" → Expand to full text
- Click "Show less" → Collapse back

### Implementation

```typescript
interface ExpandableTextProps {
  text: string;
  maxLines?: number; // default 4
  locale: Locale;
}

function ExpandableText({ text, maxLines = 4, locale }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Check if text needs truncation (rough estimate)
  const needsTruncation = text.length > 300; // or use line counting
  
  return (
    <div>
      <p className={expanded ? '' : `line-clamp-${maxLines}`}>
        {text}
      </p>
      {needsTruncation && (
        <button onClick={() => setExpanded(!expanded)}>
          {expanded 
            ? (locale === 'sv' ? 'Visa mindre' : 'Show less')
            : (locale === 'sv' ? 'Visa mer' : 'Show more')
          }
        </button>
      )}
    </div>
  );
}
```

---

## 3. Section Reordering

### Current Order
1. Summary
2. Skills
3. Work Experience

### New Order
1. Summary
2. Work Experience
3. Skills

Update in:
- `src/app/cv/cv-view.tsx`
- `src/app/cv/print-layout.tsx`

---

## 4. Role Card Layout Changes

### Current Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 👁 Title @ Company                              Date Range  │
├─────────────────────────────────────────────────────────────┤
│ Technologies: [React] [TypeScript] [Node.js]                │
│ [+ Add technology]                                          │
├─────────────────────────────────────────────────────────────┤
│ Description text...                                          │
└─────────────────────────────────────────────────────────────┘
```

### New Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 👁 Title @ Company • Location                   Date Range  │
├─────────────────────────────────────────────────────────────┤
│ Description text that can be expanded...                    │
│ [Show more]                                                 │
├─────────────────────────────────────────────────────────────┤
│ Technologies: [React] [TypeScript] [Node.js]                │
│ [+ Add technology] (when editing)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Design System
1. [ ] Add Poppins font (Google Fonts)
2. [ ] Create CSS variables for Geisli colors in globals.css
3. [ ] Move logo.svg to public/ folder
4. [ ] Add logo to CV page header
5. [ ] Update button, card, badge colors to use Geisli palette
6. [ ] Update background and text colors

### Phase 2: Skill Years Enhancement
7. [ ] Add `calculatedYears` and `overriddenYears` to Skill interface
8. [ ] Create `calculateSkillYears()` utility function
9. [ ] Add recalculation logic when roles change
10. [ ] Update skill store actions for override
11. [ ] Update SkillBadge to show override indicator (amber for override)
12. [ ] Add legend at bottom of skills section

### Phase 3: UI Improvements
13. [ ] Create `ExpandableText` component
14. [ ] Update role cards to use ExpandableText for descriptions
15. [ ] Move technologies section below description in role cards
16. [ ] Reorder sections: Work Experience before Skills
17. [ ] Update print layout to match new order

### Phase 4: Testing
18. [ ] Test skill year calculations
19. [ ] Test manual override persistence
20. [ ] Verify print/export reflects changes
21. [ ] Verify design consistency across pages

---

## Edge Cases

### Skill Years Calculation
- Overlapping role dates → Don't double-count (use Set of months)
- Roles without dates → Skip in calculation
- Current roles → Use today as end date
- Skill not in any role → Show "< 1y" or "New"

### Manual Override
- Override to 0 → Valid (e.g., skill learned but not used professionally)
- Clear override → Revert to calculated
- Calculated changes → Keep override unless user clears it

---

## Non-Goals (this step)
- Skill proficiency auto-calculation
- Automatic skill suggestions based on role content
- Skill grouping/categorization changes
