/**
 * Utility to determine which section title should be shown before a block.
 * Used by both PrintMeasurementRoot (for measurement) and PaginatedPrintLayout (for rendering).
 */

import type { SectionSpec, ContentBlockSpec } from './print-layout-engine-types';
import type { Locale } from './domain/model/cv';

/** Returns the body section title to show before this block (first of its kind in section), or null. */
export function getBodySectionTitle(
  sections: SectionSpec[],
  sectionId: string,
  blockId: string,
  block: ContentBlockSpec,
  locale: Locale,
): string | null {
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const blocks = section.contentBlocks;
  const blockIndexInSection = blocks.findIndex((b) => b.id === blockId);
  if (blockIndexInSection < 0) return null;

  if (sectionId === 'experience') {
    const firstExp = blocks.findIndex((b) => b.kind === 'experienceItem');
    return firstExp === blockIndexInSection
      ? locale === 'sv'
        ? 'Erfarenheter'
        : 'Experience'
      : null;
  }
  if (sectionId === 'hobbyProjects') {
    const first = blocks.findIndex((b) => b.kind === 'hobbyProjectItem');
    return first === blockIndexInSection
      ? locale === 'sv'
        ? 'Hobbyprojekt'
        : 'Hobby projects'
      : null;
  }
  if (sectionId === 'educationCourses') {
    const firstEdu = blocks.findIndex((b) => b.kind === 'educationItem');
    const firstCourse = blocks.findIndex((b) => b.kind === 'courseItem');
    if (block.kind === 'educationItem' && blockIndexInSection === firstEdu) {
      return locale === 'sv' ? 'Utbildning' : 'Education';
    }
    if (block.kind === 'courseItem' && blockIndexInSection === firstCourse) {
      return locale === 'sv' ? 'Kurser och Certifieringar' : 'Courses and certifications';
    }
    return null;
  }
  if (sectionId === 'competence') {
    const first = blocks.findIndex((b) => b.kind === 'competenceGroup');
    return first === blockIndexInSection
      ? locale === 'sv'
        ? 'Kompetenser'
        : 'Skills'
      : null;
  }
  return null;
}
