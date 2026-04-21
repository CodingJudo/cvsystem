/**
 * Competence service – single source of truth for skills and role–skill links.
 * Pure functions, no UI. Used by store, import, and (later) UI.
 * Uniqueness: exact name after trim (case-sensitive). Role skills reference cv.skills by id.
 */

import type { DomainCV, Skill, Role, RoleSkill, HobbyProject } from '@/domain/model/cv';

function generateSkillId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Trim only; used for exact-name lookup (case-sensitive). */
export function normalizeSkillName(name: string): string {
  return name.trim();
}

/** Find a skill in cv.skills by exact name (after trim). */
export function findSkillByName(cv: DomainCV, name: string): Skill | undefined {
  const trimmed = normalizeSkillName(name);
  if (!trimmed) return undefined;
  return cv.skills.find((s) => normalizeSkillName(s.name) === trimmed);
}

/** Check if a skill id exists in cv.skills. */
function hasSkillId(cv: DomainCV, skillId: string): boolean {
  return cv.skills.some((s) => s.id === skillId);
}

/** Get skill by id. */
function getSkillById(cv: DomainCV, skillId: string): Skill | undefined {
  return cv.skills.find((s) => s.id === skillId);
}

function mapContainerSkills<T extends Role | HobbyProject>(
  container: T,
  skills: Skill[],
  idToKeep: Map<string, string>,
): T {
  const seen = new Set<string>();
  const newSkills: RoleSkill[] = [];
  for (const rs of container.skills) {
    const keptId = idToKeep.get(rs.id) ?? rs.id;
    if (seen.has(keptId)) continue;
    seen.add(keptId);
    const main = skills.find((s) => s.id === keptId);
    if (main) {
      newSkills.push({
        id: main.id,
        name: main.name,
        level: main.level,
        category: rs.category,
        visible: rs.visible ?? true,
      });
    }
  }
  return { ...container, skills: newSkills };
}

/**
 * Calculate years of experience for a skill (by id) from role durations.
 * Uses unique months to avoid double-counting overlapping roles.
 */
function calculateYearsForSkill(skillId: string, roles: Role[]): number {
  const months = new Set<string>();
  for (const role of roles) {
    const hasSkill = role.skills.some((rs) => rs.id === skillId);
    if (!hasSkill) continue;
    const start = role.start ? new Date(role.start) : null;
    const end = role.end ? new Date(role.end) : new Date();
    if (!start || isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    const current = new Date(start);
    while (current <= end) {
      months.add(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
  }
  return Math.round(months.size / 12);
}

/**
 * Dedupe cv.skills by exact name (trim). When duplicates exist, keep the skill with
 * the highest level; reassign all role.skills that referenced a removed id to the kept id.
 */
export function ensureUniqueSkills(cv: DomainCV): DomainCV {
  const byName = new Map<string, Skill>();
  const idToKeep = new Map<string, string>(); // removedId -> keptId

  for (const skill of cv.skills) {
    const key = normalizeSkillName(skill.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, skill);
      continue;
    }
    const keep = (existing.level ?? 0) >= (skill.level ?? 0) ? existing : skill;
    const remove = keep.id === existing.id ? skill : existing;
    byName.set(key, keep);
    idToKeep.set(remove.id, keep.id);
  }

  const skills = Array.from(byName.values());

  const roles = cv.roles.map((role) => mapContainerSkills(role, skills, idToKeep));
  const hobbyProjects = (cv.hobbyProjects ?? []).map((project) =>
    mapContainerSkills(project, skills, idToKeep),
  );

  return { ...cv, skills, roles, hobbyProjects };
}

/**
 * Same as ensureUniqueSkills but groups by name (trim + lower case).
 * Use to merge e.g. "React" and "react" into one skill. Keeps the skill with highest level.
 */
export function ensureUniqueSkillsCaseInsensitive(cv: DomainCV): DomainCV {
  const byKey = new Map<string, Skill>();
  const idToKeep = new Map<string, string>();

  for (const skill of cv.skills) {
    const key = normalizeSkillName(skill.name).toLowerCase();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, skill);
      continue;
    }
    const keep = (existing.level ?? 0) >= (skill.level ?? 0) ? existing : skill;
    const remove = keep.id === existing.id ? skill : existing;
    byKey.set(key, keep);
    idToKeep.set(remove.id, keep.id);
  }

  const skills = Array.from(byKey.values());

  const roles = cv.roles.map((role) => mapContainerSkills(role, skills, idToKeep));
  const hobbyProjects = (cv.hobbyProjects ?? []).map((project) =>
    mapContainerSkills(project, skills, idToKeep),
  );

  return recalculateYears({ ...cv, skills, roles, hobbyProjects });
}

/**
 * Add a skill if exact name (after trim) is not already present.
 * Returns new CV or unchanged if duplicate name.
 */
export function addSkill(cv: DomainCV, skill: Omit<Skill, 'id'>): DomainCV {
  const trimmed = normalizeSkillName(skill.name);
  if (!trimmed) return cv;
  if (findSkillByName(cv, trimmed)) return cv;
  const newSkill: Skill = {
    ...skill,
    id: generateSkillId(),
    name: trimmed,
  };
  return { ...cv, skills: [...cv.skills, newSkill] };
}

/** Update a skill by id. */
export function updateSkill(cv: DomainCV, skillId: string, updates: Partial<Skill>): DomainCV {
  const skills = cv.skills.map((s) => (s.id === skillId ? { ...s, ...updates } : s));
  if (updates.name != null) {
    const updated = skills.find((s) => s.id === skillId);
    if (updated) updated.name = normalizeSkillName(updates.name);
  }
  return { ...cv, skills };
}

/** Remove a skill from cv.skills and from all role.skills. */
export function removeSkill(cv: DomainCV, skillId: string): DomainCV {
  const skills = cv.skills.filter((s) => s.id !== skillId);
  const roles = cv.roles.map((r) => ({
    ...r,
    skills: r.skills.filter((rs) => rs.id !== skillId),
  }));
  const hobbyProjects = (cv.hobbyProjects ?? []).map((project) => ({
    ...project,
    skills: project.skills.filter((rs) => rs.id !== skillId),
  }));
  return { ...cv, skills, roles, hobbyProjects };
}

/** Add a skill (by id) to a role. Level defaults to Skill.level; levelOverride updates both RoleSkill and Skill. */
export function addSkillToRole(
  cv: DomainCV,
  roleId: string,
  skillId: string,
  levelOverride?: number,
): DomainCV {
  const main = getSkillById(cv, skillId);
  if (!main) return cv;

  const role = cv.roles.find((r) => r.id === roleId);
  if (!role) return cv;
  if (role.skills.some((rs) => rs.id === skillId)) return cv;

  const level = levelOverride ?? main.level ?? null;
  const roleSkill: RoleSkill = {
    id: main.id,
    name: main.name,
    level,
    category: null,
    visible: true, // Default to visible for new role skills
  };

  const roles = cv.roles.map((r) => {
    if (r.id !== roleId) return r;
    return { ...r, skills: [...r.skills, roleSkill] };
  });

  let skills = cv.skills;
  if (levelOverride != null && levelOverride !== main.level) {
    skills = cv.skills.map((s) => (s.id === skillId ? { ...s, level: levelOverride } : s));
  }

  return { ...cv, skills, roles };
}

/** Remove a skill from a role. */
export function removeSkillFromRole(cv: DomainCV, roleId: string, skillId: string): DomainCV {
  const roles = cv.roles.map((r) =>
    r.id === roleId ? { ...r, skills: r.skills.filter((rs) => rs.id !== skillId) } : r,
  );
  return { ...cv, roles };
}

/** Update level for a skill on a role and sync to Skill in cv.skills. */
export function updateSkillLevelOnRole(
  cv: DomainCV,
  roleId: string,
  skillId: string,
  level: number,
): DomainCV {
  const roles = cv.roles.map((r) => {
    if (r.id !== roleId) return r;
    return {
      ...r,
      skills: r.skills.map((rs) => (rs.id === skillId ? { ...rs, level } : rs)),
    };
  });
  const skills = cv.skills.map((s) => (s.id === skillId ? { ...s, level } : s));
  return { ...cv, skills, roles };
}

/** Set calculatedYears on each skill from role durations; do not overwrite overriddenYears. */
export function recalculateYears(cv: DomainCV): DomainCV {
  const skills = cv.skills.map((skill) => {
    const years = calculateYearsForSkill(skill.id, cv.roles);
    return {
      ...skill,
      calculatedYears: years,
      overriddenYears: skill.overriddenYears,
    };
  });
  return { ...cv, skills };
}

/**
 * Ensure every role.skills[].id exists in cv.skills. For each role skill whose id is not in cv.skills,
 * resolve by exact name (trim): use existing skill id or add new Skill; then set role.skill.id to that.
 */
export function linkRoleSkillsToMainSkills(cv: DomainCV): DomainCV {
  const skillIds = new Set(cv.skills.map((s) => s.id));
  const currentSkills = [...cv.skills];
  const idMap = new Map<string, string>(); // oldId -> canonicalId

  for (const role of cv.roles) {
    for (const rs of role.skills) {
      if (skillIds.has(rs.id)) continue;
      const canonicalId = idMap.get(rs.id);
      if (canonicalId) {
        skillIds.add(canonicalId);
        continue;
      }
      const trimmed = normalizeSkillName(rs.name);
      if (!trimmed) continue;
      const existing = currentSkills.find((s) => normalizeSkillName(s.name) === trimmed);
      if (existing) {
        idMap.set(rs.id, existing.id);
        skillIds.add(existing.id);
      } else {
        const newSkill: Skill = {
          id: generateSkillId(),
          name: trimmed,
          level: rs.level ?? null,
        };
        currentSkills.push(newSkill);
        idMap.set(rs.id, newSkill.id);
        skillIds.add(newSkill.id);
      }
    }
  }

  for (const project of cv.hobbyProjects ?? []) {
    for (const ps of project.skills) {
      if (skillIds.has(ps.id)) continue;
      const canonicalId = idMap.get(ps.id);
      if (canonicalId) {
        skillIds.add(canonicalId);
        continue;
      }
      const trimmed = normalizeSkillName(ps.name);
      if (!trimmed) continue;
      const existing = currentSkills.find((s) => normalizeSkillName(s.name) === trimmed);
      if (existing) {
        idMap.set(ps.id, existing.id);
        skillIds.add(existing.id);
      } else {
        const newSkill: Skill = {
          id: generateSkillId(),
          name: trimmed,
          level: ps.level ?? null,
        };
        currentSkills.push(newSkill);
        idMap.set(ps.id, newSkill.id);
        skillIds.add(newSkill.id);
      }
    }
  }

  if (idMap.size === 0) return cv;

  const roles = cv.roles.map((role) => ({
    ...role,
    skills: role.skills.map((rs) => {
      const canonicalId = idMap.get(rs.id) ?? rs.id;
      const main = currentSkills.find((s) => s.id === canonicalId);
      return main 
        ? { id: main.id, name: main.name, level: main.level, category: rs.category, visible: rs.visible ?? true }
        : { ...rs, visible: rs.visible ?? true };
    }),
  }));
  const hobbyProjects = (cv.hobbyProjects ?? []).map((project) => ({
    ...project,
    skills: project.skills.map((ps) => {
      const canonicalId = idMap.get(ps.id) ?? ps.id;
      const main = currentSkills.find((s) => s.id === canonicalId);
      return main
        ? { id: main.id, name: main.name, level: main.level, category: ps.category, visible: ps.visible ?? true }
        : { ...ps, visible: ps.visible ?? true };
    }),
  }));

  return { ...cv, skills: currentSkills, roles, hobbyProjects };
}

/** Run linkRoleSkillsToMainSkills, then ensureUniqueSkills, then recalculateYears. Use after import. */
export function normalizeAfterImport(cv: DomainCV): DomainCV {
  const linked = linkRoleSkillsToMainSkills(cv);
  const deduped = ensureUniqueSkills(linked);
  return recalculateYears(deduped);
}
