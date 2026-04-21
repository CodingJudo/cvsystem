import { describe, it, expect } from 'vitest';
import type { DomainCV } from './cv';
import { createMinimalCv } from './cv';
import { DomainCVSchema, SkillSchema, RoleSchema, TrainingSchema } from './cv.schema';
import type { z } from 'zod';

// ---------------------------------------------------------------------------
// Compile-time: inferred type must be bidirectionally compatible with DomainCV
// If these lines produce TypeScript errors, the schema and interface have diverged.
// ---------------------------------------------------------------------------
({} as z.infer<typeof DomainCVSchema>) satisfies DomainCV;
({} as DomainCV) satisfies z.infer<typeof DomainCVSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalCv(): unknown {
  return createMinimalCv() as unknown;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DomainCVSchema', () => {
  it('accepts a valid minimal DomainCV', () => {
    const result = DomainCVSchema.safeParse(minimalCv());
    expect(result.success).toBe(true);
  });

  it('accepts a fully-populated DomainCV', () => {
    const full: DomainCV = {
      ...createMinimalCv(),
      id: 'cv-full',
      locales: ['sv', 'en'],
      updatedAt: '2025-01-01T00:00:00Z',
      name: { first: 'Jane', last: 'Doe' },
      title: { sv: 'Utvecklare', en: 'Developer' },
      summary: { sv: 'Sammanfattning', en: 'Summary' },
      contacts: { email: 'jane@example.com', phone: '0700000000', address: 'Stockholm', website: 'https://jane.dev' },
      photoDataUrl: 'data:image/png;base64,abc',
      featuredProjects: [
        {
          id: 'fp-1',
          roleId: 'role-1',
          company: 'Acme',
          roleTitle: 'Lead Engineer',
          description: { sv: null, en: 'Built things' },
          visible: true,
        },
      ],
      coverPageGroups: {
        roles: ['Tech Lead'],
        expertKnowledge: ['TypeScript'],
        languages: ['English'],
      },
      printBreakBefore: { experience: ['role-2'], 'hobby-projects': [] },
      skills: [{ id: 'sk-1', name: 'TypeScript', level: 4, years: 5, calculatedYears: 4, overriddenYears: null }],
      roles: [
        {
          id: 'role-1',
          title: 'Senior Engineer',
          company: 'Acme',
          location: 'Stockholm',
          start: '2020-01',
          end: null,
          isCurrent: true,
          description: { sv: null, en: 'Built stuff' },
          skills: [{ id: 'sk-1', name: 'TypeScript', level: 4, category: 'Tools', visible: true }],
          visible: true,
          skillOrder: ['sk-1'],
        },
      ],
      hobbyProjects: [
        {
          id: 'hp-1',
          title: 'My project',
          url: 'https://github.com/jane/project',
          start: '2022-01',
          end: null,
          isCurrent: true,
          description: { sv: null, en: 'A cool project' },
          skills: [],
          visible: true,
        },
      ],
      trainings: [
        {
          id: 'tr-1',
          title: 'AWS Certified',
          description: { sv: null, en: null },
          issuer: 'Amazon',
          year: 2023,
          expireDate: '2026-01-01',
          url: 'https://aws.amazon.com',
          trainingType: 1,
          visible: true,
          hideDescription: false,
        },
      ],
      educations: [
        {
          id: 'edu-1',
          schoolName: 'KTH',
          programName: 'Computer Science',
          degree: 'M.Sc.',
          description: { sv: null, en: null },
          location: 'Stockholm',
          startDate: '2015-09',
          endDate: '2020-06',
          ongoing: false,
          url: null,
          visible: true,
        },
      ],
      commitments: [
        {
          id: 'cm-1',
          title: 'Talk at conf',
          description: { sv: null, en: 'A talk' },
          commitmentType: 'presentation',
          venue: 'NodeConf',
          date: '2024-04',
          url: null,
          visible: true,
        },
      ],
    };

    const result = DomainCVSchema.safeParse(full as unknown);
    expect(result.success).toBe(true);
  });

  it('rejects when id is missing', () => {
    const { id: _, ...withoutId } = createMinimalCv();
    const result = DomainCVSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it('rejects when skills is missing', () => {
    const { skills: _, ...withoutSkills } = createMinimalCv();
    const result = DomainCVSchema.safeParse(withoutSkills);
    expect(result.success).toBe(false);
  });

  it('rejects when roles is missing', () => {
    const { roles: _, ...withoutRoles } = createMinimalCv();
    const result = DomainCVSchema.safeParse(withoutRoles);
    expect(result.success).toBe(false);
  });

  it('rejects when trainings is missing', () => {
    const { trainings: _, ...withoutTrainings } = createMinimalCv();
    const result = DomainCVSchema.safeParse(withoutTrainings);
    expect(result.success).toBe(false);
  });

  it('rejects a non-object value', () => {
    expect(DomainCVSchema.safeParse(null).success).toBe(false);
    expect(DomainCVSchema.safeParse('string').success).toBe(false);
    expect(DomainCVSchema.safeParse(42).success).toBe(false);
  });
});

describe('SkillSchema', () => {
  it('accepts a minimal skill (optional fields absent)', () => {
    expect(SkillSchema.safeParse({ id: 's1', name: 'Go' }).success).toBe(true);
  });

  it('rejects a skill with missing id', () => {
    expect(SkillSchema.safeParse({ name: 'Go' }).success).toBe(false);
  });

  it('rejects a skill where level is a string', () => {
    expect(SkillSchema.safeParse({ id: 's1', name: 'Go', level: 'high' }).success).toBe(false);
  });
});

describe('RoleSchema', () => {
  it('rejects a role with missing visible', () => {
    const role = {
      id: 'r1',
      title: null,
      company: null,
      description: { sv: null, en: null },
      skills: [],
    };
    expect(RoleSchema.safeParse(role).success).toBe(false);
  });
});

describe('TrainingSchema', () => {
  it('rejects an invalid trainingType (e.g. 3)', () => {
    const training = {
      id: 't1',
      title: 'Course',
      description: { sv: null, en: null },
      issuer: null,
      year: null,
      expireDate: null,
      url: null,
      trainingType: 3,
      visible: true,
    };
    expect(TrainingSchema.safeParse(training).success).toBe(false);
  });

  it('accepts all valid trainingType values (0, 1, 2)', () => {
    const base = {
      id: 't1',
      title: 'Course',
      description: { sv: null, en: null },
      issuer: null,
      year: null,
      expireDate: null,
      url: null,
      visible: true,
    };
    expect(TrainingSchema.safeParse({ ...base, trainingType: 0 }).success).toBe(true);
    expect(TrainingSchema.safeParse({ ...base, trainingType: 1 }).success).toBe(true);
    expect(TrainingSchema.safeParse({ ...base, trainingType: 2 }).success).toBe(true);
  });
});
