/**
 * applyRenderSpec — pure function, server-safe, no React/browser APIs.
 *
 * Applies a RenderSpec to a DomainCV to produce a RenderedCV:
 * - Skills in the competence section are always returned individually (full flat list).
 * - Role-level skills are grouped by their `groupAs` value when the spec calls for it.
 * - Items listed in hiddenItemIds are filtered out.
 */

import type {
  DomainCV,
  Skill,
  RenderSpec,
  Role,
  HobbyProject,
  Training,
  Education,
  Commitment,
  Locale,
} from '../domain/model/cv';
import { getEffectiveYears } from '../domain/model/cv';

/**
 * A skill as it should be displayed in a role's skill list.
 * May represent a single skill or a group of skills collapsed under a shared label.
 */
export interface RenderedRoleSkill {
  /** Display name — the skill name, or the groupAs label when collapsed */
  displayName: string;
  /** IDs of the underlying skill(s) */
  skillIds: string[];
  /** Highest level across the grouped skills (null if none set) */
  level: number | null;
  /** Sum of effective years across the grouped skills (null if none calculable) */
  years: number | null;
  /** True when this entry represents multiple collapsed skills */
  isGrouped: boolean;
}

/**
 * The output of applyRenderSpec — a fully resolved view of the CV for a specific audience.
 * All collections are filtered and skills are resolved according to the spec.
 */
export interface RenderedCV {
  /** The source CV (unmodified) */
  source: DomainCV;
  /** The spec applied, or null if rendering without a spec */
  spec: RenderSpec | null;
  locale: Locale;
  /**
   * Full flat skill list — always individual, never grouped.
   * Used by the competence/skills section.
   */
  skills: Skill[];
  roles: Role[];
  hobbyProjects: HobbyProject[];
  trainings: Training[];
  educations: Education[];
  commitments: Commitment[];
}

function isHidden(id: string, list: string[] | undefined): boolean {
  return list ? list.includes(id) : false;
}

/**
 * Resolve the display mode for a specific groupAs key.
 * Checks per-key overrides first, then falls back to the spec's default skillDisplay.
 */
function resolveDisplayMode(
  groupAs: string,
  spec: RenderSpec,
): 'individual' | 'grouped' {
  return spec.skillOverrides?.[groupAs] ?? spec.skillDisplay;
}

/**
 * Apply a RenderSpec to a DomainCV.
 *
 * Pass spec = null to get default rendering (no filtering, no grouping).
 * The competence/skills section always receives the full flat list regardless of spec.
 */
export function applyRenderSpec(
  cv: DomainCV,
  spec: RenderSpec | null,
  locale: Locale,
): RenderedCV {
  // Without a spec: return everything as-is
  if (!spec) {
    return {
      source: cv,
      spec: null,
      locale,
      skills: cv.skills,
      roles: cv.roles,
      hobbyProjects: cv.hobbyProjects ?? [],
      trainings: cv.trainings,
      educations: cv.educations,
      commitments: cv.commitments,
    };
  }

  const hidden = spec.hiddenItemIds ?? {};

  return {
    source: cv,
    spec,
    locale,
    // Competence section: always the full flat list
    skills: cv.skills,
    roles: cv.roles.filter((r) => !isHidden(r.id, hidden.roles)),
    hobbyProjects: (cv.hobbyProjects ?? []).filter((p) => !isHidden(p.id, hidden.hobbyProjects)),
    trainings: cv.trainings.filter((t) => !isHidden(t.id, hidden.trainings)),
    educations: cv.educations.filter((e) => !isHidden(e.id, hidden.educations)),
    commitments: cv.commitments.filter((c) => !isHidden(c.id, hidden.commitments)),
  };
}

/**
 * Resolve the role-level skill list for a single role under a given spec.
 * Called during rendering (print layout) to decide what skill pills to show.
 *
 * When spec is null or skillDisplay is 'individual': returns each skill as a single entry.
 * When skillDisplay is 'grouped': collapses skills sharing the same groupAs label.
 */
export function resolveRoleSkills(
  role: Role,
  cv: DomainCV,
  spec: RenderSpec | null,
): RenderedRoleSkill[] {
  const visibleSkills = role.skills.filter((rs) => rs.visible !== false);

  // No spec or individual display: one entry per skill
  if (!spec || spec.skillDisplay === 'individual') {
    return visibleSkills.map((rs) => ({
      displayName: rs.name,
      skillIds: [rs.id],
      level: rs.level ?? null,
      years: getEffectiveYearsById(rs.id, cv),
      isGrouped: false,
    }));
  }

  // Grouped display: group by groupAs where applicable
  const grouped = new Map<string, RenderedRoleSkill>();
  const ungrouped: RenderedRoleSkill[] = [];

  for (const rs of visibleSkills) {
    // Look up the main skill to get groupAs
    const mainSkill = cv.skills.find((s) => s.id === rs.id);
    const groupAs = mainSkill?.groupAs ?? null;

    if (groupAs && resolveDisplayMode(groupAs, spec) === 'grouped') {
      const existing = grouped.get(groupAs);
      const years = getEffectiveYearsById(rs.id, cv);
      if (existing) {
        existing.skillIds.push(rs.id);
        existing.level = Math.max(existing.level ?? 0, rs.level ?? 0) || null;
        existing.years = sumNullable(existing.years, years);
        existing.isGrouped = true;
      } else {
        grouped.set(groupAs, {
          displayName: groupAs,
          skillIds: [rs.id],
          level: rs.level ?? null,
          years,
          isGrouped: false, // will be set to true if a second skill joins
        });
      }
    } else {
      ungrouped.push({
        displayName: rs.name,
        skillIds: [rs.id],
        level: rs.level ?? null,
        years: getEffectiveYearsById(rs.id, cv),
        isGrouped: false,
      });
    }
  }

  return [...grouped.values(), ...ungrouped];
}

function getEffectiveYearsById(skillId: string, cv: DomainCV): number | null {
  const skill = cv.skills.find((s) => s.id === skillId);
  return skill ? getEffectiveYears(skill) : null;
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}
