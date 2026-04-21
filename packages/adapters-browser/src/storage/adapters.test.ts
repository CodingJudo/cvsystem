// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter, DEFAULT_CV_STORAGE_KEY } from './local-storage-adapter';
import { MemoryAdapter } from '@cvsystem/core';
import type { CVFile } from '@cvsystem/core';

// Minimal CVFile fixture that passes CVFileSchema validation
function makeFile(overrides: Partial<CVFile> = {}): CVFile {
  return {
    format: 'cv-system',
    version: '1.0',
    schemaVersion: 2,
    metadata: {
      savedAt: '2024-01-01T00:00:00.000Z',
      importSource: null,
      importedAt: null,
      originalCinodeId: null,
      locales: ['sv'],
    },
    cv: {
      id: 'test-id',
      locales: ['sv'],
      name: { first: 'Test', last: 'User' },
      title: { sv: 'Konsult', en: 'Consultant' },
      summary: { sv: '', en: '' },
      skills: [],
      roles: [],
      trainings: [],
      educations: [],
      commitments: [],
      hobbyProjects: [],
      contacts: { email: null, phone: null, address: null, website: null },
      photoDataUrl: null,
      coverPageGroups: { roles: [], expertKnowledge: [], languages: [] },
      featuredProjects: [],
      printBreakBefore: {},
      renderSpecs: [],
      activeRenderSpecId: null,
    },
    rawCinode: null,
    ...overrides,
  } as CVFile;
}

// ── MemoryAdapter ─────────────────────────────────────────────────────────────

describe('MemoryAdapter', () => {
  it('returns null on first load', async () => {
    const adapter = new MemoryAdapter();
    expect(await adapter.load()).toBeNull();
  });

  it('saves and loads a file', async () => {
    const adapter = new MemoryAdapter();
    const file = makeFile();
    await adapter.save(file);
    const loaded = await adapter.load();
    expect(loaded?.cv.id).toBe('test-id');
  });

  it('clear removes stored data', async () => {
    const adapter = new MemoryAdapter();
    await adapter.save(makeFile());
    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });

  it('two instances do not share state', async () => {
    const a = new MemoryAdapter();
    const b = new MemoryAdapter();
    await a.save(makeFile());
    expect(await b.load()).toBeNull();
  });
});

// ── LocalStorageAdapter ───────────────────────────────────────────────────────

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when storage is empty', async () => {
    const adapter = new LocalStorageAdapter();
    expect(await adapter.load()).toBeNull();
  });

  it('saves and reloads a file', async () => {
    const adapter = new LocalStorageAdapter();
    const file = makeFile();
    await adapter.save(file);
    const loaded = await adapter.load();
    expect(loaded?.cv.id).toBe('test-id');
    expect(loaded?.format).toBe('cv-system');
  });

  it('clear removes the item from localStorage', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.save(makeFile());
    await adapter.clear();
    expect(localStorage.getItem(DEFAULT_CV_STORAGE_KEY)).toBeNull();
    expect(await adapter.load()).toBeNull();
  });

  it('uses the default storage key', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.save(makeFile());
    expect(localStorage.getItem(DEFAULT_CV_STORAGE_KEY)).not.toBeNull();
  });

  it('supports a custom storage key', async () => {
    const a = new LocalStorageAdapter('custom-key');
    const b = new LocalStorageAdapter(DEFAULT_CV_STORAGE_KEY);
    await a.save(makeFile());
    expect(await b.load()).toBeNull();
    expect(localStorage.getItem('custom-key')).not.toBeNull();
  });

  it('returns null for corrupted JSON without throwing', async () => {
    localStorage.setItem(DEFAULT_CV_STORAGE_KEY, '{not valid json}');
    const adapter = new LocalStorageAdapter();
    expect(await adapter.load()).toBeNull();
  });

  it('migrates a v1 file to the current schema on load', async () => {
    const v1File = {
      format: 'cv-system',
      version: '1.0',
      schemaVersion: 1,
      metadata: {
        savedAt: '2024-01-01T00:00:00.000Z',
        importSource: null,
        importedAt: null,
        originalCinodeId: null,
        locales: ['sv'],
      },
      cv: {
        id: 'v1-id',
        locales: ['sv'],
        name: { first: 'Old', last: 'User' },
        title: { sv: '', en: '' },
        summary: { sv: '', en: '' },
        skills: [{ id: 's1', name: 'TypeScript', level: 5, years: 2, category: null, visible: true }],
        roles: [],
        trainings: [],
        educations: [],
        commitments: [],
        hobbyProjects: [],
        contacts: { email: null, phone: null, address: null, website: null },
        photoDataUrl: null,
        coverPageGroups: { roles: [], expertKnowledge: [], languages: [] },
        featuredProjects: [],
        printBreakBefore: {},
      },
      rawCinode: null,
    };
    localStorage.setItem(DEFAULT_CV_STORAGE_KEY, JSON.stringify(v1File));
    const adapter = new LocalStorageAdapter();
    const loaded = await adapter.load();
    // Migration adds renderSpecs / activeRenderSpecId and ontologyRef/groupAs on skills
    expect(loaded?.cv.renderSpecs).toEqual([]);
    expect(loaded?.cv.activeRenderSpecId).toBeNull();
    expect((loaded?.cv.skills[0] as unknown as Record<string, unknown>).ontologyRef).toBeNull();
  });
});
