import type {
  DomainCV,
  Skill,
  Role,
  RoleSkill,
  HobbyProject,
  Training,
  Education,
  Commitment,
  Contacts,
  FeaturedProject,
  CoverPageGroups,
  PrintBreakBefore,
  RenderSpec,
} from '@cvsystem/core';
import type { CVMetadata, RawCinodeData } from '@cvsystem/core';

// Action types for CV editing
export type CVAction =
  | { type: 'INIT'; cv: DomainCV }
  | { type: 'UPDATE_TITLE'; title: DomainCV['title'] }
  | { type: 'UPDATE_SUMMARY'; summary: DomainCV['summary'] }
  | { type: 'UPDATE_CONTACTS'; contacts: Contacts }
  | { type: 'UPDATE_PHOTO'; photoDataUrl: string | null }
  | { type: 'UPDATE_COVERPAGE_GROUPS'; groups: CoverPageGroups }
  | { type: 'ADD_FEATURED_PROJECT'; project: FeaturedProject }
  | { type: 'UPDATE_FEATURED_PROJECT'; projectId: string; updates: Partial<Omit<FeaturedProject, 'id'>> }
  | { type: 'DELETE_FEATURED_PROJECT'; projectId: string }
  | { type: 'ADD_HOBBY_PROJECT'; project: HobbyProject }
  | { type: 'UPDATE_HOBBY_PROJECT'; projectId: string; updates: Partial<Omit<HobbyProject, 'id' | 'skills'>> }
  | { type: 'DELETE_HOBBY_PROJECT'; projectId: string }
  | { type: 'TOGGLE_HOBBY_PROJECT_VISIBILITY'; projectId: string }
  | { type: 'ADD_HOBBY_PROJECT_SKILL'; projectId: string; skill: RoleSkill; syncToMain?: boolean }
  | { type: 'REMOVE_HOBBY_PROJECT_SKILL'; projectId: string; skillId: string }
  | { type: 'TOGGLE_HOBBY_PROJECT_SKILL_VISIBILITY'; projectId: string; skillId: string }
  | { type: 'UPDATE_HOBBY_PROJECT_SKILL_LEVEL'; projectId: string; skillId: string; level: number }
  | { type: 'REORDER_HOBBY_PROJECT_SKILLS'; projectId: string; skillIds: string[] }
  | { type: 'RESET_HOBBY_PROJECT_SKILLS_ORDER'; projectId: string }
  | { type: 'UPDATE_SKILL'; skill: Skill }
  | { type: 'ADD_SKILL'; skill: Skill }
  | { type: 'DELETE_SKILL'; skillId: string }
  | { type: 'REORDER_SKILLS'; skills: Skill[] }
  | { type: 'MERGE_DUPLICATE_SKILLS' }
  | { type: 'RESET_TO_ORIGINAL' }
  | { type: 'RESET_TO_SERVER'; cv: DomainCV }
  | { type: 'LOAD_FROM_STORAGE'; cv: DomainCV; metadata?: CVMetadata; rawCinode?: RawCinodeData | null }
  | { type: 'IMPORT_CV'; cv: DomainCV; metadata?: CVMetadata; rawCinode?: RawCinodeData | null }
  // Role actions
  | { type: 'ADD_ROLE'; role: Role }
  | { type: 'UPDATE_ROLE'; roleId: string; updates: Partial<Omit<Role, 'id' | 'skills'>> }
  | { type: 'DELETE_ROLE'; roleId: string }
  | { type: 'TOGGLE_ROLE_VISIBILITY'; roleId: string }
  | { type: 'ADD_ROLE_SKILL'; roleId: string; skill: RoleSkill; syncToMain?: boolean }
  | { type: 'REMOVE_ROLE_SKILL'; roleId: string; skillId: string }
  | { type: 'UPDATE_ROLE_SKILL_LEVEL'; roleId: string; skillId: string; level: number }
  | { type: 'TOGGLE_ROLE_SKILL_VISIBILITY'; roleId: string; skillId: string }
  | { type: 'REORDER_ROLE_SKILLS'; roleId: string; skillIds: string[] }
  | { type: 'RESET_ROLE_SKILLS_ORDER'; roleId: string }
  // Training actions
  | { type: 'ADD_TRAINING'; training: Training }
  | { type: 'UPDATE_TRAINING'; trainingId: string; updates: Partial<Omit<Training, 'id'>> }
  | { type: 'DELETE_TRAINING'; trainingId: string }
  | { type: 'TOGGLE_TRAINING_VISIBILITY'; trainingId: string }
  // Education actions
  | { type: 'ADD_EDUCATION'; education: Education }
  | { type: 'UPDATE_EDUCATION'; educationId: string; updates: Partial<Omit<Education, 'id'>> }
  | { type: 'DELETE_EDUCATION'; educationId: string }
  | { type: 'TOGGLE_EDUCATION_VISIBILITY'; educationId: string }
  // Commitment actions
  | { type: 'ADD_COMMITMENT'; commitment: Commitment }
  | { type: 'UPDATE_COMMITMENT'; commitmentId: string; updates: Partial<Omit<Commitment, 'id'>> }
  | { type: 'DELETE_COMMITMENT'; commitmentId: string }
  | { type: 'TOGGLE_COMMITMENT_VISIBILITY'; commitmentId: string }
  // Print break-before (Phase 4): page break before a specific item inside a block
  | { type: 'TOGGLE_BREAK_BEFORE'; blockType: keyof PrintBreakBefore; itemId: string }
  // RenderSpec actions (Phase B)
  | { type: 'ADD_RENDER_SPEC'; spec: RenderSpec }
  | { type: 'UPDATE_RENDER_SPEC'; specId: string; updates: Partial<Omit<RenderSpec, 'id'>> }
  | { type: 'DELETE_RENDER_SPEC'; specId: string }
  | { type: 'SET_ACTIVE_RENDER_SPEC'; specId: string | null }
  // Skill ontology actions (Phase B)
  | { type: 'UPDATE_SKILL_ONTOLOGY_REF'; skillId: string; ontologyRef: string | null }
  | { type: 'UPDATE_SKILL_GROUP_AS'; skillId: string; groupAs: string | null };

export interface CVState {
  /** The current (possibly edited) CV */
  cv: DomainCV | null;
  /** The original unedited CV for reset functionality */
  originalCv: DomainCV | null;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether state has been initialized */
  isInitialized: boolean;
  /** Import metadata */
  metadata: CVMetadata | null;
  /** Raw Cinode data preserved for conflict resolution */
  rawCinode: RawCinodeData | null;
}

export const initialState: CVState = {
  cv: null,
  originalCv: null,
  hasChanges: false,
  isInitialized: false,
  metadata: null,
  rawCinode: null,
};
