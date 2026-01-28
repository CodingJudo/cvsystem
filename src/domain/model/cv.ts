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

export interface Contacts {
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
}

/**
 * A featured/highlighted project for a future cover page.
 * Typically references an existing role but has its own curated description.
 */
export interface FeaturedProject {
  id: string;
  /** Optional reference to an existing role/work experience */
  roleId: string | null;
  /** Display fields (usually copied from the referenced role) */
  company: string | null;
  roleTitle: string | null;
  description: BilingualText;
  /** Whether to include in exports/cover page */
  visible: boolean;
}

/**
 * A skill entry from the CV
 */
export interface Skill {
  id: string;
  name: string;
  level?: number | null;
  /** Number of years of experience from Cinode (original import) */
  years?: number | null;
  /** Calculated years from role durations where this skill is used */
  calculatedYears?: number | null;
  /** User-overridden years (when set, takes precedence over calculated) */
  overriddenYears?: number | null;
}

/**
 * Get the effective years for a skill (override > calculated > years)
 */
export function getEffectiveYears(skill: Skill): number | null {
  if (skill.overriddenYears !== undefined && skill.overriddenYears !== null) {
    return skill.overriddenYears;
  }
  if (skill.calculatedYears !== undefined && skill.calculatedYears !== null) {
    return skill.calculatedYears;
  }
  return skill.years ?? null;
}

/**
 * Check if a skill has a manual override
 */
export function hasOverride(skill: Skill): boolean {
  return skill.overriddenYears !== undefined && skill.overriddenYears !== null;
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
 * Training type enum
 * 0 = Course, 1 = Certification, 2 = Other
 */
export type TrainingType = 0 | 1 | 2;

/**
 * A training, course, or certification entry
 */
export interface Training {
  id: string;
  title: string;
  description: BilingualText;
  /** Organization that issued/provided the training */
  issuer: string | null;
  /** Year completed */
  year: number | null;
  /** Expiration date (for certifications) */
  expireDate: string | null;
  /** URL to certificate or course info */
  url: string | null;
  /** 0 = Course, 1 = Certification, 2 = Other */
  trainingType: TrainingType;
  /** Whether to include in exports */
  visible: boolean;
}

/**
 * A formal education entry
 */
export interface Education {
  id: string;
  /** School/University name */
  schoolName: string;
  /** Program/Degree name */
  programName: string | null;
  /** Degree type (M.Sc., B.Sc., PhD, etc.) */
  degree: string | null;
  description: BilingualText;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  ongoing: boolean;
  url: string | null;
  /** Whether to include in exports */
  visible: boolean;
}

/**
 * Commitment type for presentations, publications, etc.
 */
export type CommitmentType = 'presentation' | 'publication' | 'open-source' | 'volunteer' | 'other';

/**
 * A commitment entry (presentations, publications, volunteer work, etc.)
 */
export interface Commitment {
  id: string;
  title: string;
  description: BilingualText;
  /** Type of commitment */
  commitmentType: CommitmentType;
  /** Event/venue name (for presentations) or publisher (for publications) */
  venue: string | null;
  date: string | null;
  url: string | null;
  /** Whether to include in exports */
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
  contacts?: Contacts | null;
  /** Optional profile photo (data URL) */
  photoDataUrl?: string | null;
  /** Featured projects ("Utvalda projekt") */
  featuredProjects?: FeaturedProject[];
  /** All skills extracted from the CV */
  skills: Skill[];
  /** Work experiences / assignments / roles */
  roles: Role[];
  /** Courses and certifications */
  trainings: Training[];
  /** Formal education */
  educations: Education[];
  /** Presentations, publications, and other commitments */
  commitments: Commitment[];
}
