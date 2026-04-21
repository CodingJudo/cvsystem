'use client';

/**
 * Custom ontology store.
 *
 * Persists user-defined OntologySkill entries to localStorage under
 * 'cv-custom-ontology'. Separate from the CV file so entries are shared
 * across all CVs on this device.
 *
 * On every state change the store calls `setCustomOntologyEntries()` to
 * keep the effective merged ontology in sync.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import {
  getMindEntry,
  setCustomOntologyEntries,
  type OntologySkill,
} from '@/lib/ontology';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cv-custom-ontology';

function loadFromStorage(): OntologySkill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OntologySkill[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: OntologySkill[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// State & actions
// ---------------------------------------------------------------------------

interface OntologyState {
  entries: OntologySkill[];
}

type OntologyAction =
  | { type: 'LOAD_ENTRIES'; entries: OntologySkill[] }
  | { type: 'ADD_ENTRY'; entry: OntologySkill }
  | { type: 'UPDATE_ENTRY'; originalName: string; entry: OntologySkill }
  | { type: 'DELETE_ENTRY'; name: string };

function reducer(state: OntologyState, action: OntologyAction): OntologyState {
  switch (action.type) {
    case 'LOAD_ENTRIES':
      return { entries: action.entries };

    case 'ADD_ENTRY':
      // Guard: don't add a duplicate canonical name
      if (state.entries.some((e) => e.name.toLowerCase() === action.entry.name.toLowerCase())) {
        return state;
      }
      return { entries: [...state.entries, action.entry] };

    case 'UPDATE_ENTRY':
      return {
        entries: state.entries.map((e) =>
          e.name.toLowerCase() === action.originalName.toLowerCase() ? action.entry : e,
        ),
      };

    case 'DELETE_ENTRY':
      return {
        entries: state.entries.filter(
          (e) => e.name.toLowerCase() !== action.name.toLowerCase(),
        ),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface OntologyContextValue {
  entries: OntologySkill[];
  addEntry: (entry: OntologySkill) => void;
  updateEntry: (originalName: string, entry: OntologySkill) => void;
  deleteEntry: (name: string) => void;
  downloadEntries: () => void;
  /** True when `name` (case-insensitive) matches a canonical MIND entry — the custom entry overrides it. */
  isOverride: (name: string) => boolean;
}

const OntologyContext = createContext<OntologyContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function OntologyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { entries: [] });

  // Load persisted entries on mount
  useEffect(() => {
    const persisted = loadFromStorage();
    dispatch({ type: 'LOAD_ENTRIES', entries: persisted });
  }, []);

  // Persist + sync the effective ontology on every change
  useEffect(() => {
    saveToStorage(state.entries);
    setCustomOntologyEntries(state.entries);
  }, [state.entries]);

  const addEntry = useCallback((entry: OntologySkill) => {
    dispatch({ type: 'ADD_ENTRY', entry });
  }, []);

  const updateEntry = useCallback((originalName: string, entry: OntologySkill) => {
    dispatch({ type: 'UPDATE_ENTRY', originalName, entry });
  }, []);

  const deleteEntry = useCallback((name: string) => {
    dispatch({ type: 'DELETE_ENTRY', name });
  }, []);

  const downloadEntries = useCallback(() => {
    const json = JSON.stringify(state.entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ontology.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state.entries]);

  const isOverride = useCallback((name: string) => {
    return getMindEntry(name) !== null;
  }, []);

  return (
    <OntologyContext.Provider
      value={{ entries: state.entries, addEntry, updateEntry, deleteEntry, downloadEntries, isOverride }}
    >
      {children}
    </OntologyContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCustomOntology(): OntologyContextValue {
  const ctx = useContext(OntologyContext);
  if (!ctx) {
    throw new Error('useCustomOntology must be used inside <OntologyProvider>');
  }
  return ctx;
}
