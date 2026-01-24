/**
 * Cinode JSON Extraction
 *
 * Extracts a normalized DomainCV from raw Cinode JSON exports (Swedish and English).
 * See paths.md for documentation of which JSON paths are mapped.
 */

import type { DomainCV, Skill, Role, RoleSkill, Locale, BilingualText } from '../model/cv';

/**
 * Result of extracting a DomainCV from Cinode JSON
 */
export interface ExtractionResult {
  /** The original raw JSON data, preserved for future use */
  raw: { sv: unknown; en: unknown };
  /** The extracted, normalized CV */
  cv: DomainCV;
  /** Warnings about missing or unexpected data */
  warnings: string[];
}

// Type guards and helpers for safe access
type CinodeJson = Record<string, unknown>;
type CinodeBlock = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getString(obj: unknown, path: string): string | null {
  if (!isObject(obj)) return null;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (!isObject(current)) return null;
    current = current[part];
  }

  return typeof current === 'string' ? current : null;
}

function getNumber(obj: unknown, path: string): number | null {
  if (!isObject(obj)) return null;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (!isObject(current)) return null;
    current = current[part];
  }

  return typeof current === 'number' ? current : null;
}

function getArray(obj: unknown, path: string): unknown[] | null {
  if (!isObject(obj)) return null;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (!isObject(current)) return null;
    current = current[part];
  }

  return isArray(current) ? current : null;
}

function getBoolean(obj: unknown, path: string): boolean | null {
  if (!isObject(obj)) return null;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (!isObject(current)) return null;
    current = current[part];
  }

  return typeof current === 'boolean' ? current : null;
}

/**
 * Find a block by its friendlyBlockName
 */
function findBlock(blocks: unknown[], blockName: string): CinodeBlock | null {
  for (const block of blocks) {
    if (isObject(block) && block.friendlyBlockName === blockName) {
      return block;
    }
  }
  return null;
}

/**
 * Detect locale from raw Cinode JSON
 */
function detectLocale(raw: unknown): Locale | null {
  if (!isObject(raw)) return null;

  const languageCountry = getString(raw, 'languageCountry');
  if (languageCountry === 'se' || languageCountry === 'sv') return 'sv';
  if (languageCountry === 'en' || languageCountry === 'gb' || languageCountry === 'us') return 'en';

  // Fallback: check language field
  const language = getString(raw, 'language');
  if (language?.toLowerCase().includes('svenska')) return 'sv';
  if (language?.toLowerCase().includes('english')) return 'en';

  return null;
}

/**
 * Extract summary/description from Presentation block
 */
function extractSummary(raw: unknown, warnings: string[]): string | null {
  const blocks = getArray(raw, 'resume.blocks');
  if (!blocks) {
    warnings.push('Missing resume.blocks array');
    return null;
  }

  const presentationBlock = findBlock(blocks, 'Presentation');
  if (!presentationBlock) {
    warnings.push('Missing Presentation block');
    return null;
  }

  return getString(presentationBlock, 'description');
}

/**
 * Extract professional title from Presentation block
 */
function extractTitle(raw: unknown): string | null {
  const blocks = getArray(raw, 'resume.blocks');
  if (!blocks) return null;

  const presentationBlock = findBlock(blocks, 'Presentation');
  if (!presentationBlock) return null;

  return getString(presentationBlock, 'title');
}

/**
 * Extract skills from multiple blocks: SkillsByCategory, Skills, TopSkills
 */
function extractSkills(raw: unknown, warnings: string[]): Skill[] {
  const blocks = getArray(raw, 'resume.blocks');
  if (!blocks) return [];

  const skills: Skill[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // Helper to add a skill with deduplication
  const addSkill = (skill: unknown) => {
    if (!isObject(skill)) return;

    const id = getString(skill, 'id') ?? getString(skill, 'blockItemId');
    const name = getString(skill, 'name');

    if (!name) return;
    
    // Deduplicate by ID or name
    const normalizedName = name.toLowerCase();
    if (id && seenIds.has(id)) return;
    if (seenNames.has(normalizedName)) return;

    if (id) seenIds.add(id);
    seenNames.add(normalizedName);

    const level = getNumber(skill, 'level');
    const daysExperience = getNumber(skill, 'numberOfDaysWorkExperience');
    const years = daysExperience ? Math.round(daysExperience / 365) : null;

    skills.push({
      id: id ?? `skill-${skills.length}`,
      name,
      level,
      years,
    });
  };

  // 1. Extract from SkillsByCategory (grouped skills)
  const skillsByCategoryBlock = findBlock(blocks, 'SkillsByCategory');
  if (skillsByCategoryBlock) {
    const data = getArray(skillsByCategoryBlock, 'data');
    if (data) {
      for (const category of data) {
        if (!isObject(category)) continue;
        const categorySkills = getArray(category, 'skills');
        if (categorySkills) {
          for (const skill of categorySkills) {
            addSkill(skill);
          }
        }
      }
    }
  }

  // 2. Extract from TopSkills (highlighted skills)
  const topSkillsBlock = findBlock(blocks, 'TopSkills');
  if (topSkillsBlock) {
    const data = getArray(topSkillsBlock, 'data');
    if (data) {
      for (const item of data) {
        if (!isObject(item)) continue;
        // TopSkills might have skill nested or directly
        const nestedSkill = item.skill;
        if (isObject(nestedSkill)) {
          addSkill(nestedSkill);
        } else {
          addSkill(item);
        }
      }
    }
  }

  // 3. Extract from Skills (full skill list)
  const skillsBlock = findBlock(blocks, 'Skills');
  if (skillsBlock) {
    const data = getArray(skillsBlock, 'data');
    if (data) {
      for (const item of data) {
        if (!isObject(item)) continue;
        // Skills block might have skill nested or directly
        const nestedSkill = item.skill;
        if (isObject(nestedSkill)) {
          addSkill(nestedSkill);
        } else {
          addSkill(item);
        }
      }
    }
  }

  if (skills.length === 0) {
    warnings.push('No skills found in any skills block');
  }

  return skills;
}

/**
 * Extract skills linked to a specific role/work experience
 */
function extractRoleSkills(item: Record<string, unknown>): RoleSkill[] {
  const skillsArray = getArray(item, 'skills');
  if (!skillsArray) return [];

  const roleSkills: RoleSkill[] = [];
  const seenIds = new Set<string>();

  for (const skill of skillsArray) {
    if (!isObject(skill)) continue;

    const id = getString(skill, 'id') ?? getString(skill, 'blockItemId');
    const name = getString(skill, 'name');

    if (!name) continue;
    if (id && seenIds.has(id)) continue;
    if (id) seenIds.add(id);

    const level = getNumber(skill, 'level');
    const category = getString(skill, 'keywordTypeName');

    roleSkills.push({
      id: id ?? `role-skill-${roleSkills.length}`,
      name,
      level,
      category,
    });
  }

  return roleSkills;
}

/**
 * Extract location string from Cinode location object
 */
function extractLocation(item: Record<string, unknown>): string | null {
  if (!isObject(item.location)) return null;
  
  const location = item.location as Record<string, unknown>;
  const city = getString(location, 'city');
  const country = getString(location, 'country');
  
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  
  // Fallback to formattedAddress
  return getString(location, 'formattedAddress');
}

/**
 * Extract work experiences from the relevant blocks
 * Cinode uses different block types: HighlightedWorkExperiences, WorkExperiences
 */
function extractRoles(
  rawSv: unknown,
  rawEn: unknown,
  warnings: string[]
): Role[] {
  const blocksSv = getArray(rawSv, 'resume.blocks');
  const blocksEn = getArray(rawEn, 'resume.blocks');

  // Work experience block names in order of preference
  const workBlockNames = ['WorkExperiences', 'HighlightedWorkExperiences'];

  let dataSv: unknown[] | null = null;
  let dataEn: unknown[] | null = null;

  // Extract from Swedish blocks
  if (blocksSv) {
    for (const preferredName of workBlockNames) {
      const block = findBlock(blocksSv, preferredName);
      if (block) {
        const data = getArray(block, 'data');
        if (data && data.length > 0) {
          dataSv = data;
          break;
        }
      }
    }
  }

  // Extract from English blocks
  if (blocksEn) {
    for (const preferredName of workBlockNames) {
      const block = findBlock(blocksEn, preferredName);
      if (block) {
        const data = getArray(block, 'data');
        if (data && data.length > 0) {
          dataEn = data;
          break;
        }
      }
    }
  }

  if (!dataSv && !dataEn) {
    warnings.push('No work experience data found in any block');
    return [];
  }

  // Use Swedish as primary, English for descriptions
  const primaryData = dataSv ?? dataEn ?? [];
  const secondaryData = dataEn ?? dataSv ?? [];

  const roles: Role[] = [];

  for (let i = 0; i < primaryData.length; i++) {
    const itemSv = primaryData[i];
    const itemEn = secondaryData[i]; // May be undefined if lengths differ

    if (!isObject(itemSv)) continue;

    const id = getString(itemSv, 'id') ?? getString(itemSv, 'blockItemId') ?? `role-${i}`;
    const title = getString(itemSv, 'title');
    const employer = getString(itemSv, 'employer');
    const startDate = getString(itemSv, 'startDate');
    const endDate = getString(itemSv, 'endDate');
    const isCurrent = itemSv.isCurrent === true;

    // Extract location from the item
    const location = extractLocation(itemSv);

    // Extract skills/technologies linked to this role
    // Prefer English skills (usually have more data), fall back to Swedish
    const roleSkills = isObject(itemEn) 
      ? extractRoleSkills(itemEn as Record<string, unknown>)
      : extractRoleSkills(itemSv);

    // Visibility: visible = !disabled (disabled means hidden in Cinode)
    const disabled = getBoolean(itemSv, 'disabled');
    const visible = disabled === null ? true : !disabled;

    const descriptionSv = getString(itemSv, 'description');
    const descriptionEn = isObject(itemEn) ? getString(itemEn, 'description') : null;

    roles.push({
      id,
      title,
      company: employer,
      location,
      start: startDate,
      end: endDate,
      isCurrent,
      description: {
        sv: descriptionSv,
        en: descriptionEn,
      },
      skills: roleSkills,
      visible,
    });
  }

  return roles;
}

/**
 * Main extraction function
 *
 * Takes raw Cinode JSON exports (Swedish and English) and produces
 * a normalized DomainCV with warnings for any missing or unexpected data.
 */
export function extractCv(rawSv: unknown, rawEn: unknown): ExtractionResult {
  const warnings: string[] = [];

  // Detect locales
  const locales: Locale[] = [];
  const localeSv = detectLocale(rawSv);
  const localeEn = detectLocale(rawEn);

  if (localeSv === 'sv') locales.push('sv');
  else warnings.push(`Could not detect Swedish locale (got: ${localeSv})`);

  if (localeEn === 'en') locales.push('en');
  else warnings.push(`Could not detect English locale (got: ${localeEn})`);

  // Extract basic info (prefer Swedish, fallback to English)
  const primary = isObject(rawSv) ? rawSv : rawEn;
  
  // ID can be number or string in Cinode JSON
  let id = 'unknown';
  if (isObject(primary)) {
    const rawId = primary.id;
    if (typeof rawId === 'number' || typeof rawId === 'string') {
      id = String(rawId);
    }
  }
  const updatedAt = getString(rawSv, 'updated') ?? getString(rawEn, 'updated');

  // Name
  const firstName = getString(rawSv, 'userFirstname') ?? getString(rawEn, 'userFirstname');
  const lastName = getString(rawSv, 'userLastname') ?? getString(rawEn, 'userLastname');

  // Title (bilingual)
  const titleSv = extractTitle(rawSv);
  const titleEn = extractTitle(rawEn);

  // Summary (bilingual)
  const summarySv = extractSummary(rawSv, warnings);
  const summaryEn = extractSummary(rawEn, warnings);

  // Skills (merge from both, deduplicate)
  const skillsSv = extractSkills(rawSv, warnings);
  const skillsEn = extractSkills(rawEn, warnings);

  // Merge skills, preferring Swedish names but keeping unique entries
  const skillsMap = new Map<string, Skill>();
  for (const skill of skillsSv) {
    skillsMap.set(skill.id, skill);
  }
  for (const skill of skillsEn) {
    if (!skillsMap.has(skill.id)) {
      skillsMap.set(skill.id, skill);
    }
  }
  const skills = Array.from(skillsMap.values());

  // Roles (bilingual descriptions)
  const roles = extractRoles(rawSv, rawEn, warnings);

  const cv: DomainCV = {
    id,
    locales,
    updatedAt,
    name: {
      first: firstName,
      last: lastName,
    },
    title: {
      sv: titleSv,
      en: titleEn,
    },
    summary: {
      sv: summarySv,
      en: summaryEn,
    },
    skills,
    roles,
  };

  return {
    raw: { sv: rawSv, en: rawEn },
    cv,
    warnings,
  };
}
