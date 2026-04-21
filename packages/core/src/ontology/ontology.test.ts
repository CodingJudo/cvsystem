import { describe, it, expect } from 'vitest';
import { searchOntology, buildNeighborhood, findByName } from './index';

describe('searchOntology', () => {
  it('returns empty array for empty query', () => {
    expect(searchOntology('', new Set(), 10)).toEqual([]);
    expect(searchOntology('   ', new Set(), 10)).toEqual([]);
  });

  it('finds React by exact name', () => {
    const results = searchOntology('React', new Set(), 5);
    expect(results[0]?.name).toBe('React');
  });

  it('ranks exact match above prefix match', () => {
    const results = searchOntology('Java', new Set(), 20);
    expect(results[0]?.name).toBe('Java');
    const names = results.map((r) => r.name);
    expect(names).toContain('JavaScript');
    expect(names.indexOf('Java')).toBeLessThan(names.indexOf('JavaScript'));
  });

  it('matches synonyms (reactjs -> React)', () => {
    const results = searchOntology('reactjs', new Set(), 5);
    expect(results.some((r) => r.name === 'React')).toBe(true);
  });

  it('is case-insensitive', () => {
    const lower = searchOntology('react', new Set(), 5);
    const upper = searchOntology('REACT', new Set(), 5);
    expect(lower[0]?.name).toBe(upper[0]?.name);
  });

  it('excludes names provided by the caller', () => {
    const withoutExclusion = searchOntology('React', new Set(), 5);
    expect(withoutExclusion.some((r) => r.name === 'React')).toBe(true);

    const withExclusion = searchOntology('React', new Set(['react']), 5);
    expect(withExclusion.some((r) => r.name === 'React')).toBe(false);
  });

  it('respects the limit', () => {
    const results = searchOntology('a', new Set(), 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns suggestion shape (name, synonyms, technicalDomains)', () => {
    const [first] = searchOntology('React', new Set(), 1);
    expect(first).toBeDefined();
    expect(typeof first!.name).toBe('string');
    expect(Array.isArray(first!.synonyms)).toBe(true);
    expect(Array.isArray(first!.technicalDomains)).toBe(true);
  });
});

describe('buildNeighborhood', () => {
  it('returns seed nodes at depth 0', () => {
    const { nodes } = buildNeighborhood(['React'], new Map([['react', 'skill-1']]), 1, 50);
    const react = nodes.find((n) => n.name === 'React');
    expect(react).toBeDefined();
    expect(react!.depth).toBe(0);
    expect(react!.ownedId).toBe('skill-1');
  });

  it('includes 1-hop implied skills', () => {
    // React implies knowing JavaScript (per the ontology)
    const { nodes } = buildNeighborhood(['React'], new Map([['react', 'skill-1']]), 1, 50);
    const names = nodes.map((n) => n.name);
    expect(names).toContain('JavaScript');
  });

  it('1-hop neighbor has depth 1', () => {
    const { nodes } = buildNeighborhood(['React'], new Map([['react', 'skill-1']]), 1, 50);
    const js = nodes.find((n) => n.name === 'JavaScript');
    expect(js?.depth).toBe(1);
  });

  it('returns edges between included nodes', () => {
    const { edges } = buildNeighborhood(['React'], new Map([['react', 'skill-1']]), 1, 50);
    const reactToJs = edges.find((e) => e.from === 'React' && e.to === 'JavaScript');
    expect(reactToJs).toBeDefined();
  });

  it('respects nodeCap — non-seed nodes do not exceed cap', () => {
    const { nodes } = buildNeighborhood(['React'], new Map([['react', 'skill-1']]), 2, 3);
    const nonSeed = nodes.filter((n) => n.depth > 0);
    expect(nonSeed.length).toBeLessThanOrEqual(3);
  });

  it('marks owned neighbors with their skillId', () => {
    // If JavaScript is also an owned skill in the context map
    const ownedMap = new Map([['react', 'skill-1'], ['javascript', 'skill-2']]);
    const { nodes } = buildNeighborhood(['React'], ownedMap, 1, 50);
    const js = nodes.find((n) => n.name === 'JavaScript');
    expect(js?.ownedId).toBe('skill-2');
  });

  it('returns empty graph for unknown seed', () => {
    const { nodes, edges } = buildNeighborhood(
      ['__nonexistent_skill__'],
      new Map(),
      1,
      50,
    );
    // Seed itself is included as depth 0, no neighbors
    expect(nodes.length).toBe(1);
    expect(edges.length).toBe(0);
  });

  it('does not include edges where either endpoint is absent', () => {
    // With nodeCap=0, only seeds should be included; no neighbor edges
    const { edges } = buildNeighborhood(['React'], new Map([['react', 'skill-1']]), 2, 0);
    expect(edges.length).toBe(0);
  });

  it('resolves synonym seeds to canonical names', () => {
    // "reactjs" is a synonym for "React"
    const entry = findByName('reactjs');
    expect(entry?.name).toBe('React'); // prerequisite: synonym exists
    const { nodes } = buildNeighborhood(['reactjs'], new Map([['react', 'skill-1']]), 0, 0);
    const react = nodes.find((n) => n.name === 'React');
    expect(react).toBeDefined();
  });
});
