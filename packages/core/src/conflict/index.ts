/**
 * Conflict Detection & Resolution
 * 
 * Utilities for comparing CVs and resolving import conflicts.
 */

// Types
export type {
  ConflictType,
  ConflictSection,
  ConflictResolution,
  BaseConflict,
  TextConflict,
  RoleConflict,
  SkillConflict,
  Conflict,
  ConflictAnalysis,
  ConflictResolutions,
} from './types';

// Detection
export {
  detectConflicts,
  isSignificantConflict,
} from './detect';

// Merge
export {
  mergeWithResolutions,
  createDefaultResolutions,
  acceptAllIncoming,
  keepAllCurrent,
} from './merge';
