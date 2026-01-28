/**
 * Conflict Detection
 * 
 * Compares two CVs and detects conflicts between them.
 */

import type { DomainCV, Role, Skill, BilingualText } from '@/domain/model/cv';
import type {
  ConflictAnalysis,
  TextConflict,
  RoleConflict,
  SkillConflict,
} from './types';

/**
 * Check if two bilingual texts are different
 */
function textsAreDifferent(a: BilingualText, b: BilingualText): boolean {
  const aSv = (a.sv ?? '').trim();
  const bSv = (b.sv ?? '').trim();
  const aEn = (a.en ?? '').trim();
  const bEn = (b.en ?? '').trim();
  
  return aSv !== bSv || aEn !== bEn;
}

/**
 * Check if a bilingual text has any content
 */
function hasContent(text: BilingualText): boolean {
  return !!(text.sv?.trim() || text.en?.trim());
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses a simple Jaccard similarity on words
 */
function stringSimilarity(a: string | null, b: string | null): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

/**
 * Check if two date ranges overlap
 */
function dateRangesOverlap(
  start1: string | null | undefined,
  end1: string | null | undefined,
  start2: string | null | undefined,
  end2: string | null | undefined
): boolean {
  // Parse dates, treating null/undefined end as "present"
  const s1 = start1 ? new Date(start1) : null;
  const e1 = end1 ? new Date(end1) : new Date();
  const s2 = start2 ? new Date(start2) : null;
  const e2 = end2 ? new Date(end2) : new Date();
  
  if (!s1 || !s2) return false;
  
  // Check overlap: s1 <= e2 && s2 <= e1
  return s1 <= e2 && s2 <= e1;
}

/**
 * Calculate match score between two roles (0-1)
 * Higher score = more likely to be the same role
 */
function calculateRoleMatchScore(current: Role, incoming: Role): number {
  let score = 0;
  let weights = 0;
  
  // Same ID is a strong match
  if (current.id === incoming.id) {
    return 1.0;
  }
  
  // Date range overlap (weight: 3)
  if (dateRangesOverlap(current.start, current.end, incoming.start, incoming.end)) {
    score += 3;
  }
  weights += 3;
  
  // Title similarity (weight: 2)
  const titleSim = stringSimilarity(current.title, incoming.title);
  score += titleSim * 2;
  weights += 2;
  
  // Company similarity (weight: 2)
  const companySim = stringSimilarity(current.company, incoming.company);
  score += companySim * 2;
  weights += 2;
  
  // Exact date match bonus (weight: 1)
  if (current.start === incoming.start) {
    score += 0.5;
  }
  if (current.end === incoming.end || (current.isCurrent && incoming.isCurrent)) {
    score += 0.5;
  }
  weights += 1;
  
  return score / weights;
}

/**
 * Check if two roles are different (content-wise)
 */
function rolesAreDifferent(current: Role, incoming: Role): boolean {
  // Check basic fields
  if (current.title !== incoming.title) return true;
  if (current.company !== incoming.company) return true;
  if (current.location !== incoming.location) return true;
  if (current.start !== incoming.start) return true;
  if (current.end !== incoming.end) return true;
  if (current.isCurrent !== incoming.isCurrent) return true;
  if (current.visible !== incoming.visible) return true;
  
  // Check descriptions
  if (textsAreDifferent(current.description, incoming.description)) return true;
  
  // Check skills count (simple check - detailed diff would be too complex)
  if (current.skills.length !== incoming.skills.length) return true;
  
  // Check if skill names match
  const currentSkillNames = new Set(current.skills.map(s => s.name.toLowerCase()));
  const incomingSkillNames = new Set(incoming.skills.map(s => s.name.toLowerCase()));
  if (currentSkillNames.size !== incomingSkillNames.size) return true;
  for (const name of currentSkillNames) {
    if (!incomingSkillNames.has(name)) return true;
  }
  
  return false;
}

/**
 * Check if two skills are different
 */
function skillsAreDifferent(current: Skill, incoming: Skill): boolean {
  // Name should be the same (that's how we match)
  // Check other fields
  if (current.level !== incoming.level) return true;
  if (current.years !== incoming.years) return true;
  
  return false;
}

/**
 * Match skills by name (case-insensitive)
 */
function matchSkillByName(skills: Skill[], name: string): Skill | undefined {
  const normalizedName = name.toLowerCase();
  return skills.find(s => s.name.toLowerCase() === normalizedName);
}

/**
 * Find the best matching role from a list
 */
function findBestRoleMatch(
  role: Role,
  candidates: Role[],
  threshold = 0.5
): { role: Role; score: number } | null {
  let bestMatch: Role | null = null;
  let bestScore = 0;
  
  for (const candidate of candidates) {
    const score = calculateRoleMatchScore(role, candidate);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = candidate;
    }
  }
  
  return bestMatch ? { role: bestMatch, score: bestScore } : null;
}

/**
 * Compare two CVs and detect conflicts
 */
export function detectConflicts(current: DomainCV, incoming: DomainCV): ConflictAnalysis {
  const conflicts: ConflictAnalysis['conflicts'] = {
    title: null,
    summary: null,
    roles: [],
    skills: [],
  };
  
  const stats: ConflictAnalysis['stats'] = {
    rolesModified: 0,
    rolesAdded: 0,
    rolesRemoved: 0,
    skillsModified: 0,
    skillsAdded: 0,
    skillsRemoved: 0,
  };
  
  // Compare title
  if (textsAreDifferent(current.title, incoming.title)) {
    // Only create conflict if at least one has content
    if (hasContent(current.title) || hasContent(incoming.title)) {
      conflicts.title = {
        id: 'title',
        type: 'modified',
        section: 'title',
        current: current.title,
        incoming: incoming.title,
      };
    }
  }
  
  // Compare summary
  if (textsAreDifferent(current.summary, incoming.summary)) {
    if (hasContent(current.summary) || hasContent(incoming.summary)) {
      conflicts.summary = {
        id: 'summary',
        type: 'modified',
        section: 'summary',
        current: current.summary,
        incoming: incoming.summary,
      };
    }
  }
  
  // Compare roles
  const matchedIncomingRoles = new Set<string>();
  const matchedCurrentRoles = new Set<string>();
  
  // Find modified roles (roles in both that are different)
  for (const currentRole of current.roles) {
    const match = findBestRoleMatch(currentRole, incoming.roles);
    
    if (match) {
      matchedCurrentRoles.add(currentRole.id);
      matchedIncomingRoles.add(match.role.id);
      
      if (rolesAreDifferent(currentRole, match.role)) {
        conflicts.roles.push({
          id: `role-${currentRole.id}`,
          type: 'modified',
          section: 'role',
          current: currentRole,
          incoming: match.role,
          matchScore: match.score,
        });
        stats.rolesModified++;
      }
    }
  }
  
  // Find removed roles (in current but not in incoming)
  for (const currentRole of current.roles) {
    if (!matchedCurrentRoles.has(currentRole.id)) {
      conflicts.roles.push({
        id: `role-removed-${currentRole.id}`,
        type: 'removed',
        section: 'role',
        current: currentRole,
        incoming: null,
      });
      stats.rolesRemoved++;
    }
  }
  
  // Find added roles (in incoming but not matched)
  for (const incomingRole of incoming.roles) {
    if (!matchedIncomingRoles.has(incomingRole.id)) {
      conflicts.roles.push({
        id: `role-added-${incomingRole.id}`,
        type: 'added',
        section: 'role',
        current: null,
        incoming: incomingRole,
      });
      stats.rolesAdded++;
    }
  }
  
  // Compare skills
  const matchedIncomingSkills = new Set<string>();
  
  // Find modified skills
  for (const currentSkill of current.skills) {
    const incomingSkill = matchSkillByName(incoming.skills, currentSkill.name);
    
    if (incomingSkill) {
      matchedIncomingSkills.add(incomingSkill.name.toLowerCase());
      
      if (skillsAreDifferent(currentSkill, incomingSkill)) {
        conflicts.skills.push({
          id: `skill-${currentSkill.id}`,
          type: 'modified',
          section: 'skill',
          current: currentSkill,
          incoming: incomingSkill,
        });
        stats.skillsModified++;
      }
    } else {
      // Skill in current but not in incoming = removed
      conflicts.skills.push({
        id: `skill-removed-${currentSkill.id}`,
        type: 'removed',
        section: 'skill',
        current: currentSkill,
        incoming: null,
      });
      stats.skillsRemoved++;
    }
  }
  
  // Find added skills
  for (const incomingSkill of incoming.skills) {
    if (!matchedIncomingSkills.has(incomingSkill.name.toLowerCase())) {
      conflicts.skills.push({
        id: `skill-added-${incomingSkill.id}`,
        type: 'added',
        section: 'skill',
        current: null,
        incoming: incomingSkill,
      });
      stats.skillsAdded++;
    }
  }
  
  const totalConflicts = 
    (conflicts.title ? 1 : 0) +
    (conflicts.summary ? 1 : 0) +
    conflicts.roles.length +
    conflicts.skills.length;
  
  return {
    hasConflicts: totalConflicts > 0,
    totalConflicts,
    conflicts,
    stats,
  };
}

/**
 * Check if a specific conflict type should be shown
 * (Helps filter out minor/noise conflicts)
 */
export function isSignificantConflict(conflict: RoleConflict | SkillConflict): boolean {
  // Added/removed are always significant
  if (conflict.type === 'added' || conflict.type === 'removed') {
    return true;
  }
  
  // For modified roles, check if match score is high enough
  if (conflict.section === 'role' && 'matchScore' in conflict) {
    return (conflict.matchScore ?? 0) >= 0.5;
  }
  
  return true;
}
