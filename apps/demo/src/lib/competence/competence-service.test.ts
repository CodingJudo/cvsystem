import { describe, it, expect } from 'vitest';
import {
  normalizeSkillName,
  findSkillByName,
  ensureUniqueSkills,
  ensureUniqueSkillsCaseInsensitive,
  addSkill,
  updateSkill,
  removeSkill,
  addSkillToRole,
  removeSkillFromRole,
  updateSkillLevelOnRole,
  recalculateYears,
  linkRoleSkillsToMainSkills,
  normalizeAfterImport,
} from './competence-service';
import type { DomainCV, Skill, Role } from '@/domain/model/cv';

function minimalCv(overrides: Partial<DomainCV> = {}): DomainCV {
  return {
    id: 'cv-1',
    locales: ['sv'],
    name: { first: 'Jane', last: 'Doe' },
    title: { sv: 'Dev', en: null },
    summary: { sv: null, en: null },
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

describe('competence-service', () => {
  describe('normalizeSkillName', () => {
    it('trims whitespace', () => {
      expect(normalizeSkillName('  React  ')).toBe('React');
    });
    it('does not change case', () => {
      expect(normalizeSkillName('react')).toBe('react');
      expect(normalizeSkillName('React')).toBe('React');
    });
  });

  describe('findSkillByName', () => {
    it('returns undefined for empty name', () => {
      const cv = minimalCv({ skills: [{ id: 's1', name: 'JS' }] });
      expect(findSkillByName(cv, '')).toBeUndefined();
      expect(findSkillByName(cv, '   ')).toBeUndefined();
    });
    it('matches by exact name after trim (case-sensitive)', () => {
      const cv = minimalCv({ skills: [{ id: 's1', name: 'React' }] });
      expect(findSkillByName(cv, 'React')?.id).toBe('s1');
      expect(findSkillByName(cv, '  React  ')?.id).toBe('s1');
      expect(findSkillByName(cv, 'react')).toBeUndefined();
    });
  });

  describe('ensureUniqueSkills', () => {
    it('keeps skill with highest level when duplicates by exact name', () => {
      const cv = minimalCv({
        skills: [
          { id: 's1', name: 'React', level: 2 },
          { id: 's2', name: 'React', level: 4 },
        ],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [
              { id: 's1', name: 'React', level: 2 },
              { id: 's2', name: 'React', level: 4 },
            ],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = ensureUniqueSkills(cv);
      expect(out.skills).toHaveLength(1);
      expect(out.skills[0].level).toBe(4);
      expect(out.skills[0].id).toBe('s2');
      expect(out.roles[0].skills).toHaveLength(1);
      expect(out.roles[0].skills[0].id).toBe('s2');
    });
    it('leaves "React" and "react" as two skills', () => {
      const cv = minimalCv({
        skills: [
          { id: 's1', name: 'React' },
          { id: 's2', name: 'react' },
        ],
      });
      const out = ensureUniqueSkills(cv);
      expect(out.skills).toHaveLength(2);
    });
  });

  describe('ensureUniqueSkillsCaseInsensitive', () => {
    it('merges React and react into one skill (keeps higher level)', () => {
      const cv = minimalCv({
        skills: [
          { id: 's1', name: 'React', level: 4 },
          { id: 's2', name: 'react', level: 2 },
        ],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [
              { id: 's1', name: 'React', level: 4 },
              { id: 's2', name: 'react', level: 2 },
            ],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = ensureUniqueSkillsCaseInsensitive(cv);
      expect(out.skills).toHaveLength(1);
      expect(out.skills[0].name).toBe('React');
      expect(out.skills[0].level).toBe(4);
      expect(out.roles[0].skills).toHaveLength(1);
      expect(out.roles[0].skills[0].id).toBe('s1');
    });
  });

  describe('addSkill', () => {
    it('adds skill when name not present', () => {
      const cv = minimalCv();
      const out = addSkill(cv, { name: 'TypeScript', level: 3 });
      expect(out.skills).toHaveLength(1);
      expect(out.skills[0].name).toBe('TypeScript');
      expect(out.skills[0].id).toBeDefined();
      expect(out.skills[0].id).toMatch(/^skill-/);
    });
    it('does not add when exact name already exists', () => {
      const cv = minimalCv({ skills: [{ id: 's1', name: 'React' }] });
      const out = addSkill(cv, { name: 'React', level: 5 });
      expect(out.skills).toHaveLength(1);
      expect(out.skills[0].id).toBe('s1');
    });
  });

  describe('updateSkill', () => {
    it('updates skill by id', () => {
      const cv = minimalCv({ skills: [{ id: 's1', name: 'JS', level: 2 }] });
      const out = updateSkill(cv, 's1', { level: 4 });
      expect(out.skills[0].level).toBe(4);
    });
  });

  describe('removeSkill', () => {
    it('removes skill and from all roles', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React' }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [{ id: 's1', name: 'React', level: 3 }],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = removeSkill(cv, 's1');
      expect(out.skills).toHaveLength(0);
      expect(out.roles[0].skills).toHaveLength(0);
    });
  });

  describe('addSkillToRole', () => {
    it('adds skill to role and uses main skill id', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React', level: 3 }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = addSkillToRole(cv, 'r1', 's1');
      expect(out.roles[0].skills).toHaveLength(1);
      expect(out.roles[0].skills[0].id).toBe('s1');
      expect(out.roles[0].skills[0].name).toBe('React');
    });
    it('updates Skill.level when levelOverride provided', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React', level: 2 }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = addSkillToRole(cv, 'r1', 's1', 5);
      expect(out.skills[0].level).toBe(5);
      expect(out.roles[0].skills[0].level).toBe(5);
    });
  });

  describe('removeSkillFromRole', () => {
    it('removes skill from the role only', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React' }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [{ id: 's1', name: 'React', level: 3 }],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = removeSkillFromRole(cv, 'r1', 's1');
      expect(out.roles[0].skills).toHaveLength(0);
      expect(out.skills).toHaveLength(1);
    });
  });

  describe('updateSkillLevelOnRole', () => {
    it('updates RoleSkill and Skill level', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React', level: 2 }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [{ id: 's1', name: 'React', level: 2 }],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = updateSkillLevelOnRole(cv, 'r1', 's1', 5);
      expect(out.skills[0].level).toBe(5);
      expect(out.roles[0].skills[0].level).toBe(5);
    });
  });

  describe('recalculateYears', () => {
    it('sets calculatedYears from role durations (by skill id)', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React' }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [{ id: 's1', name: 'React' }],
            description: { sv: null, en: null },
            start: '2020-01-01',
            end: '2022-01-01',
          },
        ],
      });
      const out = recalculateYears(cv);
      expect(out.skills[0].calculatedYears).toBe(2);
    });
    it('preserves overriddenYears', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React', overriddenYears: 10 }],
        roles: [],
      });
      const out = recalculateYears(cv);
      expect(out.skills[0].overriddenYears).toBe(10);
      expect(out.skills[0].calculatedYears).toBe(0);
    });
  });

  describe('linkRoleSkillsToMainSkills', () => {
    it('replaces orphan role-skill id with existing skill id when name matches', () => {
      const cv = minimalCv({
        skills: [{ id: 's1', name: 'React' }],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [{ id: 'role-skill-0', name: 'React', level: 3 }],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = linkRoleSkillsToMainSkills(cv);
      expect(out.roles[0].skills[0].id).toBe('s1');
      expect(out.skills).toHaveLength(1);
    });
    it('adds new skill to cv.skills when role skill id not in cv.skills and name not found', () => {
      const cv = minimalCv({
        skills: [],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [{ id: 'role-skill-0', name: 'Vue', level: 2 }],
            description: { sv: null, en: null },
            start: null,
            end: null,
          },
        ],
      });
      const out = linkRoleSkillsToMainSkills(cv);
      expect(out.skills).toHaveLength(1);
      expect(out.skills[0].name).toBe('Vue');
      expect(out.roles[0].skills[0].id).toBe(out.skills[0].id);
    });
  });

  describe('normalizeAfterImport', () => {
    it('links role skills, dedupes, and recalculates years', () => {
      const cv = minimalCv({
        skills: [
          { id: 's1', name: 'React' },
          { id: 's2', name: 'React', level: 4 },
        ],
        roles: [
          {
            id: 'r1',
            title: 'Dev',
            company: 'Co',
            visible: true,
            skills: [
              { id: 'role-skill-0', name: 'React', level: 3 },
            ],
            description: { sv: null, en: null },
            start: '2020-01-01',
            end: '2021-01-01',
          },
        ],
      });
      const out = normalizeAfterImport(cv);
      expect(out.skills).toHaveLength(1);
      expect(out.skills[0].level).toBe(4);
      expect(out.roles[0].skills[0].id).toBe(out.skills[0].id);
      expect(out.skills[0].calculatedYears).toBe(1);
    });
  });
});
