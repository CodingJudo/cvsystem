# Milestone 1: Import + Extract + Overview (Read-only)

## User story
As a user, I can load my Cinode CV JSON (SV and EN) and see a structured overview of the data.
I can toggle language to view localized fields.

## Inputs
- fixtures/cinode/cv-sv.json (local only, gitignored)
- fixtures/cinode/cv-en.json (local only, gitignored)

## Outputs
- A normalized Domain CV model derived from raw Cinode JSON
- A /cv page that shows summary, skills, and roles

## Acceptance criteria
- /cv renders without crashes
- Language toggle switches localized text (sv/en)
- Shows counts and lists for:
  - summary/about
  - skills
  - roles/employment history (minimal fields)
- Raw Cinode JSON is preserved in memory (no rewriting)
- No edit functionality in this milestone

## Out of scope
- File upload UI
- Full Cinode schema validation
- Editing any fields
- Export/preview rendering

## Data policy
Fixtures are never committed to git.
fixtures/cinode/ must be in .gitignore.

## Target modules
- src/domain/model/cv.ts
- src/domain/cinode/extract.ts
- src/app/cv/page.tsx
