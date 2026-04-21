/**
 * Measurement service interface for the print layout engine.
 * Implementations (e.g. DOM-based) measure content block heights for pagination.
 */

import type {
  SectionSpec,
  PageConfig,
  MeasurementsBySection,
} from './print-layout-engine-types';

export interface MeasurementService {
  /**
   * Measure all blocks that are currently rendered in the measurement container.
   * The container is expected to contain elements with data-block-id and data-section-id.
   * Returns a promise that resolves with heights keyed by sectionId and blockId.
   */
  measureAllBlocks(
    sections: SectionSpec[],
    pageConfig: PageConfig,
  ): Promise<MeasurementsBySection>;
}
