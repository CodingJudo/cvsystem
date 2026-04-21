/**
 * Helper functions for role skill ordering and management
 */

import type { Role, RoleSkill } from '@/domain/model/cv';

type SkillContainer = Pick<Role, 'skills' | 'skillOrder'>;

/**
 * Get skills in the correct order for a role (custom order or alphabetical)
 */
export function getOrderedSkills<T extends SkillContainer>(item: T): RoleSkill[] {
  if (item.skillOrder && item.skillOrder.length > 0) {
    // Use custom order
    const skillMap = new Map(item.skills.map((s) => [s.id, s]));
    return item.skillOrder
      .map((id) => skillMap.get(id))
      .filter((s): s is RoleSkill => s !== undefined);
  }
  // Default to alphabetical
  return [...item.skills].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Check if current order matches alphabetical order
 */
export function isAlphabeticalOrder<T extends SkillContainer>(item: T): boolean {
  const ordered = getOrderedSkills(item);
  const alphabetical = [...item.skills].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  return (
    ordered.length === alphabetical.length &&
    ordered.every((skill, idx) => skill.id === alphabetical[idx].id)
  );
}

/**
 * Ensure skillOrder only contains IDs that exist in role.skills
 * Removes orphaned IDs and returns updated role
 */
export function syncSkillOrder<T extends SkillContainer>(item: T): T {
  if (!item.skillOrder || item.skillOrder.length === 0) {
    return item;
  }
  const skillIds = new Set(item.skills.map((s) => s.id));
  const validOrder = item.skillOrder.filter((id) => skillIds.has(id));
  // If all IDs were valid, return as-is; otherwise update
  return validOrder.length === item.skillOrder.length
    ? item
    : { ...item, skillOrder: validOrder.length > 0 ? validOrder : undefined };
}
