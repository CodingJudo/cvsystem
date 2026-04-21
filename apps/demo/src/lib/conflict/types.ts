/**
 * Conflict Detection Types
 * 
 * Types for comparing CVs and detecting conflicts during import.
 */

import type { DomainCV, Role, Skill, BilingualText } from '@/domain/model/cv';

/**
 * Type of conflict detected
 */
export type ConflictType = 'modified' | 'added' | 'removed';

/**
 * Section of the CV where conflict was found
 */
export type ConflictSection = 'title' | 'summary' | 'role' | 'skill';

/**
 * User's choice for resolving a conflict
 */
export type ConflictResolution = 'keep' | 'accept' | 'skip';

/**
 * Base conflict interface
 */
export interface BaseConflict {
  id: string;
  type: ConflictType;
  section: ConflictSection;
  resolution?: ConflictResolution;
}

/**
 * Conflict in bilingual text field (title or summary)
 */
export interface TextConflict extends BaseConflict {
  section: 'title' | 'summary';
  current: BilingualText;
  incoming: BilingualText;
}

/**
 * Conflict in a role/work experience
 */
export interface RoleConflict extends BaseConflict {
  section: 'role';
  /** Current role (null if this is an added role) */
  current: Role | null;
  /** Incoming role (null if this is a removed role) */
  incoming: Role | null;
  /** Match score (0-1) indicating how confident we are these are the same role */
  matchScore?: number;
}

/**
 * Conflict in a skill
 */
export interface SkillConflict extends BaseConflict {
  section: 'skill';
  /** Current skill (null if this is an added skill) */
  current: Skill | null;
  /** Incoming skill (null if this is a removed skill) */
  incoming: Skill | null;
}

/**
 * Union type for all conflict types
 */
export type Conflict = TextConflict | RoleConflict | SkillConflict;

/**
 * Result of comparing two CVs
 */
export interface ConflictAnalysis {
  /** Whether there are any conflicts */
  hasConflicts: boolean;
  /** Total number of conflicts */
  totalConflicts: number;
  /** Conflicts by section */
  conflicts: {
    title: TextConflict | null;
    summary: TextConflict | null;
    roles: RoleConflict[];
    skills: SkillConflict[];
  };
  /** Summary statistics */
  stats: {
    rolesModified: number;
    rolesAdded: number;
    rolesRemoved: number;
    skillsModified: number;
    skillsAdded: number;
    skillsRemoved: number;
  };
}

/**
 * User's resolution choices for all conflicts
 */
export interface ConflictResolutions {
  title?: ConflictResolution;
  summary?: ConflictResolution;
  roles: Record<string, ConflictResolution>;
  skills: Record<string, ConflictResolution>;
}
