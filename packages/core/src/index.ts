// @cvsystem/core — public API

// Domain model
export * from './domain/model/cv';
export * from './domain/model/cv.schema';

// Competence & conflict
export * from './competence/index';
export * from './conflict/index';

// File formats
export * from './file-formats/index';

// Ontology & render-spec
export * from './ontology/index';
export * from './render-spec/index';

// Layout engine
export * from './paginate-cv';
export * from './build-sections-from-cv';

// Storage interfaces
export * from './storage/cv-storage';
export * from './storage/memory-adapter';
export * from './storage/types';

// Store (reducer + types)
export * from './store/cv-types';
export {
  STORAGE_KEY,
  normalizeCv,
  createMinimalCv as createMinimalCvFromSeed,
  cvReducer,
} from './store/cv-reducer';

// Brand config
export * from './brand-config';

// Utilities
export * from './format/index';
export * from './role-helpers';
export * from './skill-calculator';
export * from './basic-markdown';
export * from './get-body-section-title';
export * from './print-layout-engine-types';
export * from './measurement-service';
