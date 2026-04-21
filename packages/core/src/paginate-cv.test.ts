/**
 * Unit tests for the CV pagination engine.
 */

import { describe, it, expect } from 'vitest';
import {
  paginateCv,
  buildAtomicUnit,
  computeContentHeightLimitPx,
} from './paginate-cv';
import type {
  PageConfig,
  SectionSpec,
  ContentBlockSpec,
  MeasurementsBySection,
} from './print-layout-engine-types';

const defaultPageConfig: PageConfig = {
  widthPx: 794,
  heightPx: 1123,
  marginTopPx: 40,
  marginBottomPx: 40,
  marginLeftPx: 40,
  marginRightPx: 40,
};

describe('computeContentHeightLimitPx', () => {
  it('returns base content height when no header/footer', () => {
    const limit = computeContentHeightLimitPx(defaultPageConfig);
    expect(limit).toBe(
      defaultPageConfig.heightPx -
        defaultPageConfig.marginTopPx -
        defaultPageConfig.marginBottomPx,
    );
  });

  it('subtracts header and footer heights when provided', () => {
    const limit = computeContentHeightLimitPx(defaultPageConfig, {
      id: 'h1',
      heightPx: 50,
      templateId: 'header',
      repeatOn: 'allPages',
    }, {
      id: 'f1',
      heightPx: 30,
      templateId: 'footer',
      repeatOn: 'allPages',
    });
    const base =
      defaultPageConfig.heightPx -
      defaultPageConfig.marginTopPx -
      defaultPageConfig.marginBottomPx;
    expect(limit).toBe(base - 50 - 30);
  });
});

describe('buildAtomicUnit', () => {
  const blocks: ContentBlockSpec[] = [
    { id: 'a', kind: 'experienceItem', sectionId: 'exp', payload: {} },
    { id: 'b', kind: 'experienceItem', sectionId: 'exp', groupId: 'g1', payload: {} },
    { id: 'c', kind: 'experienceItem', sectionId: 'exp', groupId: 'g1', payload: {} },
    { id: 'd', kind: 'experienceItem', sectionId: 'exp', payload: {} },
  ];

  it('returns single block when no groupId or keepWithNext', () => {
    const { unitBlocks, nextIndex } = buildAtomicUnit(blocks, 0);
    expect(unitBlocks).toHaveLength(1);
    expect(unitBlocks[0].id).toBe('a');
    expect(nextIndex).toBe(1);
  });

  it('returns consecutive blocks with same groupId', () => {
    const { unitBlocks, nextIndex } = buildAtomicUnit(blocks, 1);
    expect(unitBlocks).toHaveLength(2);
    expect(unitBlocks[0].id).toBe('b');
    expect(unitBlocks[1].id).toBe('c');
    expect(nextIndex).toBe(3);
  });
});

describe('paginateCv', () => {
  it('places blocks across pages when content limit is 1000px (spec example)', () => {
    const section: SectionSpec = {
      id: 'experience',
      type: 'experience',
      enabled: true,
      order: 1,
      contentBlocks: [
        { id: 'role-1', kind: 'experienceItem', sectionId: 'experience', groupId: 'role-1', payload: {} },
        { id: 'role-2', kind: 'experienceItem', sectionId: 'experience', groupId: 'role-2', payload: {} },
        { id: 'role-3', kind: 'experienceItem', sectionId: 'experience', groupId: 'role-3', payload: {} },
      ],
    };

    const measurements: MeasurementsBySection = {
      experience: {
        'role-1': { blockId: 'role-1', heightPx: 400 },
        'role-2': { blockId: 'role-2', heightPx: 400 },
        'role-3': { blockId: 'role-3', heightPx: 400 },
      },
    };

    const pageConfig: PageConfig = {
      ...defaultPageConfig,
      heightPx: 1000 + defaultPageConfig.marginTopPx + defaultPageConfig.marginBottomPx,
    };

    const result = paginateCv(
      pageConfig,
      [section],
      [],
      [],
      measurements,
    );

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].items).toHaveLength(2);
    expect(result.pages[0].items[0].blockId).toBe('role-1');
    expect(result.pages[0].items[1].blockId).toBe('role-2');
    expect(result.pages[1].items).toHaveLength(1);
    expect(result.pages[1].items[0].blockId).toBe('role-3');
    expect(result.overflowBlocks).toBeUndefined();
  });

  it('includes cover section as first page', () => {
    const coverSection: SectionSpec = {
      id: 'cover',
      type: 'cover',
      enabled: true,
      order: 0,
      contentBlocks: [
        { id: 'cover-main', kind: 'coverIntro', sectionId: 'cover', payload: {} },
      ],
    };

    const measurements: MeasurementsBySection = {
      cover: {
        'cover-main': { blockId: 'cover-main', heightPx: 800 },
      },
    };

    const result = paginateCv(
      defaultPageConfig,
      [coverSection],
      [],
      [],
      measurements,
    );

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].sectionId).toBe('cover');
    expect(result.pages[0].items[0].blockId).toBe('cover-main');
  });

  it('skips disabled sections', () => {
    const section: SectionSpec = {
      id: 'experience',
      type: 'experience',
      enabled: false,
      order: 1,
      contentBlocks: [
        { id: 'role-1', kind: 'experienceItem', sectionId: 'experience', payload: {} },
      ],
    };

    const measurements: MeasurementsBySection = {
      experience: { 'role-1': { blockId: 'role-1', heightPx: 100 } },
    };

    const result = paginateCv(
      defaultPageConfig,
      [section],
      [],
      [],
      measurements,
    );

    expect(result.pages).toHaveLength(0);
  });
});
