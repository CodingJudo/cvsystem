/**
 * DOM-based implementation of MeasurementService.
 * Reads block heights from a container that has been populated by PrintMeasurementRoot.
 */

import type {
  SectionSpec,
  PageConfig,
  MeasurementsBySection,
  BlockMeasurement,
} from '@/lib/print-layout-engine-types';
import type { MeasurementService } from '@/lib/measurement-service';

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export class DomMeasurementService implements MeasurementService {
  constructor(
    private getContainer: () => HTMLElement | null,
  ) {}

  async measureAllBlocks(
    _sections: SectionSpec[],
    _pageConfig: PageConfig,
  ): Promise<MeasurementsBySection> {
    await waitForLayout();

    const container = this.getContainer();
    if (!container) {
      return {};
    }

    const measurements: MeasurementsBySection = {};
    const nodes = container.querySelectorAll<HTMLElement>('[data-block-id]');

    nodes.forEach((node) => {
      const blockId = node.dataset.blockId;
      const sectionId = node.dataset.sectionId;
      if (!blockId || !sectionId) return;

      const rect = node.getBoundingClientRect();
      if (!measurements[sectionId]) {
        measurements[sectionId] = {};
      }
      measurements[sectionId][blockId] = {
        blockId,
        heightPx: rect.height,
      } satisfies BlockMeasurement;
    });

    return measurements;
  }
}
