/**
 * Zod schemas for the DomainCV model.
 *
 * Each schema mirrors the corresponding interface in cv.ts.
 * Naming: <Type>Schema (e.g. DomainCVSchema, SkillSchema).
 *
 * Do NOT replace DomainCV with z.infer<typeof DomainCVSchema> yet —
 * keep both in lockstep. Collapse to inferred-only in a later phase.
 */

import { z } from 'zod';

export const BilingualTextSchema = z.object({
  sv: z.string().nullable(),
  en: z.string().nullable(),
});

export const ContactsSchema = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  website: z.string().nullable(),
});

export const LocaleSchema = z.enum(['sv', 'en']);

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().nullable().optional(),
  years: z.number().nullable().optional(),
  calculatedYears: z.number().nullable().optional(),
  overriddenYears: z.number().nullable().optional(),
  ontologyRef: z.string().nullable().optional(),
  groupAs: z.string().nullable().optional(),
});

export const RoleSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  visible: z.boolean().optional(),
});

export const RoleSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: BilingualTextSchema,
  skills: z.array(RoleSkillSchema),
  visible: z.boolean(),
  skillOrder: z.array(z.string()).optional(),
});

export const HobbyProjectSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  url: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: BilingualTextSchema,
  skills: z.array(RoleSkillSchema),
  visible: z.boolean(),
  skillOrder: z.array(z.string()).optional(),
});

export const TrainingTypeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

export const TrainingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: BilingualTextSchema,
  issuer: z.string().nullable(),
  year: z.number().nullable(),
  expireDate: z.string().nullable(),
  url: z.string().nullable(),
  trainingType: TrainingTypeSchema,
  visible: z.boolean(),
  hideDescription: z.boolean().optional(),
});

export const EducationSchema = z.object({
  id: z.string(),
  schoolName: z.string(),
  programName: z.string().nullable(),
  degree: z.string().nullable(),
  description: BilingualTextSchema,
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  ongoing: z.boolean(),
  url: z.string().nullable(),
  visible: z.boolean(),
  hideDescription: z.boolean().optional(),
});

export const CommitmentTypeSchema = z.enum([
  'presentation',
  'publication',
  'open-source',
  'volunteer',
  'other',
]);

export const CommitmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: BilingualTextSchema,
  commitmentType: CommitmentTypeSchema,
  venue: z.string().nullable(),
  date: z.string().nullable(),
  url: z.string().nullable(),
  visible: z.boolean(),
});

export const FeaturedProjectSchema = z.object({
  id: z.string(),
  roleId: z.string().nullable(),
  company: z.string().nullable(),
  roleTitle: z.string().nullable(),
  description: BilingualTextSchema,
  visible: z.boolean(),
});

export const CoverPageGroupsSchema = z.object({
  roles: z.array(z.string()),
  expertKnowledge: z.array(z.string()),
  languages: z.array(z.string()),
});

export const PrintBreakBeforeSchema = z.object({
  experience: z.array(z.string()).optional(),
  'hobby-projects': z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  'courses-certification': z.array(z.string()).optional(),
  commitments: z.array(z.string()).optional(),
});

export const RenderSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  locale: LocaleSchema,
  skillDisplay: z.enum(['individual', 'grouped']),
  skillOverrides: z.record(z.string(), z.enum(['individual', 'grouped'])).optional(),
  hiddenItemIds: z.object({
    roles: z.array(z.string()).optional(),
    trainings: z.array(z.string()).optional(),
    educations: z.array(z.string()).optional(),
    commitments: z.array(z.string()).optional(),
    hobbyProjects: z.array(z.string()).optional(),
  }).optional(),
});

export const DomainCVSchema = z.object({
  id: z.string(),
  locales: z.array(LocaleSchema),
  updatedAt: z.string().nullable().optional(),
  name: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
  }),
  title: BilingualTextSchema,
  summary: BilingualTextSchema,
  contacts: ContactsSchema.nullable().optional(),
  photoDataUrl: z.string().nullable().optional(),
  featuredProjects: z.array(FeaturedProjectSchema).optional(),
  coverPageGroups: CoverPageGroupsSchema.optional(),
  printBreakBefore: PrintBreakBeforeSchema.nullable().optional(),
  renderSpecs: z.array(RenderSpecSchema).optional(),
  activeRenderSpecId: z.string().nullable().optional(),
  skills: z.array(SkillSchema),
  roles: z.array(RoleSchema),
  hobbyProjects: z.array(HobbyProjectSchema).optional(),
  trainings: z.array(TrainingSchema),
  educations: z.array(EducationSchema),
  commitments: z.array(CommitmentSchema),
});
