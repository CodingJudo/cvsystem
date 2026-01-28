/**
 * Conflict Merge Logic
 * 
 * Applies user's conflict resolutions to produce a merged CV.
 */

import type { DomainCV, Role, Skill } from '@/domain/model/cv';
import type {
  ConflictAnalysis,
  ConflictResolutions,
  ConflictResolution,
} from './types';

/**
 * Apply conflict resolutions to create a merged CV
 * 
 * @param current - The current CV data
 * @param incoming - The incoming CV data (from import)
 * @param analysis - The conflict analysis
 * @param resolutions - User's resolution choices
 * @returns The merged CV
 */
export function mergeWithResolutions(
  current: DomainCV,
  incoming: DomainCV,
  analysis: ConflictAnalysis,
  resolutions: ConflictResolutions
): DomainCV {
  const hasAnyContacts = (cv: DomainCV): boolean => {
    const c = cv.contacts;
    return Boolean(c?.email || c?.phone || c?.address || c?.website);
  };

  // Start with a copy of current
  const merged: DomainCV = {
    ...current,
    name: { ...current.name },
    title: { ...current.title },
    summary: { ...current.summary },
    skills: [...current.skills],
    roles: [...current.roles],
  };

  // Non-conflict fields: prefer incoming when current is empty.
  if (!hasAnyContacts(current) && hasAnyContacts(incoming)) {
    merged.contacts = incoming.contacts ? { ...incoming.contacts } : incoming.contacts;
  }
  if (!current.photoDataUrl && incoming.photoDataUrl) {
    merged.photoDataUrl = incoming.photoDataUrl;
  }
  
  // Apply title resolution
  if (analysis.conflicts.title && resolutions.title) {
    if (resolutions.title === 'accept') {
      merged.title = { ...incoming.title };
    }
    // 'keep' or 'skip' means keep current (already set)
  }
  
  // Apply summary resolution
  if (analysis.conflicts.summary && resolutions.summary) {
    if (resolutions.summary === 'accept') {
      merged.summary = { ...incoming.summary };
    }
  }
  
  // Apply role resolutions
  merged.roles = applyRoleResolutions(
    current.roles,
    incoming.roles,
    analysis.conflicts.roles,
    resolutions.roles
  );
  
  // Apply skill resolutions
  merged.skills = applySkillResolutions(
    current.skills,
    incoming.skills,
    analysis.conflicts.skills,
    resolutions.skills
  );
  
  // Update metadata
  merged.updatedAt = new Date().toISOString();
  
  return merged;
}

/**
 * Apply resolutions to roles
 */
function applyRoleResolutions(
  currentRoles: Role[],
  incomingRoles: Role[],
  conflicts: ConflictAnalysis['conflicts']['roles'],
  resolutions: Record<string, ConflictResolution>
): Role[] {
  const result: Role[] = [];
  const handledCurrentIds = new Set<string>();
  const handledIncomingIds = new Set<string>();
  
  // Process each conflict
  for (const conflict of conflicts) {
    const resolution = resolutions[conflict.id];
    
    if (conflict.type === 'modified') {
      // Both exist, user chooses which to keep
      if (conflict.current) handledCurrentIds.add(conflict.current.id);
      if (conflict.incoming) handledIncomingIds.add(conflict.incoming.id);
      
      if (resolution === 'accept' && conflict.incoming) {
        result.push({ ...conflict.incoming });
      } else if (conflict.current) {
        // 'keep' or undefined = keep current
        result.push({ ...conflict.current });
      }
    } else if (conflict.type === 'added') {
      // Only in incoming
      if (conflict.incoming) {
        handledIncomingIds.add(conflict.incoming.id);
        
        if (resolution === 'accept') {
          result.push({ ...conflict.incoming });
        }
        // 'skip' or 'keep' = don't add
      }
    } else if (conflict.type === 'removed') {
      // Only in current
      if (conflict.current) {
        handledCurrentIds.add(conflict.current.id);
        
        if (resolution !== 'accept') {
          // 'keep' or undefined = keep the role
          result.push({ ...conflict.current });
        }
        // 'accept' (accept removal) = don't include
      }
    }
  }
  
  // Add remaining current roles that weren't in conflicts
  for (const role of currentRoles) {
    if (!handledCurrentIds.has(role.id)) {
      result.push({ ...role });
    }
  }
  
  // Sort by start date (most recent first)
  result.sort((a, b) => {
    const dateA = a.start ? new Date(a.start).getTime() : 0;
    const dateB = b.start ? new Date(b.start).getTime() : 0;
    return dateB - dateA;
  });
  
  return result;
}

/**
 * Apply resolutions to skills
 */
function applySkillResolutions(
  currentSkills: Skill[],
  incomingSkills: Skill[],
  conflicts: ConflictAnalysis['conflicts']['skills'],
  resolutions: Record<string, ConflictResolution>
): Skill[] {
  const result: Skill[] = [];
  const handledCurrentIds = new Set<string>();
  const handledIncomingNames = new Set<string>();
  
  // Process each conflict
  for (const conflict of conflicts) {
    const resolution = resolutions[conflict.id];
    
    if (conflict.type === 'modified') {
      if (conflict.current) handledCurrentIds.add(conflict.current.id);
      if (conflict.incoming) handledIncomingNames.add(conflict.incoming.name.toLowerCase());
      
      if (resolution === 'accept' && conflict.incoming) {
        // Accept incoming but preserve user overrides from current
        const merged: Skill = {
          ...conflict.incoming,
          // Keep user overrides if they exist
          overriddenYears: conflict.current?.overriddenYears,
          calculatedYears: conflict.current?.calculatedYears,
        };
        result.push(merged);
      } else if (conflict.current) {
        result.push({ ...conflict.current });
      }
    } else if (conflict.type === 'added') {
      if (conflict.incoming) {
        handledIncomingNames.add(conflict.incoming.name.toLowerCase());
        
        if (resolution === 'accept') {
          result.push({ ...conflict.incoming });
        }
      }
    } else if (conflict.type === 'removed') {
      if (conflict.current) {
        handledCurrentIds.add(conflict.current.id);
        
        if (resolution !== 'accept') {
          result.push({ ...conflict.current });
        }
      }
    }
  }
  
  // Add remaining current skills that weren't in conflicts
  for (const skill of currentSkills) {
    if (!handledCurrentIds.has(skill.id)) {
      result.push({ ...skill });
    }
  }
  
  // Sort alphabetically
  result.sort((a, b) => a.name.localeCompare(b.name));
  
  return result;
}

/**
 * Create default resolutions (accept all incoming)
 */
export function createDefaultResolutions(
  analysis: ConflictAnalysis,
  defaultChoice: ConflictResolution = 'keep'
): ConflictResolutions {
  const resolutions: ConflictResolutions = {
    roles: {},
    skills: {},
  };
  
  if (analysis.conflicts.title) {
    resolutions.title = defaultChoice;
  }
  
  if (analysis.conflicts.summary) {
    resolutions.summary = defaultChoice;
  }
  
  for (const conflict of analysis.conflicts.roles) {
    resolutions.roles[conflict.id] = defaultChoice;
  }
  
  for (const conflict of analysis.conflicts.skills) {
    resolutions.skills[conflict.id] = defaultChoice;
  }
  
  return resolutions;
}

/**
 * Accept all incoming changes
 */
export function acceptAllIncoming(analysis: ConflictAnalysis): ConflictResolutions {
  return createDefaultResolutions(analysis, 'accept');
}

/**
 * Keep all current values
 */
export function keepAllCurrent(analysis: ConflictAnalysis): ConflictResolutions {
  return createDefaultResolutions(analysis, 'keep');
}
