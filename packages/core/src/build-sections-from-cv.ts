/**
 * Builds SectionSpec[] and BlockIndex from DomainCV.
 * Single source of truth for which sections exist, their order, and which content blocks each section contains.
 */

import type {
  DomainCV,
  Skill,
  PrintBreakBefore,
} from './domain/model/cv';
import type {
  SectionSpec,
  SectionType,
  ContentBlockSpec,
  BlockIndex,
  BuiltLayout,
  PaginationConfig,
} from './print-layout-engine-types';
import { parseBasicMarkdown, type Block } from './basic-markdown';
import { getBilingualText } from './format/index';

function shouldForceBreakBeforeItem(
  group: keyof PrintBreakBefore,
  itemId: string,
  printBreakBefore?: PrintBreakBefore | null,
): boolean {
  if (!printBreakBefore) return false;
  const ids = printBreakBefore[group];
  if (!ids || ids.length === 0) return false;
  return ids.includes(itemId);
}

function splitIntoParagraphs(text: string): string[] {
  if (!text.trim()) return [];
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Splits a text block into paragraph and list item blocks.
 * Returns an array of block specs: paragraphs become experienceParagraph blocks,
 * and list items become experienceListItem blocks (splittable across pages).
 */
function splitParagraphIntoBlocks(
  text: string,
  roleId: string,
  sectionId: SectionType,
  paragraphIndex: number,
  isLastParagraph: boolean,
): ContentBlockSpec[] {
  if (!text.trim()) return [];

  const blocks: ContentBlockSpec[] = [];
  const markdownBlocks = parseBasicMarkdown(text);

  for (const mb of markdownBlocks) {
    if (mb.type === 'paragraph') {
      // Regular paragraph - keep as is
      const paragraphText = mb.lines.map((line) =>
        line.map((inline) => (inline.t === 'bold' ? `**${inline.v}**` : inline.v)).join('')
      ).join('\n');
      blocks.push({
        id: `role-${roleId}-p${paragraphIndex}-para`,
        kind: 'experienceParagraph',
        sectionId,
        allowSplitAcrossPages: false,
        payload: {
          roleId,
          paragraphIndex,
          text: paragraphText,
          isLastParagraph: isLastParagraph && mb === markdownBlocks[markdownBlocks.length - 1],
        },
      });
    } else if (mb.type === 'list') {
      // List - split into individual list item blocks
      for (let itemIndex = 0; itemIndex < mb.items.length; itemIndex++) {
        const item = mb.items[itemIndex];
        const itemText = item.map((inline) =>
          inline.t === 'bold' ? `**${inline.v}**` : inline.v
        ).join('');
        blocks.push({
          id: `role-${roleId}-p${paragraphIndex}-li${itemIndex}`,
          kind: 'experienceListItem',
          sectionId,
          allowSplitAcrossPages: true, // List items can be split across pages
          payload: {
            roleId,
            paragraphIndex,
            itemIndex,
            itemText,
            isLastItem: itemIndex === mb.items.length - 1 && isLastParagraph && mb === markdownBlocks[markdownBlocks.length - 1],
          },
        });
      }
    }
  }

  return blocks;
}

// ---- Cover section ----

function buildCoverSection(cv: DomainCV): SectionSpec {
  const sectionId: SectionType = 'cover';

  const block: ContentBlockSpec = {
    id: 'cover-main',
    kind: 'coverIntro',
    sectionId,
    allowSplitAcrossPages: false,
    payload: {
      cvId: cv.id,
      name: cv.name,
      title: cv.title,
      summary: cv.summary,
      contacts: cv.contacts ?? null,
      coverPageGroups: cv.coverPageGroups ?? null,
      featuredProjects: (cv.featuredProjects ?? []).filter((p) => p.visible),
      photoDataUrl: cv.photoDataUrl ?? null,
    },
  };

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 0,
    contentBlocks: [block],
  };
}

// ---- Experience section ----

function buildExperienceSection(
  cv: DomainCV,
  config: PaginationConfig,
): SectionSpec | null {
  const visibleRoles = cv.roles
    .filter((role) => role.visible)
    .sort((a, b) => {
      // Sort by start date (newest first), then by end date if start dates are equal
      const dateA = a.start ? new Date(a.start).getTime() : 0;
      const dateB = b.start ? new Date(b.start).getTime() : 0;
      if (dateA === dateB) {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        const endA = a.end ? new Date(a.end).getTime() : 0;
        const endB = b.end ? new Date(b.end).getTime() : 0;
        return endB - endA;
      }
      return dateB - dateA; // Descending order (newest first)
    });
  if (visibleRoles.length === 0) return null;

  const sectionId: SectionType = 'experience';
  const blocks: ContentBlockSpec[] = [];
  const locale = config.locale ?? cv.locales?.[0] ?? 'sv';

  for (const role of visibleRoles) {
    const breakBefore = shouldForceBreakBeforeItem(
      'experience',
      role.id,
      cv.printBreakBefore ?? undefined,
    );

    if (config.granularity === 'block') {
      blocks.push({
        id: `role-${role.id}`,
        kind: 'experienceItem',
        sectionId,
        groupId: `role-${role.id}`,
        allowSplitAcrossPages: false,
        forceBreakBefore: breakBefore,
        payload: { roleId: role.id },
      });
      continue;
    }

    // granularity === 'paragraph': merge header with first paragraph when possible
    const descriptionText = getBilingualText(role.description, locale);
    const paragraphs = splitIntoParagraphs(descriptionText);

    if (paragraphs.length >= 1) {
      // Parse first paragraph to check if it contains lists
      const firstParaBlocks = splitParagraphIntoBlocks(
        paragraphs[0],
        role.id,
        sectionId,
        0,
        paragraphs.length === 1,
      );

      // Check if first paragraph contains only lists (no paragraph text before)
      const hasParagraphBeforeList = firstParaBlocks.length > 0 && firstParaBlocks[0].kind === 'experienceParagraph';
      const hasListItems = firstParaBlocks.some((b) => b.kind === 'experienceListItem');

      if (hasParagraphBeforeList || !hasListItems) {
        // First block contains paragraph text (or no lists): merge header with first paragraph
        const firstParaText = hasParagraphBeforeList
          ? (firstParaBlocks[0].payload as { text: string }).text
          : paragraphs[0];
        blocks.push({
          id: `role-${role.id}-header`,
          kind: 'experienceItem',
          sectionId,
          keepWithNext: paragraphs.length > 1 || hasListItems,
          allowSplitAcrossPages: false,
          forceBreakBefore: breakBefore,
          payload: {
            roleId: role.id,
            mode: 'headerAndFirstParagraph',
            text: firstParaText,
            showSkills: paragraphs.length === 1 && !hasListItems,
          },
        });

        // Add remaining list items from first paragraph (if any)
        if (hasListItems) {
          for (const block of firstParaBlocks) {
            if (block.kind === 'experienceListItem') {
              blocks.push(block);
            }
          }
        }
      } else {
        // First paragraph contains only lists: header only, then list items
        blocks.push({
          id: `role-${role.id}-header`,
          kind: 'experienceItem',
          sectionId,
          keepWithNext: true, // Keep header with first list item
          allowSplitAcrossPages: false,
          forceBreakBefore: breakBefore,
          payload: {
            roleId: role.id,
            mode: 'headerOnly',
            showSkills: paragraphs.length === 1 && firstParaBlocks.every((b) => b.kind === 'experienceListItem'),
          },
        });
        // Add all list items from first paragraph
        for (const block of firstParaBlocks) {
          blocks.push(block);
        }
      }

      // Remaining paragraphs (split into blocks, may contain lists)
      for (let index = 1; index < paragraphs.length; index++) {
        const paraBlocks = splitParagraphIntoBlocks(
          paragraphs[index],
          role.id,
          sectionId,
          index,
          index === paragraphs.length - 1,
        );
        blocks.push(...paraBlocks);
      }
    } else {
      // No paragraphs: header only (meta | title)
      blocks.push({
        id: `role-${role.id}-header`,
        kind: 'experienceItem',
        sectionId,
        allowSplitAcrossPages: false,
        forceBreakBefore: breakBefore,
        payload: { roleId: role.id, mode: 'headerOnly' },
      });
    }
  }

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 1,
    contentBlocks: blocks,
  };
}

// ---- Hobby projects section ----

function buildHobbyProjectsSection(cv: DomainCV): SectionSpec | null {
  const visibleProjects = (cv.hobbyProjects ?? [])
    .filter((project) => project.visible)
    .sort((a, b) => {
      const dateA = a.start ? new Date(a.start).getTime() : 0;
      const dateB = b.start ? new Date(b.start).getTime() : 0;
      if (dateA === dateB) {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        const endA = a.end ? new Date(a.end).getTime() : 0;
        const endB = b.end ? new Date(b.end).getTime() : 0;
        return endB - endA;
      }
      return dateB - dateA;
    });
  if (visibleProjects.length === 0) return null;

  const sectionId: SectionType = 'hobbyProjects';
  const blocks: ContentBlockSpec[] = visibleProjects.map((project) => ({
    id: `hobby-${project.id}`,
    kind: 'hobbyProjectItem',
    sectionId,
    groupId: `hobby-${project.id}`,
    allowSplitAcrossPages: false,
    forceBreakBefore: shouldForceBreakBeforeItem(
      'hobby-projects',
      project.id,
      cv.printBreakBefore ?? undefined,
    ),
    payload: {
      projectId: project.id,
    },
  }));

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 2,
    contentBlocks: blocks,
  };
}

// ---- Education + Courses section ----

function buildEducationCoursesSection(cv: DomainCV): SectionSpec | null {
  const visibleEducations = cv.educations.filter((e) => e.visible);
  const visibleTrainings = cv.trainings.filter((t) => t.visible);

  if (visibleEducations.length === 0 && visibleTrainings.length === 0) {
    return null;
  }

  const sectionId: SectionType = 'educationCourses';
  const blocks: ContentBlockSpec[] = [];

  for (const edu of visibleEducations) {
    blocks.push({
      id: `education-${edu.id}`,
      kind: 'educationItem',
      sectionId,
      groupId: `education-${edu.id}`,
      allowSplitAcrossPages: false,
      forceBreakBefore: shouldForceBreakBeforeItem(
        'education',
        edu.id,
        cv.printBreakBefore ?? undefined,
      ),
      payload: {
        educationId: edu.id,
      },
    });
  }

  for (const training of visibleTrainings) {
    blocks.push({
      id: `training-${training.id}`,
      kind: 'courseItem',
      sectionId,
      groupId: `training-${training.id}`,
      allowSplitAcrossPages: false,
      forceBreakBefore: shouldForceBreakBeforeItem(
        'courses-certification',
        training.id,
        cv.printBreakBefore ?? undefined,
      ),
      payload: {
        trainingId: training.id,
      },
    });
  }

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 3,
    contentBlocks: blocks,
  };
}

// ---- Commitments section ----

function buildCommitmentsSection(cv: DomainCV): SectionSpec | null {
  const visibleCommitments = cv.commitments.filter((c) => c.visible);
  if (visibleCommitments.length === 0) return null;

  const sectionId: SectionType = 'commitments';

  const blocks: ContentBlockSpec[] = visibleCommitments.map((commitment) => ({
    id: `commitment-${commitment.id}`,
    kind: 'commitmentItem',
    sectionId,
    groupId: `commitment-${commitment.id}`,
    allowSplitAcrossPages: false,
    forceBreakBefore: shouldForceBreakBeforeItem(
      'commitments',
      commitment.id,
      cv.printBreakBefore ?? undefined,
    ),
    payload: {
      commitmentId: commitment.id,
    },
  }));

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 4,
    contentBlocks: blocks,
  };
}

// ---- Competence / skills section ----
// Categories: Medel (1-2), Hög (3), Mycket Hög (4-5). Skills sorted alphabetically by name, no level numbers.

export type CompetenceCategory = 'medel' | 'hog' | 'mycket_hog';

function levelToCategory(level: number): CompetenceCategory {
  if (level >= 4) return 'mycket_hog';
  if (level === 3) return 'hog';
  return 'medel'; // 1, 2, 0
}

const COMPETENCE_CATEGORY_ORDER: CompetenceCategory[] = ['mycket_hog', 'hog', 'medel'];

function buildCompetenceSection(cv: DomainCV): SectionSpec | null {
  if (!cv.skills || cv.skills.length === 0) return null;

  const sectionId: SectionType = 'competence';

  const skillsByCategory: Record<CompetenceCategory, Skill[]> = {
    medel: [],
    hog: [],
    mycket_hog: [],
  };

  for (const skill of cv.skills) {
    const level = skill.level ?? 0;
    const category = levelToCategory(level);
    skillsByCategory[category].push(skill);
  }

  const blocks: ContentBlockSpec[] = [];

  for (const category of COMPETENCE_CATEGORY_ORDER) {
    const skills = skillsByCategory[category];
    if (skills.length === 0) continue;
    const sorted = [...skills].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    blocks.push({
      id: `skills-${category}`,
      kind: 'competenceGroup',
      sectionId,
      groupId: `skills-${category}`,
      allowSplitAcrossPages: false,
      payload: {
        category,
        skillIds: sorted.map((s) => s.id),
      },
    });
  }

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 5,
    contentBlocks: blocks,
  };
}

// ---- Public API ----

const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  granularity: 'paragraph',
};

export function buildSectionsFromCv(
  cv: DomainCV,
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG,
): BuiltLayout {
  const sections: SectionSpec[] = [];

  sections.push(buildCoverSection(cv));

  const experience = buildExperienceSection(cv, config);
  if (experience) sections.push(experience);

  const hobbyProjects = buildHobbyProjectsSection(cv);
  if (hobbyProjects) sections.push(hobbyProjects);

  const educationCourses = buildEducationCoursesSection(cv);
  if (educationCourses) sections.push(educationCourses);

  const commitments = buildCommitmentsSection(cv);
  if (commitments) sections.push(commitments);

  const competence = buildCompetenceSection(cv);
  if (competence) sections.push(competence);

  sections.sort((a, b) => a.order - b.order);

  const blockIndex: BlockIndex = {};
  for (const section of sections) {
    for (const block of section.contentBlocks) {
      blockIndex[block.id] = block;
    }
  }

  return { sections, blockIndex };
}
