import { describe, it, expect } from 'vitest';
import { buildSectionsFromCv } from './build-sections-from-cv';
import type { DomainCV } from '@/domain/model/cv';

function minimalCv(overrides: Partial<DomainCV> = {}): DomainCV {
  return {
    id: 'cv-1',
    locales: ['sv'],
    name: { first: 'Jane', last: 'Doe' },
    title: { sv: 'Utvecklare', en: 'Developer' },
    summary: { sv: 'Sammanfattning.', en: null },
    contacts: null,
    featuredProjects: [],
    skills: [],
    roles: [],
    trainings: [],
    educations: [],
    commitments: [],
    ...overrides,
  };
}

describe('buildSectionsFromCv', () => {
  it('returns BuiltLayout with sections and blockIndex', () => {
    const cv = minimalCv();
    const { sections, blockIndex } = buildSectionsFromCv(cv);
    expect(sections).toBeDefined();
    expect(Array.isArray(sections)).toBe(true);
    expect(blockIndex).toBeDefined();
    expect(typeof blockIndex).toBe('object');
  });

  it('sections exist in correct order: cover (0), experience (1), educationCourses (3), commitments (4), competence (5)', () => {
    const cv = minimalCv({
      roles: [
        { id: 'r1', title: 'Dev', company: 'Co', visible: true, skills: [], description: { sv: null, en: null }, start: null, end: null },
      ],
      educations: [
        { id: 'e1', schoolName: 'School', visible: true, programName: null, degree: null, description: { sv: null, en: null }, location: null, startDate: null, endDate: null, ongoing: false, url: null },
      ],
      skills: [{ id: 's1', name: 'JS', level: 3 }],
    });
    const { sections } = buildSectionsFromCv(cv);
    const ids = sections.map((s) => s.id);
    expect(ids).toEqual(['cover', 'experience', 'educationCourses', 'competence']);
    expect(sections.map((s) => s.order)).toEqual([0, 1, 3, 5]);
  });

  it('cover section has one block (cover-main)', () => {
    const cv = minimalCv();
    const { sections } = buildSectionsFromCv(cv);
    const cover = sections.find((s) => s.id === 'cover');
    expect(cover).toBeDefined();
    expect(cover!.contentBlocks).toHaveLength(1);
    expect(cover!.contentBlocks[0].id).toBe('cover-main');
    expect(cover!.contentBlocks[0].kind).toBe('coverIntro');
  });

  it('includes hobby projects section when visible hobby projects exist', () => {
    const cv = minimalCv({
      hobbyProjects: [
        {
          id: 'hp1',
          title: 'Open source tool',
          url: null,
          start: null,
          end: null,
          isCurrent: false,
          description: { sv: null, en: null },
          skills: [],
          visible: true,
        },
      ],
    });
    const { sections } = buildSectionsFromCv(cv);
    const hobby = sections.find((s) => s.id === 'hobbyProjects');
    expect(hobby).toBeDefined();
    expect(hobby!.contentBlocks).toHaveLength(1);
    expect(hobby!.contentBlocks[0].kind).toBe('hobbyProjectItem');
  });

  it('contentBlocks.length per section matches visible data', () => {
    const cv = minimalCv({
      roles: [
        { id: 'r1', title: 'A', company: 'C', visible: true, skills: [], description: { sv: null, en: null }, start: null, end: null },
        { id: 'r2', title: 'B', company: 'D', visible: false, skills: [], description: { sv: null, en: null }, start: null, end: null },
      ],
      skills: [
        { id: 's1', name: 'X', level: 1 },
        { id: 's2', name: 'Y', level: 1 },
      ],
    });
    const { sections } = buildSectionsFromCv(cv);
    const experience = sections.find((s) => s.id === 'experience');
    // Paragraph mode: 1 visible role -> 1 header block (no paragraphs when description empty)
    expect(experience!.contentBlocks).toHaveLength(1);
    expect(experience!.contentBlocks[0].id).toBe('role-r1-header');
    const competence = sections.find((s) => s.id === 'competence');
    expect(competence!.contentBlocks).toHaveLength(1); // one level group
  });

  it('blockIndex[block.id] equals the block for all blocks across sections', () => {
    const cv = minimalCv({
      roles: [{ id: 'r1', title: 'A', company: 'C', visible: true, skills: [], description: { sv: null, en: null }, start: null, end: null }],
    });
    const { sections, blockIndex } = buildSectionsFromCv(cv);
    for (const section of sections) {
      for (const block of section.contentBlocks) {
        expect(blockIndex[block.id]).toBe(block);
      }
    }
  });

  it('forceBreakBefore is true when item id is in printBreakBefore', () => {
    const cv = minimalCv({
      roles: [
        { id: 'r1', title: 'A', company: 'C', visible: true, skills: [], description: { sv: null, en: null }, start: null, end: null },
        { id: 'r2', title: 'B', company: 'D', visible: true, skills: [], description: { sv: null, en: null }, start: null, end: null },
      ],
      printBreakBefore: { experience: ['r2'] },
    });
    const { sections } = buildSectionsFromCv(cv);
    const experience = sections.find((s) => s.id === 'experience');
    // Paragraph mode: block ids are role-r1-header, role-r2-header, etc.
    const block1 = experience!.contentBlocks.find((b) => b.id === 'role-r1-header');
    const block2 = experience!.contentBlocks.find((b) => b.id === 'role-r2-header');
    expect(block1!.forceBreakBefore).toBeFalsy();
    expect(block2!.forceBreakBefore).toBe(true);
  });

  it('omits experience when no visible roles', () => {
    const cv = minimalCv({
      roles: [{ id: 'r1', title: 'A', company: 'C', visible: false, skills: [], description: { sv: null, en: null }, start: null, end: null }],
    });
    const { sections } = buildSectionsFromCv(cv);
    expect(sections.some((s) => s.id === 'experience')).toBe(false);
  });

  it('omits educationCourses when no visible educations or trainings', () => {
    const cv = minimalCv();
    const { sections } = buildSectionsFromCv(cv);
    expect(sections.some((s) => s.id === 'educationCourses')).toBe(false);
  });

  it('omits competence when no skills', () => {
    const cv = minimalCv();
    const { sections } = buildSectionsFromCv(cv);
    expect(sections.some((s) => s.id === 'competence')).toBe(false);
  });

  it('paragraph mode: emits header+firstParagraph block then one block per remaining paragraph', () => {
    const cv = minimalCv({
      roles: [
        {
          id: 'r1',
          title: 'Dev',
          company: 'Co',
          visible: true,
          skills: [],
          description: { sv: 'First paragraph.\n\nSecond paragraph.', en: null },
          start: null,
          end: null,
        },
      ],
    });
    const { sections } = buildSectionsFromCv(cv, { granularity: 'paragraph' });
    const experience = sections.find((s) => s.id === 'experience');
    expect(experience!.contentBlocks).toHaveLength(2); // header+firstP, then p1
    expect(experience!.contentBlocks[0].id).toBe('role-r1-header');
    expect(experience!.contentBlocks[0].kind).toBe('experienceItem');
    expect((experience!.contentBlocks[0].payload as { mode?: string }).mode).toBe(
      'headerAndFirstParagraph',
    );
    expect((experience!.contentBlocks[0].payload as { text?: string }).text).toBe(
      'First paragraph.',
    );
    expect(experience!.contentBlocks[1].id).toBe('role-r1-p1-para');
    expect(experience!.contentBlocks[1].kind).toBe('experienceParagraph');
  });

  it('block mode: one block per role (legacy behavior)', () => {
    const cv = minimalCv({
      roles: [
        {
          id: 'r1',
          title: 'A',
          company: 'C',
          visible: true,
          skills: [],
          description: { sv: 'One\n\nTwo', en: null },
          start: null,
          end: null,
        },
      ],
    });
    const { sections } = buildSectionsFromCv(cv, { granularity: 'block' });
    const experience = sections.find((s) => s.id === 'experience');
    expect(experience!.contentBlocks).toHaveLength(1);
    expect(experience!.contentBlocks[0].id).toBe('role-r1');
    expect(experience!.contentBlocks[0].kind).toBe('experienceItem');
  });
});
