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
 * Additional cover-page groups (manual, editable lists).
 */
export interface CoverPageGroups {
  /** Roles (custom labels) to highlight on the cover page */
  roles: string[];
  /** Expert knowledge (custom list) */
  expertKnowledge: string[];
  /** Languages (free text list) */
  languages: string[];
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
  /**
   * Canonical skill name from the MIND tech ontology (e.g. "React").
   * Set when the user accepts a terminology suggestion or manually links the skill.
   * Used to resolve synonyms and enable ontology-based hierarchy lookups.
   */
  ontologyRef?: string | null;
  /**
   * Display label used when this skill is collapsed in a RenderSpec (e.g. ".NET").
   * Skills sharing the same groupAs value merge into a single display entry.
   * When null, the skill is always shown individually.
   */
  groupAs?: string | null;
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
  /**
   * Whether to show this skill for this role in exports.
   * Presentation only: hidden skills still count for year calculations and remain in the main skills list.
   */
  visible?: boolean;
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
  /** Custom order of skill IDs. If undefined, skills are sorted alphabetically. */
  skillOrder?: string[];
}

/**
 * A hobby/small project entry
 */
export interface HobbyProject {
  id: string;
  title: string | null;
  /** Optional project URL/repository link */
  url?: string | null;
  start?: string | null;
  end?: string | null;
  /** Whether this project is ongoing */
  isCurrent?: boolean;
  description: BilingualText;
  /** Technologies/skills used in this project */
  skills: RoleSkill[];
  /** Whether to include this project in exports/preview */
  visible: boolean;
  /** Custom order of skill IDs. If undefined, skills are sorted alphabetically. */
  skillOrder?: string[];
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
  /** When true, description is hidden in print; in edit mode shown faded. Default false (show description). */
  hideDescription?: boolean;
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
  /** When true, description is hidden in print; in edit mode shown faded. Default false (show description). */
  hideDescription?: boolean;
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
 * Per-audience presentation configuration.
 *
 * Controls which skills are shown individually vs. collapsed under their groupAs label,
 * and which CV items are hidden for this specific audience/assignment.
 *
 * The competence/skills section always shows all skills individually regardless of this spec.
 * Grouping applies only to role-level skill display.
 */
export interface RenderSpec {
  id: string;
  /** Human-readable label, e.g. "Java team", "Management", "Generic" */
  name: string;
  locale: Locale;
  /**
   * Default skill display mode for role-level skills.
   * - 'individual': show each skill as stored (default behaviour)
   * - 'grouped': collapse skills by their groupAs value; skills without groupAs shown individually
   */
  skillDisplay: 'individual' | 'grouped';
  /**
   * Per-groupAs key overrides. Allows fine-grained control:
   * e.g. { ".NET": "individual" } forces .NET skills to always show individually
   * even when the default is 'grouped'.
   */
  skillOverrides?: Record<string, 'individual' | 'grouped'>;
  /** Items to hide in this spec's output. Does not affect the skills section. */
  hiddenItemIds?: {
    roles?: string[];
    trainings?: string[];
    educations?: string[];
    commitments?: string[];
    hobbyProjects?: string[];
  };
}

/**
 * Item ids that should have a page break before them when printing (Phase 4).
 * Key = block type; value = array of item ids (role id, education id, etc.).
 */
export interface PrintBreakBefore {
  experience?: string[];
  'hobby-projects'?: string[];
  education?: string[];
  'courses-certification'?: string[];
  commitments?: string[];
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
  /** Additional cover-page highlight groups */
  coverPageGroups?: CoverPageGroups;
  /** Item ids that should have a page break before them when printing (Phase 4) */
  printBreakBefore?: PrintBreakBefore | null;
  /** Audience-specific presentation specs (Phase B) */
  renderSpecs?: RenderSpec[];
  /** The active RenderSpec id, or null for default flat rendering */
  activeRenderSpecId?: string | null;
  /** All skills extracted from the CV */
  skills: Skill[];
  /** Work experiences / assignments / roles */
  roles: Role[];
  /** Hobby/small projects */
  hobbyProjects?: HobbyProject[];
  /** Courses and certifications */
  trainings: Training[];
  /** Formal education */
  educations: Education[];
  /** Presentations, publications, and other commitments */
  commitments: Commitment[];
}

/**
 * Create a minimal/blank CV (no fixture data).
 * Used when the app starts without auto-loading fixtures so the user can import on demand.
 */
export function createMinimalCv(): DomainCV {
  return {
    id: 'cv-minimal',
    locales: ['sv', 'en'],
    name: { first: null, last: null },
    title: { sv: null, en: null },
    summary: { sv: null, en: null },
    contacts: { email: null, phone: null, address: null, website: null },
    photoDataUrl: null,
    featuredProjects: [],
    coverPageGroups: { roles: [], expertKnowledge: [], languages: [] },
    printBreakBefore: null,
    skills: [],
    roles: [],
    hobbyProjects: [],
    trainings: [],
    educations: [],
    commitments: [],
  };
}
