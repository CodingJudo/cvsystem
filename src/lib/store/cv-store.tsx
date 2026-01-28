'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DomainCV, Skill, Role, RoleSkill, Training, Education, Commitment, Contacts, FeaturedProject } from '@/domain/model/cv';
import type { GeisliCVMetadata, RawCinodeData } from '@/lib/file-formats/types';

// Storage key for localStorage
const STORAGE_KEY = 'cv-data';

/**
 * Normalize a CV object to ensure all required arrays exist
 * (handles old data that was saved before new fields were added)
 */
function normalizeCv(cv: DomainCV): DomainCV {
  return {
    ...cv,
    trainings: cv.trainings ?? [],
    educations: cv.educations ?? [],
    commitments: cv.commitments ?? [],
    photoDataUrl: cv.photoDataUrl ?? null,
    contacts: cv.contacts ?? { email: null, phone: null, address: null, website: null },
    featuredProjects: cv.featuredProjects ?? [],
  };
}

// Action types for CV editing
type CVAction =
  | { type: 'INIT'; cv: DomainCV }
  | { type: 'UPDATE_SUMMARY'; summary: DomainCV['summary'] }
  | { type: 'UPDATE_CONTACTS'; contacts: Contacts }
  | { type: 'UPDATE_PHOTO'; photoDataUrl: string | null }
  | { type: 'ADD_FEATURED_PROJECT'; project: FeaturedProject }
  | { type: 'UPDATE_FEATURED_PROJECT'; projectId: string; updates: Partial<Omit<FeaturedProject, 'id'>> }
  | { type: 'DELETE_FEATURED_PROJECT'; projectId: string }
  | { type: 'UPDATE_SKILL'; skill: Skill }
  | { type: 'ADD_SKILL'; skill: Skill }
  | { type: 'DELETE_SKILL'; skillId: string }
  | { type: 'REORDER_SKILLS'; skills: Skill[] }
  | { type: 'RESET_TO_ORIGINAL' }
  | { type: 'LOAD_FROM_STORAGE'; cv: DomainCV; metadata?: GeisliCVMetadata; rawCinode?: RawCinodeData | null }
  | { type: 'IMPORT_CV'; cv: DomainCV; metadata?: GeisliCVMetadata; rawCinode?: RawCinodeData | null }
  // Role actions
  | { type: 'ADD_ROLE'; role: Role }
  | { type: 'UPDATE_ROLE'; roleId: string; updates: Partial<Omit<Role, 'id' | 'skills'>> }
  | { type: 'DELETE_ROLE'; roleId: string }
  | { type: 'TOGGLE_ROLE_VISIBILITY'; roleId: string }
  | { type: 'ADD_ROLE_SKILL'; roleId: string; skill: RoleSkill; syncToMain?: boolean }
  | { type: 'REMOVE_ROLE_SKILL'; roleId: string; skillId: string }
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
  | { type: 'TOGGLE_COMMITMENT_VISIBILITY'; commitmentId: string };

interface CVState {
  /** The current (possibly edited) CV */
  cv: DomainCV | null;
  /** The original unedited CV for reset functionality */
  originalCv: DomainCV | null;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether state has been initialized */
  isInitialized: boolean;
  /** Import metadata */
  metadata: GeisliCVMetadata | null;
  /** Raw Cinode data preserved for conflict resolution */
  rawCinode: RawCinodeData | null;
}

const initialState: CVState = {
  cv: null,
  originalCv: null,
  hasChanges: false,
  isInitialized: false,
  metadata: null,
  rawCinode: null,
};

function cvReducer(state: CVState, action: CVAction): CVState {
  switch (action.type) {
    case 'INIT': {
      const cv = normalizeCv(action.cv);
      return {
        cv,
        originalCv: cv,
        hasChanges: false,
        isInitialized: true,
        metadata: state.metadata,
        rawCinode: state.rawCinode,
      };
    }

    case 'LOAD_FROM_STORAGE': {
      const cv = normalizeCv(action.cv);
      return {
        ...state,
        cv,
        hasChanges: true,
        metadata: action.metadata ?? state.metadata,
        rawCinode: action.rawCinode ?? state.rawCinode,
      };
    }

    case 'IMPORT_CV': {
      const cv = normalizeCv(action.cv);
      return {
        cv,
        originalCv: cv,
        hasChanges: false,
        isInitialized: true,
        metadata: action.metadata ?? null,
        rawCinode: action.rawCinode ?? null,
      };
    }

    case 'UPDATE_SUMMARY': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, summary: action.summary },
        hasChanges: true,
      };
    }

    case 'UPDATE_CONTACTS': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, contacts: action.contacts },
        hasChanges: true,
      };
    }

    case 'UPDATE_PHOTO': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, photoDataUrl: action.photoDataUrl },
        hasChanges: true,
      };
    }

    case 'ADD_FEATURED_PROJECT': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: {
          ...state.cv,
          featuredProjects: [action.project, ...(state.cv.featuredProjects ?? [])],
        },
        hasChanges: true,
      };
    }

    case 'UPDATE_FEATURED_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.featuredProjects ?? [];
      const updated = current.map((p) => (p.id === action.projectId ? { ...p, ...action.updates } : p));
      return {
        ...state,
        cv: { ...state.cv, featuredProjects: updated },
        hasChanges: true,
      };
    }

    case 'DELETE_FEATURED_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.featuredProjects ?? [];
      return {
        ...state,
        cv: { ...state.cv, featuredProjects: current.filter((p) => p.id !== action.projectId) },
        hasChanges: true,
      };
    }

    case 'UPDATE_SKILL': {
      if (!state.cv) return state;
      const updatedSkills = state.cv.skills.map((s) =>
        s.id === action.skill.id ? action.skill : s
      );
      return {
        ...state,
        cv: { ...state.cv, skills: updatedSkills },
        hasChanges: true,
      };
    }

    case 'ADD_SKILL': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, skills: [...state.cv.skills, action.skill] },
        hasChanges: true,
      };
    }

    case 'DELETE_SKILL': {
      if (!state.cv) return state;
      const filteredSkills = state.cv.skills.filter((s) => s.id !== action.skillId);
      return {
        ...state,
        cv: { ...state.cv, skills: filteredSkills },
        hasChanges: true,
      };
    }

    case 'REORDER_SKILLS': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, skills: action.skills },
        hasChanges: true,
      };
    }

    case 'RESET_TO_ORIGINAL': {
      if (!state.originalCv) return state;
      return {
        ...state,
        cv: state.originalCv,
        hasChanges: false,
        // Keep metadata and rawCinode
      };
    }

    case 'UPDATE_ROLE': {
      if (!state.cv) return state;
      const updatedRoles = state.cv.roles.map((r) =>
        r.id === action.roleId ? { ...r, ...action.updates } : r
      );
      return {
        ...state,
        cv: { ...state.cv, roles: updatedRoles },
        hasChanges: true,
      };
    }

    case 'TOGGLE_ROLE_VISIBILITY': {
      if (!state.cv) return state;
      const toggledRoles = state.cv.roles.map((r) =>
        r.id === action.roleId ? { ...r, visible: !r.visible } : r
      );
      return {
        ...state,
        cv: { ...state.cv, roles: toggledRoles },
        hasChanges: true,
      };
    }

    case 'ADD_ROLE_SKILL': {
      if (!state.cv) return state;
      
      // Add skill to the role
      const rolesWithSkill = state.cv.roles.map((r) => {
        if (r.id !== action.roleId) return r;
        // Check if skill already exists in role
        if (r.skills.some((s) => s.id === action.skill.id || s.name.toLowerCase() === action.skill.name.toLowerCase())) {
          return r;
        }
        return { ...r, skills: [...r.skills, action.skill] };
      });

      // Optionally sync to main skills
      let updatedSkills = state.cv.skills;
      if (action.syncToMain) {
        const skillExists = state.cv.skills.some(
          (s) => s.name.toLowerCase() === action.skill.name.toLowerCase()
        );
        if (!skillExists) {
          const mainSkill: Skill = {
            id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: action.skill.name,
            level: action.skill.level,
            years: 0,
          };
          updatedSkills = [...state.cv.skills, mainSkill];
        }
      }

      return {
        ...state,
        cv: { ...state.cv, roles: rolesWithSkill, skills: updatedSkills },
        hasChanges: true,
      };
    }

    case 'REMOVE_ROLE_SKILL': {
      if (!state.cv) return state;
      const rolesWithoutSkill = state.cv.roles.map((r) => {
        if (r.id !== action.roleId) return r;
        return { ...r, skills: r.skills.filter((s) => s.id !== action.skillId) };
      });
      return {
        ...state,
        cv: { ...state.cv, roles: rolesWithoutSkill },
        hasChanges: true,
      };
    }

    case 'ADD_ROLE': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, roles: [action.role, ...state.cv.roles] },
        hasChanges: true,
      };
    }

    case 'DELETE_ROLE': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, roles: state.cv.roles.filter((r) => r.id !== action.roleId) },
        hasChanges: true,
      };
    }

    // Training actions
    case 'ADD_TRAINING': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, trainings: [action.training, ...state.cv.trainings] },
        hasChanges: true,
      };
    }

    case 'UPDATE_TRAINING': {
      if (!state.cv) return state;
      const updatedTrainings = state.cv.trainings.map((t) =>
        t.id === action.trainingId ? { ...t, ...action.updates } : t
      );
      return {
        ...state,
        cv: { ...state.cv, trainings: updatedTrainings },
        hasChanges: true,
      };
    }

    case 'DELETE_TRAINING': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, trainings: state.cv.trainings.filter((t) => t.id !== action.trainingId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_TRAINING_VISIBILITY': {
      if (!state.cv) return state;
      const toggledTrainings = state.cv.trainings.map((t) =>
        t.id === action.trainingId ? { ...t, visible: !t.visible } : t
      );
      return {
        ...state,
        cv: { ...state.cv, trainings: toggledTrainings },
        hasChanges: true,
      };
    }

    // Education actions
    case 'ADD_EDUCATION': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, educations: [action.education, ...state.cv.educations] },
        hasChanges: true,
      };
    }

    case 'UPDATE_EDUCATION': {
      if (!state.cv) return state;
      const updatedEducations = state.cv.educations.map((e) =>
        e.id === action.educationId ? { ...e, ...action.updates } : e
      );
      return {
        ...state,
        cv: { ...state.cv, educations: updatedEducations },
        hasChanges: true,
      };
    }

    case 'DELETE_EDUCATION': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, educations: state.cv.educations.filter((e) => e.id !== action.educationId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_EDUCATION_VISIBILITY': {
      if (!state.cv) return state;
      const toggledEducations = state.cv.educations.map((e) =>
        e.id === action.educationId ? { ...e, visible: !e.visible } : e
      );
      return {
        ...state,
        cv: { ...state.cv, educations: toggledEducations },
        hasChanges: true,
      };
    }

    // Commitment actions
    case 'ADD_COMMITMENT': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, commitments: [action.commitment, ...state.cv.commitments] },
        hasChanges: true,
      };
    }

    case 'UPDATE_COMMITMENT': {
      if (!state.cv) return state;
      const updatedCommitments = state.cv.commitments.map((c) =>
        c.id === action.commitmentId ? { ...c, ...action.updates } : c
      );
      return {
        ...state,
        cv: { ...state.cv, commitments: updatedCommitments },
        hasChanges: true,
      };
    }

    case 'DELETE_COMMITMENT': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, commitments: state.cv.commitments.filter((c) => c.id !== action.commitmentId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_COMMITMENT_VISIBILITY': {
      if (!state.cv) return state;
      const toggledCommitments = state.cv.commitments.map((c) =>
        c.id === action.commitmentId ? { ...c, visible: !c.visible } : c
      );
      return {
        ...state,
        cv: { ...state.cv, commitments: toggledCommitments },
        hasChanges: true,
      };
    }

    default:
      return state;
  }
}

// Context
const CVStateContext = createContext<CVState | null>(null);
const CVDispatchContext = createContext<Dispatch<CVAction> | null>(null);

// Provider component
interface CVProviderProps {
  children: ReactNode;
  initialCv: DomainCV;
}

export function CVProvider({ children, initialCv }: CVProviderProps) {
  const [state, dispatch] = useReducer(cvReducer, initialState);

  // Initialize with the provided CV or load from localStorage
  useEffect(() => {
    // Try to load from localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Check if it's the new Geisli format
        if (parsed.format === 'geisli-cv' && parsed.cv) {
          const normalizedCv = normalizeCv(parsed.cv);
          dispatch({ 
            type: 'LOAD_FROM_STORAGE', 
            cv: normalizedCv,
            metadata: parsed.metadata,
            rawCinode: parsed.rawCinode,
          });
          dispatch({ type: 'INIT', cv: normalizedCv });
          return;
        }
        
        // Legacy format: raw CV object
        if (parsed.id && parsed.id === initialCv.id) {
          const normalizedCv = normalizeCv(parsed);
          dispatch({ type: 'INIT', cv: initialCv });
          dispatch({ type: 'LOAD_FROM_STORAGE', cv: normalizedCv });
          return;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // Fall back to initialCv
    dispatch({ type: 'INIT', cv: normalizeCv(initialCv) });
  }, [initialCv]);

  // Persist changes to localStorage using Geisli format
  useEffect(() => {
    if (state.isInitialized && state.cv) {
      try {
        const data = {
          format: 'geisli-cv',
          version: '1.0',
          metadata: state.metadata ?? {
            savedAt: new Date().toISOString(),
            importSource: null,
            importedAt: null,
            originalCinodeId: null,
            locales: state.cv.locales,
          },
          cv: state.cv,
          rawCinode: state.rawCinode,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [state.cv, state.isInitialized, state.metadata, state.rawCinode]);

  return (
    <CVStateContext.Provider value={state}>
      <CVDispatchContext.Provider value={dispatch}>
        {children}
      </CVDispatchContext.Provider>
    </CVStateContext.Provider>
  );
}

// Hooks
export function useCVState(): CVState {
  const context = useContext(CVStateContext);
  if (!context) {
    throw new Error('useCVState must be used within a CVProvider');
  }
  return context;
}

export function useCVDispatch(): Dispatch<CVAction> {
  const context = useContext(CVDispatchContext);
  if (!context) {
    throw new Error('useCVDispatch must be used within a CVProvider');
  }
  return context;
}

// Convenience hooks for common operations
export function useSkills() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    skills: state.cv?.skills ?? [],
    
    updateSkill: (skill: Skill) => {
      dispatch({ type: 'UPDATE_SKILL', skill });
    },
    
    addSkill: (skill: Omit<Skill, 'id'>) => {
      const newSkill: Skill = {
        ...skill,
        id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_SKILL', skill: newSkill });
      return newSkill;
    },
    
    deleteSkill: (skillId: string) => {
      dispatch({ type: 'DELETE_SKILL', skillId });
    },
    
    reorderSkills: (skills: Skill[]) => {
      dispatch({ type: 'REORDER_SKILLS', skills });
    },
  };
}

// Convenience hook for role operations
export function useRoles() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    roles: state.cv?.roles ?? [],
    
    /** Get only visible roles (for exports) */
    visibleRoles: (state.cv?.roles ?? []).filter((r) => r.visible),
    
    addRole: (role: Omit<Role, 'id'>) => {
      const newRole: Role = {
        ...role,
        id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_ROLE', role: newRole });
      return newRole;
    },
    
    updateRole: (roleId: string, updates: Partial<Omit<Role, 'id' | 'skills'>>) => {
      dispatch({ type: 'UPDATE_ROLE', roleId, updates });
    },
    
    deleteRole: (roleId: string) => {
      dispatch({ type: 'DELETE_ROLE', roleId });
    },
    
    toggleVisibility: (roleId: string) => {
      dispatch({ type: 'TOGGLE_ROLE_VISIBILITY', roleId });
    },
    
    addRoleSkill: (roleId: string, skill: Omit<RoleSkill, 'id'>, syncToMain = true) => {
      const newSkill: RoleSkill = {
        ...skill,
        id: `role-skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_ROLE_SKILL', roleId, skill: newSkill, syncToMain });
      return newSkill;
    },
    
    /** Add an existing skill (from main skills list) to a role */
    addExistingSkillToRole: (roleId: string, skill: Skill) => {
      const roleSkill: RoleSkill = {
        id: skill.id,
        name: skill.name,
        level: skill.level,
        category: null,
      };
      dispatch({ type: 'ADD_ROLE_SKILL', roleId, skill: roleSkill, syncToMain: false });
    },
    
    removeRoleSkill: (roleId: string, skillId: string) => {
      dispatch({ type: 'REMOVE_ROLE_SKILL', roleId, skillId });
    },
  };
}

// Convenience hook for training operations
export function useTrainings() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    trainings: state.cv?.trainings ?? [],
    
    /** Get only courses (trainingType = 0) */
    courses: (state.cv?.trainings ?? []).filter((t) => t.trainingType === 0),
    
    /** Get only certifications (trainingType = 1) */
    certifications: (state.cv?.trainings ?? []).filter((t) => t.trainingType === 1),
    
    /** Get only visible trainings */
    visibleTrainings: (state.cv?.trainings ?? []).filter((t) => t.visible),
    
    addTraining: (training: Omit<Training, 'id'>) => {
      const newTraining: Training = {
        ...training,
        id: `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_TRAINING', training: newTraining });
      return newTraining;
    },
    
    updateTraining: (trainingId: string, updates: Partial<Omit<Training, 'id'>>) => {
      dispatch({ type: 'UPDATE_TRAINING', trainingId, updates });
    },
    
    deleteTraining: (trainingId: string) => {
      dispatch({ type: 'DELETE_TRAINING', trainingId });
    },
    
    toggleVisibility: (trainingId: string) => {
      dispatch({ type: 'TOGGLE_TRAINING_VISIBILITY', trainingId });
    },
  };
}

// Convenience hook for education operations
export function useEducations() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    educations: state.cv?.educations ?? [],
    
    /** Get only visible educations */
    visibleEducations: (state.cv?.educations ?? []).filter((e) => e.visible),
    
    addEducation: (education: Omit<Education, 'id'>) => {
      const newEducation: Education = {
        ...education,
        id: `education-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_EDUCATION', education: newEducation });
      return newEducation;
    },
    
    updateEducation: (educationId: string, updates: Partial<Omit<Education, 'id'>>) => {
      dispatch({ type: 'UPDATE_EDUCATION', educationId, updates });
    },
    
    deleteEducation: (educationId: string) => {
      dispatch({ type: 'DELETE_EDUCATION', educationId });
    },
    
    toggleVisibility: (educationId: string) => {
      dispatch({ type: 'TOGGLE_EDUCATION_VISIBILITY', educationId });
    },
  };
}

// Convenience hook for commitment operations
export function useCommitments() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    commitments: state.cv?.commitments ?? [],
    
    /** Get only presentations */
    presentations: (state.cv?.commitments ?? []).filter((c) => c.commitmentType === 'presentation'),
    
    /** Get only publications */
    publications: (state.cv?.commitments ?? []).filter((c) => c.commitmentType === 'publication'),
    
    /** Get only visible commitments */
    visibleCommitments: (state.cv?.commitments ?? []).filter((c) => c.visible),
    
    addCommitment: (commitment: Omit<Commitment, 'id'>) => {
      const newCommitment: Commitment = {
        ...commitment,
        id: `commitment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_COMMITMENT', commitment: newCommitment });
      return newCommitment;
    },
    
    updateCommitment: (commitmentId: string, updates: Partial<Omit<Commitment, 'id'>>) => {
      dispatch({ type: 'UPDATE_COMMITMENT', commitmentId, updates });
    },
    
    deleteCommitment: (commitmentId: string) => {
      dispatch({ type: 'DELETE_COMMITMENT', commitmentId });
    },
    
    toggleVisibility: (commitmentId: string) => {
      dispatch({ type: 'TOGGLE_COMMITMENT_VISIBILITY', commitmentId });
    },
  };
}

export function useCVActions() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    hasChanges: state.hasChanges,

    updateSummary: (summary: DomainCV['summary']) => {
      dispatch({ type: 'UPDATE_SUMMARY', summary });
    },

    updateContacts: (contacts: Contacts) => {
      dispatch({ type: 'UPDATE_CONTACTS', contacts });
    },

    updatePhoto: (photoDataUrl: string | null) => {
      dispatch({ type: 'UPDATE_PHOTO', photoDataUrl });
    },

    addFeaturedProject: (project: Omit<FeaturedProject, 'id'>) => {
      const newProject: FeaturedProject = {
        ...project,
        id: `featured-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_FEATURED_PROJECT', project: newProject });
      return newProject;
    },

    updateFeaturedProject: (projectId: string, updates: Partial<Omit<FeaturedProject, 'id'>>) => {
      dispatch({ type: 'UPDATE_FEATURED_PROJECT', projectId, updates });
    },

    deleteFeaturedProject: (projectId: string) => {
      dispatch({ type: 'DELETE_FEATURED_PROJECT', projectId });
    },
    
    resetToOriginal: () => {
      dispatch({ type: 'RESET_TO_ORIGINAL' });
      // Note: We don't clear localStorage on reset, as the user might want to undo
    },
    
    clearStoredEdits: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    },
  };
}

// Hook for import/export operations
export function useCVImportExport() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    cv: state.cv,
    metadata: state.metadata,
    rawCinode: state.rawCinode,
    hasData: state.cv !== null,
    
    importCv: (
      cv: DomainCV, 
      metadata?: GeisliCVMetadata, 
      rawCinode?: RawCinodeData | null
    ) => {
      dispatch({ type: 'IMPORT_CV', cv, metadata, rawCinode });
    },
    
    getExportData: () => ({
      cv: state.cv,
      metadata: state.metadata,
      rawCinode: state.rawCinode,
    }),
  };
}
