/**
 * Domain CV Model
 *
 * A minimal, normalized, bilingual CV structure derived from Cinode JSON exports.
 * This model is stable and safe for UI rendering and exports.
 */

export type Locale = 'sv' | 'en';

/**
 * Bilingual text field - stores both Swedish and English versions
 */
export interface BilingualText {
  sv: string | null;
  en: string | null;
}

/**
 * A skill entry from the CV
 */
export interface Skill {
  id: string;
  name: string;
  level?: number | null;
  /** Number of years of experience (derived from numberOfDaysWorkExperience) */
  years?: number | null;
}

/**
 * A skill/technology linked to a specific role
 */
export interface RoleSkill {
  id: string;
  name: string;
  level?: number | null;
  /** Category: Techniques, Tools, Platforms, etc. (from keywordTypeName) */
  category?: string | null;
}

/**
 * A work experience / role / assignment entry
 */
export interface Role {
  id: string;
  title: string | null;
  company: string | null;
  /** Location (city, country) */
  location?: string | null;
  start?: string | null;
  end?: string | null;
  /** Whether this is the current role (no end date) */
  isCurrent?: boolean;
  description: BilingualText;
  /** Technologies/skills used in this role */
  skills: RoleSkill[];
  /** Whether to include this role in exports (maps to !disabled in Cinode) */
  visible: boolean;
}

/**
 * The main Domain CV model
 *
 * This is the normalized representation of a CV that can be used
 * across the application for display, editing, and export.
 */
export interface DomainCV {
  /** Unique identifier for this CV */
  id: string;
  /** Which locales are available in this CV */
  locales: Locale[];
  /** When the CV was last updated */
  updatedAt?: string | null;
  /** The CV owner's name */
  name: {
    first: string | null;
    last: string | null;
  };
  /** Professional title */
  title: BilingualText;
  /** Summary/about text */
  summary: BilingualText;
  /** All skills extracted from the CV */
  skills: Skill[];
  /** Work experiences / assignments / roles */
  roles: Role[];
}
