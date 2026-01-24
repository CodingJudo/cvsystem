import { describe, it, expect } from 'vitest';
import { extractCv, type ExtractionResult } from './extract';

// Minimal sample data that mimics Cinode structure
const createSampleSv = (overrides: Record<string, unknown> = {}) => ({
  id: 12345,
  languageCountry: 'se',
  language: 'Svenska',
  userFirstname: 'John',
  userLastname: 'Doe',
  updated: '2024-01-15T10:00:00Z',
  resume: {
    blocks: [
      {
        friendlyBlockName: 'Presentation',
        title: 'Senior Utvecklare',
        description: 'En erfaren utvecklare med fokus på frontend.',
      },
      {
        friendlyBlockName: 'SkillsByCategory',
        data: [
          {
            name: 'Programmeringsspråk',
            skills: [
              {
                id: 'skill-1',
                name: 'JavaScript',
                level: 4,
                numberOfDaysWorkExperience: 1825, // ~5 years
              },
              {
                id: 'skill-2',
                name: 'TypeScript',
                level: 3,
                numberOfDaysWorkExperience: 730, // ~2 years
              },
            ],
          },
        ],
      },
      {
        friendlyBlockName: 'WorkExperiences',
        data: [
          {
            id: 'role-1',
            title: 'Lead Developer',
            employer: 'Tech Company AB',
            description: 'Ledde utvecklingsteam för webbprojekt.',
            startDate: '2022-01-01T00:00:00',
            endDate: '2024-01-01T00:00:00',
            isCurrent: false,
          },
        ],
      },
    ],
  },
  ...overrides,
});

const createSampleEn = (overrides: Record<string, unknown> = {}) => ({
  id: 12346,
  languageCountry: 'en',
  language: 'English',
  userFirstname: 'John',
  userLastname: 'Doe',
  updated: '2024-01-15T10:00:00Z',
  resume: {
    blocks: [
      {
        friendlyBlockName: 'Presentation',
        title: 'Senior Developer',
        description: 'An experienced developer with frontend focus.',
      },
      {
        friendlyBlockName: 'SkillsByCategory',
        data: [
          {
            name: 'Programming Languages',
            skills: [
              {
                id: 'skill-1',
                name: 'JavaScript',
                level: 4,
                numberOfDaysWorkExperience: 1825,
              },
              {
                id: 'skill-2',
                name: 'TypeScript',
                level: 3,
                numberOfDaysWorkExperience: 730,
              },
            ],
          },
        ],
      },
      {
        friendlyBlockName: 'WorkExperiences',
        data: [
          {
            id: 'role-1',
            title: 'Lead Developer',
            employer: 'Tech Company AB',
            description: 'Led development team for web projects.',
            startDate: '2022-01-01T00:00:00',
            endDate: '2024-01-01T00:00:00',
            isCurrent: false,
          },
        ],
      },
    ],
  },
  ...overrides,
});

describe('extractCv', () => {
  describe('basic extraction', () => {
    it('extracts CV from valid Swedish and English data', () => {
      const result = extractCv(createSampleSv(), createSampleEn());

      expect(result.cv.id).toBe('12345');
      expect(result.cv.locales).toContain('sv');
      expect(result.cv.locales).toContain('en');
      expect(result.cv.name.first).toBe('John');
      expect(result.cv.name.last).toBe('Doe');
    });

    it('extracts bilingual title', () => {
      const result = extractCv(createSampleSv(), createSampleEn());

      expect(result.cv.title.sv).toBe('Senior Utvecklare');
      expect(result.cv.title.en).toBe('Senior Developer');
    });

    it('extracts bilingual summary', () => {
      const result = extractCv(createSampleSv(), createSampleEn());

      expect(result.cv.summary.sv).toBe('En erfaren utvecklare med fokus på frontend.');
      expect(result.cv.summary.en).toBe('An experienced developer with frontend focus.');
    });

    it('extracts skills with level and years', () => {
      const result = extractCv(createSampleSv(), createSampleEn());

      expect(result.cv.skills).toHaveLength(2);

      const jsSkill = result.cv.skills.find((s) => s.name === 'JavaScript');
      expect(jsSkill).toBeDefined();
      expect(jsSkill?.level).toBe(4);
      expect(jsSkill?.years).toBe(5);

      const tsSkill = result.cv.skills.find((s) => s.name === 'TypeScript');
      expect(tsSkill).toBeDefined();
      expect(tsSkill?.level).toBe(3);
      expect(tsSkill?.years).toBe(2);
    });

    it('extracts roles with bilingual descriptions', () => {
      const result = extractCv(createSampleSv(), createSampleEn());

      expect(result.cv.roles).toHaveLength(1);
      expect(result.cv.roles[0].title).toBe('Lead Developer');
      expect(result.cv.roles[0].company).toBe('Tech Company AB');
      expect(result.cv.roles[0].description.sv).toBe('Ledde utvecklingsteam för webbprojekt.');
      expect(result.cv.roles[0].description.en).toBe('Led development team for web projects.');
    });

    it('extracts updatedAt timestamp', () => {
      const result = extractCv(createSampleSv(), createSampleEn());

      expect(result.cv.updatedAt).toBe('2024-01-15T10:00:00Z');
    });
  });

  describe('locale detection', () => {
    it('detects Swedish locale from languageCountry "se"', () => {
      const result = extractCv(
        createSampleSv({ languageCountry: 'se' }),
        createSampleEn()
      );
      expect(result.cv.locales).toContain('sv');
    });

    it('detects English locale from languageCountry "en"', () => {
      const result = extractCv(
        createSampleSv(),
        createSampleEn({ languageCountry: 'en' })
      );
      expect(result.cv.locales).toContain('en');
    });

    it('detects English locale from languageCountry "gb"', () => {
      const result = extractCv(
        createSampleSv(),
        createSampleEn({ languageCountry: 'gb' })
      );
      expect(result.cv.locales).toContain('en');
    });

    it('warns when locale cannot be detected', () => {
      const result = extractCv(
        createSampleSv({ languageCountry: 'unknown', language: 'Unknown' }),
        createSampleEn({ languageCountry: 'unknown', language: 'Unknown' })
      );
      expect(result.warnings.some((w) => w.includes('Could not detect'))).toBe(true);
    });
  });

  describe('missing data handling', () => {
    it('handles missing Presentation block with warning', () => {
      const svWithoutPresentation = {
        ...createSampleSv(),
        resume: {
          blocks: [
            {
              friendlyBlockName: 'SkillsByCategory',
              data: [],
            },
          ],
        },
      };

      const result = extractCv(svWithoutPresentation, createSampleEn());

      expect(result.cv.summary.sv).toBeNull();
      expect(result.cv.title.sv).toBeNull();
      expect(result.warnings.some((w) => w.includes('Presentation'))).toBe(true);
    });

    it('handles missing skills blocks with warning', () => {
      const svWithoutSkills = {
        ...createSampleSv(),
        resume: {
          blocks: [
            {
              friendlyBlockName: 'Presentation',
              title: 'Developer',
              description: 'A developer.',
            },
          ],
        },
      };

      const result = extractCv(svWithoutSkills, createSampleEn());

      // Should have a warning about no skills found
      expect(result.warnings.some((w) => w.toLowerCase().includes('skill'))).toBe(true);
    });

    it('handles missing resume.blocks with warning', () => {
      const svWithoutBlocks = {
        id: 12345,
        languageCountry: 'se',
        language: 'Svenska',
        userFirstname: 'John',
        userLastname: 'Doe',
        resume: {},
      };

      const result = extractCv(svWithoutBlocks, createSampleEn());

      expect(result.warnings.some((w) => w.includes('resume.blocks'))).toBe(true);
      expect(result.cv.summary.sv).toBeNull();
    });

    it('handles completely empty input without crashing', () => {
      const result = extractCv({}, {});

      expect(result.cv.id).toBe('unknown');
      expect(result.cv.locales).toHaveLength(0);
      expect(result.cv.skills).toHaveLength(0);
      expect(result.cv.roles).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles null input without crashing', () => {
      const result = extractCv(null, null);

      expect(result.cv.id).toBe('unknown');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('skill deduplication', () => {
    it('deduplicates skills by id', () => {
      const sv = createSampleSv();
      const en = createSampleEn();

      // Both have the same skill IDs
      const result = extractCv(sv, en);

      // Should not have duplicates
      const jsSkills = result.cv.skills.filter((s) => s.name === 'JavaScript');
      expect(jsSkills).toHaveLength(1);
    });

    it('keeps unique skills from both languages', () => {
      const sv = {
        ...createSampleSv(),
        resume: {
          blocks: [
            {
              friendlyBlockName: 'SkillsByCategory',
              data: [
                {
                  skills: [{ id: 'skill-sv-only', name: 'Svenska Only', level: 3 }],
                },
              ],
            },
          ],
        },
      };

      const en = {
        ...createSampleEn(),
        resume: {
          blocks: [
            {
              friendlyBlockName: 'SkillsByCategory',
              data: [
                {
                  skills: [{ id: 'skill-en-only', name: 'English Only', level: 3 }],
                },
              ],
            },
          ],
        },
      };

      const result = extractCv(sv, en);

      expect(result.cv.skills).toHaveLength(2);
      expect(result.cv.skills.some((s) => s.id === 'skill-sv-only')).toBe(true);
      expect(result.cv.skills.some((s) => s.id === 'skill-en-only')).toBe(true);
    });
  });

  describe('raw data preservation', () => {
    it('preserves raw input data', () => {
      const sv = createSampleSv();
      const en = createSampleEn();

      const result = extractCv(sv, en);

      expect(result.raw.sv).toBe(sv);
      expect(result.raw.en).toBe(en);
    });
  });

  describe('edge cases', () => {
    it('handles skills without experience days', () => {
      const sv = {
        ...createSampleSv(),
        resume: {
          blocks: [
            {
              friendlyBlockName: 'SkillsByCategory',
              data: [
                {
                  skills: [
                    { id: 'skill-no-exp', name: 'New Skill', level: 2 },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = extractCv(sv, createSampleEn());

      const skill = result.cv.skills.find((s) => s.id === 'skill-no-exp');
      expect(skill?.years).toBeNull();
    });

    it('handles roles with null end date (current role)', () => {
      const sv = {
        ...createSampleSv(),
        resume: {
          blocks: [
            {
              friendlyBlockName: 'WorkExperiences',
              data: [
                {
                  id: 'current-role',
                  title: 'Current Position',
                  employer: 'Current Company',
                  description: 'Current work',
                  startDate: '2023-01-01T00:00:00',
                  endDate: null,
                  isCurrent: true,
                },
              ],
            },
          ],
        },
      };

      const result = extractCv(sv, {});

      const role = result.cv.roles.find((r) => r.id === 'current-role');
      expect(role?.isCurrent).toBe(true);
      expect(role?.end).toBeNull();
    });
  });
});
