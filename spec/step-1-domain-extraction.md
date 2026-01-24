# Step 1: Domain extraction from Cinode JSON

## Goal
Given Cinode CV JSON (sv and en), derive a minimal normalized DomainCV model that is stable, bilingual, and safe to use for UI and exports.

## Inputs
- fixtures/cinode/cv-sv.json (local only, gitignored)
- fixtures/cinode/cv-en.json (local only, gitignored)

## Outputs
- src/domain/model/cv.ts
  - DomainCV type (minimal, bilingual)
- src/domain/cinode/extract.ts
  - extractCv(rawSv, rawEn) -> { raw: {sv,en}, cv: DomainCV, warnings: string[] }
- src/domain/cinode/paths.md
  - Document which raw JSON paths we mapped from (so future work is deterministic)

## DomainCV (minimum fields)
- id: string
- locales: ('sv' | 'en')[]
- updatedAt?: string | null
- summary: { sv: string | null; en: string | null }
- skills: { id: string; name: string; level?: string | number | null; years?: number | null }[]
- roles: { id: string; title: string | null; company: string | null; start?: string | null; end?: string | null; description: { sv: string | null; en: string | null } }[]

## Non-goals
- Full Cinode schema validation
- Editing
- Rendering/preview/export
- Persisting changes back to raw Cinode format

## Acceptance criteria
- Running pnpm dev does not import fixture JSON in production builds.
- Extraction works with real fixtures and returns:
  - locales detected
  - summary populated when present
  - skills list populated when present
  - roles list populated when present
- Unknown/missing paths do not crash; warnings explain what was missing.
