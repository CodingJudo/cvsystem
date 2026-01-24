'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DomainCV, Skill } from '@/domain/model/cv';

// Storage key for localStorage
const STORAGE_KEY = 'cv-edits';

// Action types for CV editing
type CVAction =
  | { type: 'INIT'; cv: DomainCV }
  | { type: 'UPDATE_SKILL'; skill: Skill }
  | { type: 'ADD_SKILL'; skill: Skill }
  | { type: 'DELETE_SKILL'; skillId: string }
  | { type: 'REORDER_SKILLS'; skills: Skill[] }
  | { type: 'RESET_TO_ORIGINAL' }
  | { type: 'LOAD_FROM_STORAGE'; cv: DomainCV };

interface CVState {
  /** The current (possibly edited) CV */
  cv: DomainCV | null;
  /** The original unedited CV for reset functionality */
  originalCv: DomainCV | null;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether state has been initialized */
  isInitialized: boolean;
}

const initialState: CVState = {
  cv: null,
  originalCv: null,
  hasChanges: false,
  isInitialized: false,
};

function cvReducer(state: CVState, action: CVAction): CVState {
  switch (action.type) {
    case 'INIT': {
      return {
        cv: action.cv,
        originalCv: action.cv,
        hasChanges: false,
        isInitialized: true,
      };
    }

    case 'LOAD_FROM_STORAGE': {
      return {
        ...state,
        cv: action.cv,
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

  // Initialize with the provided CV
  useEffect(() => {
    dispatch({ type: 'INIT', cv: initialCv });

    // Try to load edits from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load if it's for the same CV
        if (parsed.id === initialCv.id) {
          dispatch({ type: 'LOAD_FROM_STORAGE', cv: parsed });
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [initialCv]);

  // Persist changes to localStorage
  useEffect(() => {
    if (state.hasChanges && state.cv) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cv));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [state.cv, state.hasChanges]);

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

export function useCVActions() {
  const state = useCVState();
  const dispatch = useCVDispatch();

  return {
    hasChanges: state.hasChanges,
    
    resetToOriginal: () => {
      dispatch({ type: 'RESET_TO_ORIGINAL' });
      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
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
