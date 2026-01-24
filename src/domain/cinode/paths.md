# Cinode JSON Path Mappings

This document describes which Cinode JSON paths are mapped to each DomainCV field.
Use this as a reference when the Cinode export format changes or when extending the extraction.

## Top-Level Metadata

| DomainCV Field | Cinode Path | Notes |
|----------------|-------------|-------|
| `id` | `id` | CV identifier (number, converted to string) |
| `updatedAt` | `updated` | ISO timestamp |
| `name.first` | `userFirstname` | |
| `name.last` | `userLastname` | |
| `locales` | Detected from `languageCountry` | "se"/"sv" → 'sv', "en"/"gb"/"us" → 'en' |

## Resume Blocks

Cinode organizes CV data into blocks within `resume.blocks[]`. Each block has a `friendlyBlockName` identifier.

### Block Types

| friendlyBlockName | Contains | Used For |
|-------------------|----------|----------|
| `Presentation` | Title, summary/description | `title`, `summary` |
| `SkillsByCategory` | Skills grouped by category | `skills[]` |
| `TopSkills` | Highlighted top skills | Not currently extracted |
| `HighlightedWorkExperiences` | Featured assignments | Not currently extracted (empty in sample) |
| `WorkExperiences` | Work history | Not currently extracted (empty in sample) |
| `Employers` | Employment history | Not currently extracted |
| `Trainings` | Courses and certifications | Not currently extracted |
| `Educations` | Educational background | Not currently extracted |
| `Skills` | Additional skills list | Not currently extracted |
| `Languages` | Language proficiencies | Not currently extracted |
| `Commitments` | Volunteer work, etc. | Not currently extracted |

### Presentation Block

| DomainCV Field | Cinode Path | Notes |
|----------------|-------------|-------|
| `title.{sv\|en}` | `resume.blocks[Presentation].title` | Professional title/role |
| `summary.{sv\|en}` | `resume.blocks[Presentation].description` | About/summary text |

### SkillsByCategory Block

| DomainCV Field | Cinode Path | Notes |
|----------------|-------------|-------|
| `skills[].id` | `resume.blocks[SkillsByCategory].data[].skills[].id` | Or `blockItemId` |
| `skills[].name` | `resume.blocks[SkillsByCategory].data[].skills[].name` | |
| `skills[].level` | `resume.blocks[SkillsByCategory].data[].skills[].level` | 1-5 scale |
| `skills[].years` | Derived from `numberOfDaysWorkExperience` | `Math.round(days / 365)` |

### Work Experiences (Various Blocks)

Work experiences can appear in multiple blocks with `data[]` arrays containing `employer` or `startDate` fields.

| DomainCV Field | Cinode Path | Notes |
|----------------|-------------|-------|
| `roles[].id` | `data[].id` or `data[].blockItemId` | |
| `roles[].title` | `data[].title` | Job/role title |
| `roles[].company` | `data[].employer` | Company/client name |
| `roles[].start` | `data[].startDate` | ISO timestamp |
| `roles[].end` | `data[].endDate` | ISO timestamp, null if current |
| `roles[].isCurrent` | `data[].isCurrent` | Boolean |
| `roles[].description.{sv\|en}` | `data[].description` | From respective language file |

## Skill Categories

Within `SkillsByCategory.data[]`, skills are grouped by `keywordTypeId`:

| keywordTypeId | Category Name (SV) | Category Name (EN) |
|---------------|-------------------|-------------------|
| 2 | Roller | Roles |
| null | Okategoriserad | Uncategorized |
| ... | (varies) | (varies) |

## Notes

1. **Bilingual merging**: Swedish data is primary; English is used for bilingual fields
2. **Deduplication**: Skills are deduplicated by `id`
3. **Missing data**: Missing paths generate warnings, not errors
4. **Date format**: All dates are ISO 8601 timestamps
5. **Level scale**: Skill levels appear to be 1-5 (needs verification)
