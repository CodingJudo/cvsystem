'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
  type Dispatch,
} from 'react';
import type {
  DomainCV,
  Skill,
  Role,
  RoleSkill,
  RenderSpec,
  HobbyProject,
  Training,
  Education,
  Commitment,
  Contacts,
  FeaturedProject,
  CoverPageGroups,
  PrintBreakBefore,
} from '@cvsystem/core';
import type { CVMetadata, RawCinodeData } from '@cvsystem/core';
import { createCVFile } from '@cvsystem/core';
import type { CVAction, CVState } from './cv-types';
import { initialState } from './cv-types';
import { cvReducer, normalizeCv, createMinimalCv } from './cv-reducer';
import type { CVStorageAdapter } from '@cvsystem/core';
import { LocalStorageAdapter } from '@cvsystem/adapters-browser';

// Context
const CVStateContext = createContext<CVState | null>(null);
const CVDispatchContext = createContext<Dispatch<CVAction> | null>(null);
const CVStorageContext = createContext<CVStorageAdapter | null>(null);

// Provider component
interface CVProviderProps {
  children: ReactNode;
  initialCv: DomainCV;
  /** Override the persistence backend. Defaults to LocalStorageAdapter. Pass MemoryAdapter in tests. */
  storage?: CVStorageAdapter;
}

export function CVProvider({ children, initialCv, storage }: CVProviderProps) {
  const adapterRef = useRef<CVStorageAdapter>(storage ?? new LocalStorageAdapter());
  const [state, dispatch] = useReducer(cvReducer, initialState);

  // Initialize once on mount: load from storage or use initialCv. Do not re-run when
  // initialCv reference changes, or we would overwrite a freshly imported CV with minimal data.
  useEffect(() => {
    let cancelled = false;
    adapterRef.current.load().then((file) => {
      if (cancelled) return;
      if (file?.cv) {
        try {
          const normalizedCv = normalizeCv(file.cv);
          dispatch({
            type: 'LOAD_FROM_STORAGE',
            cv: normalizedCv,
            metadata: file.metadata as CVMetadata,
            rawCinode: file.rawCinode as RawCinodeData | null | undefined,
          });
          dispatch({ type: 'INIT', cv: normalizedCv });
          return;
        } catch {
          console.warn('[cv-store] Stored CV failed validation — falling back to initialCv');
        }
      }
      dispatch({ type: 'INIT', cv: normalizeCv(initialCv) });
    }).catch(() => {
      if (!cancelled) dispatch({ type: 'INIT', cv: normalizeCv(initialCv) });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run only once on mount so import is not overwritten when parent re-renders
  }, []);

  // Persist changes to storage
  useEffect(() => {
    if (state.isInitialized && state.cv) {
      const file = createCVFile(state.cv, {
        metadata: state.metadata ?? {
          savedAt: new Date().toISOString(),
          importSource: null,
          importedAt: null,
          originalCinodeId: null,
          locales: state.cv.locales,
        },
        rawCinode: state.rawCinode,
      });
      adapterRef.current.save(file as Parameters<CVStorageAdapter['save']>[0]).catch(() => {
        // Ignore save errors
      });
    }
  }, [state.cv, state.isInitialized, state.metadata, state.rawCinode]);

  return (
    <CVStateContext.Provider value={state}>
      <CVDispatchContext.Provider value={dispatch}>
        <CVStorageContext.Provider value={adapterRef.current}>
          {children}
        </CVStorageContext.Provider>
      </CVDispatchContext.Provider>
    </CVStateContext.Provider>
  );
}

/**
 * Read CV from the default storage backend (LocalStorageAdapter).
 * Use in preview so it shows the same data as the editor when the user has edited.
 * Returns null on SSR or if no stored data is found.
 */
export async function readCvFromStorage(): Promise<DomainCV | null> {
  const adapter = new LocalStorageAdapter();
  const file = await adapter.load();
  return file?.cv ? normalizeCv(file.cv) : null;
}

// Hooks
function useCVStorage(): CVStorageAdapter {
  const context = useContext(CVStorageContext);
  if (!context) {
    throw new Error('useCVStorage must be used within a CVProvider');
  }
  return context;
}

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

    /** Merge skills that only differ by case (e.g. React + react → one skill). */
    mergeDuplicateSkills: () => {
      dispatch({ type: 'MERGE_DUPLICATE_SKILLS' });
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
        visible: skill.visible ?? true, // Default to visible for new role skills
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
        visible: true, // Default to visible for new role skills
      };
      dispatch({ type: 'ADD_ROLE_SKILL', roleId, skill: roleSkill, syncToMain: false });
    },

    removeRoleSkill: (roleId: string, skillId: string) => {
      dispatch({ type: 'REMOVE_ROLE_SKILL', roleId, skillId });
    },

    updateRoleSkillLevel: (roleId: string, skillId: string, level: number) => {
      dispatch({ type: 'UPDATE_ROLE_SKILL_LEVEL', roleId, skillId, level });
    },

    toggleRoleSkillVisibility: (roleId: string, skillId: string) => {
      dispatch({ type: 'TOGGLE_ROLE_SKILL_VISIBILITY', roleId, skillId });
    },

    reorderRoleSkills: (roleId: string, skillIds: string[]) => {
      dispatch({ type: 'REORDER_ROLE_SKILLS', roleId, skillIds });
    },

    resetRoleSkillsToAlphabetical: (roleId: string) => {
      dispatch({ type: 'RESET_ROLE_SKILLS_ORDER', roleId });
    },
  };
}

// Convenience hook for hobby project operations
export function useHobbyProjects() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    hobbyProjects: state.cv?.hobbyProjects ?? [],

    visibleHobbyProjects: (state.cv?.hobbyProjects ?? []).filter((p) => p.visible),

    addHobbyProject: (project: Omit<HobbyProject, 'id'>) => {
      const newProject: HobbyProject = {
        ...project,
        id: `hobby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_HOBBY_PROJECT', project: newProject });
      return newProject;
    },

    updateHobbyProject: (
      projectId: string,
      updates: Partial<Omit<HobbyProject, 'id' | 'skills'>>,
    ) => {
      dispatch({ type: 'UPDATE_HOBBY_PROJECT', projectId, updates });
    },

    deleteHobbyProject: (projectId: string) => {
      dispatch({ type: 'DELETE_HOBBY_PROJECT', projectId });
    },

    toggleVisibility: (projectId: string) => {
      dispatch({ type: 'TOGGLE_HOBBY_PROJECT_VISIBILITY', projectId });
    },

    addHobbyProjectSkill: (projectId: string, skill: Omit<RoleSkill, 'id'>, syncToMain = true) => {
      const newSkill: RoleSkill = {
        ...skill,
        id: `hobby-skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        visible: skill.visible ?? true,
      };
      dispatch({ type: 'ADD_HOBBY_PROJECT_SKILL', projectId, skill: newSkill, syncToMain });
      return newSkill;
    },

    addExistingSkillToHobbyProject: (projectId: string, skill: Skill) => {
      const roleSkill: RoleSkill = {
        id: skill.id,
        name: skill.name,
        level: skill.level,
        category: null,
        visible: true,
      };
      dispatch({ type: 'ADD_HOBBY_PROJECT_SKILL', projectId, skill: roleSkill, syncToMain: false });
    },

    removeHobbyProjectSkill: (projectId: string, skillId: string) => {
      dispatch({ type: 'REMOVE_HOBBY_PROJECT_SKILL', projectId, skillId });
    },

    toggleHobbyProjectSkillVisibility: (projectId: string, skillId: string) => {
      dispatch({ type: 'TOGGLE_HOBBY_PROJECT_SKILL_VISIBILITY', projectId, skillId });
    },

    updateHobbyProjectSkillLevel: (projectId: string, skillId: string, level: number) => {
      dispatch({ type: 'UPDATE_HOBBY_PROJECT_SKILL_LEVEL', projectId, skillId, level });
    },

    reorderHobbyProjectSkills: (projectId: string, skillIds: string[]) => {
      dispatch({ type: 'REORDER_HOBBY_PROJECT_SKILLS', projectId, skillIds });
    },

    resetHobbyProjectSkillsToAlphabetical: (projectId: string) => {
      dispatch({ type: 'RESET_HOBBY_PROJECT_SKILLS_ORDER', projectId });
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
  const storage = useCVStorage();

  return {
    hasChanges: state.hasChanges,

    updateTitle: (title: DomainCV['title']) => {
      dispatch({ type: 'UPDATE_TITLE', title });
    },

    updateSummary: (summary: DomainCV['summary']) => {
      dispatch({ type: 'UPDATE_SUMMARY', summary });
    },

    updateContacts: (contacts: Contacts) => {
      dispatch({ type: 'UPDATE_CONTACTS', contacts });
    },

    updatePhoto: (photoDataUrl: string | null) => {
      dispatch({ type: 'UPDATE_PHOTO', photoDataUrl });
    },

    updateCoverPageGroups: (groups: CoverPageGroups) => {
      dispatch({ type: 'UPDATE_COVERPAGE_GROUPS', groups });
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

    toggleBreakBefore: (blockType: keyof PrintBreakBefore, itemId: string) => {
      dispatch({ type: 'TOGGLE_BREAK_BEFORE', blockType, itemId });
    },

    resetToOriginal: () => {
      dispatch({ type: 'RESET_TO_ORIGINAL' });
      // Note: We don't clear localStorage on reset, as the user might want to undo
    },

    clearStoredEdits: () => {
      storage.clear().catch(() => { /* Ignore */ });
    },

    /**
     * Clear stored CV and reset to a minimal/blank CV (keeps id and locales from seed).
     * Use when imported data is bad or you want to start from scratch.
     * Call with the server CV (e.g. initialCv) to use its id and locales.
     */
    clearAndUseMinimalCv: (seed: DomainCV) => {
      storage.clear().catch(() => { /* Ignore */ });
      dispatch({ type: 'RESET_TO_SERVER', cv: createMinimalCv(seed) });
    },
  };
}

// Convenience hook for RenderSpec CRUD + active-spec selection
export function useRenderSpecs() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    specs: state.cv?.renderSpecs ?? [],
    activeSpecId: state.cv?.activeRenderSpecId ?? null,
    activeSpec:
      (state.cv?.renderSpecs ?? []).find(
        (s) => s.id === state.cv?.activeRenderSpecId,
      ) ?? null,

    addSpec: (spec: Omit<RenderSpec, 'id'>) => {
      const newSpec: RenderSpec = {
        ...spec,
        id: `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      dispatch({ type: 'ADD_RENDER_SPEC', spec: newSpec });
      return newSpec;
    },

    updateSpec: (specId: string, updates: Partial<Omit<RenderSpec, 'id'>>) => {
      dispatch({ type: 'UPDATE_RENDER_SPEC', specId, updates });
    },

    removeSpec: (specId: string) => {
      dispatch({ type: 'DELETE_RENDER_SPEC', specId });
    },

    /** Set the active spec by id, or pass null to clear it (full CV mode). */
    setActiveSpec: (specId: string | null) => {
      dispatch({ type: 'SET_ACTIVE_RENDER_SPEC', specId });
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
      metadata?: CVMetadata,
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
