import type { Role, Skill } from '@/domain/model/cv';

/**
 * Calculate total years of experience for a skill based on role durations
 * where that skill is used.
 * 
 * Handles overlapping dates by tracking unique months.
 */
export function calculateSkillYears(skillName: string, roles: Role[]): number {
  const normalizedName = skillName.toLowerCase();
  const months = new Set<string>();
  
  for (const role of roles) {
    // Check if this skill is used in the role
    const hasSkill = role.skills.some(
      s => s.name.toLowerCase() === normalizedName
    );
    if (!hasSkill) continue;
    
    // Parse dates
    const start = role.start ? new Date(role.start) : null;
    const end = role.end ? new Date(role.end) : new Date(); // current = now
    
    if (!start || isNaN(start.getTime())) continue;
    if (isNaN(end.getTime())) continue;
    
    // Add each month to the set to avoid double-counting overlapping roles
    const current = new Date(start);
    while (current <= end) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  // Convert months to years (rounded)
  return Math.round(months.size / 12);
}

/**
 * Calculate years for all skills based on role data
 */
export function calculateAllSkillYears(
  skills: Skill[],
  roles: Role[]
): Map<string, number> {
  const result = new Map<string, number>();
  
  for (const skill of skills) {
    const years = calculateSkillYears(skill.name, roles);
    result.set(skill.id, years);
  }
  
  return result;
}

/**
 * Update skills with calculated years
 */
export function updateSkillsWithCalculatedYears(
  skills: Skill[],
  roles: Role[]
): Skill[] {
  const calculatedMap = calculateAllSkillYears(skills, roles);
  
  return skills.map(skill => ({
    ...skill,
    calculatedYears: calculatedMap.get(skill.id) ?? null,
  }));
}
