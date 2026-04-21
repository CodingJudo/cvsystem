/**
 * MIND Tech Ontology lookup service.
 * Server-safe — no React, no browser APIs.
 *
 * Data source: MIND Tech Skills & Concepts Ontology (MIT License)
 * https://github.com/or-mihai-or-gheorghe/MIND-tech-ontology
 *
 * Custom layer: callers can inject user-defined entries via
 * `setCustomOntologyEntries()`. Custom entries with the same canonical
 * name as a MIND entry fully replace that entry; new names are additive.
 * All exported lookup functions always operate on the merged dataset.
 */

import rawData from './mind-skills.json';

export interface OntologySkill {
  name: string;
  synonyms: string[];
  type: string[];
  technicalDomains: string[];
  impliesKnowingSkills: string[];
  /** When true, this custom entry is merged on top of the MIND entry with the same name
   *  rather than replacing it. Synonyms, impliesKnowingSkills, and technicalDomains are
   *  unioned; type is overridden only when non-empty. */
  extendsMindEntry?: boolean;
}

// ---------------------------------------------------------------------------
// Base (MIND) data — immutable after module load
// ---------------------------------------------------------------------------

// Cast imported JSON — we only type the fields we actually use
const baseSkillsList = rawData as OntologySkill[];

// Lookup map built once from MIND data: lowercase name/synonym → entry
const baseLookupMap = new Map<string, OntologySkill>();

for (const skill of baseSkillsList) {
  baseLookupMap.set(skill.name.toLowerCase(), skill);
  for (const synonym of skill.synonyms) {
    const key = synonym.toLowerCase();
    if (!baseLookupMap.has(key)) {
      baseLookupMap.set(key, skill);
    }
  }
}

// ---------------------------------------------------------------------------
// Effective (merged) data — updated by setCustomOntologyEntries()
// Starts as a reference to the base; replaced when custom entries are loaded.
// ---------------------------------------------------------------------------

let effectiveSkillsList: OntologySkill[] = baseSkillsList;
let effectiveLookupMap: Map<string, OntologySkill> = baseLookupMap;

/**
 * Inject user-defined ontology entries on top of the MIND data.
 *
 * - Custom entries whose `name` matches a MIND entry (case-insensitive) fully
 *   replace that MIND entry.
 * - Custom entries with new names are additive.
 * - Custom synonyms shadow any MIND synonyms that would resolve to a different entry.
 *
 * Call this once on app boot (with persisted data) and again after every edit.
 */
export function setCustomOntologyEntries(custom: OntologySkill[]): void {
  if (custom.length === 0) {
    // Reset to base data
    effectiveSkillsList = baseSkillsList;
    effectiveLookupMap = baseLookupMap;
    return;
  }

  // Separate replace vs extend entries
  const replaceEntries = custom.filter((e) => !e.extendsMindEntry);
  const extendEntries = custom.filter((e) => e.extendsMindEntry);

  // Build merged entries for extend mode: union fields on top of MIND data
  const mergedExtends: OntologySkill[] = extendEntries.map((ext) => {
    const mind = baseLookupMap.get(ext.name.toLowerCase());
    if (!mind) return ext; // no MIND entry to extend — treat as new custom
    return {
      ...mind,
      synonyms: [...new Set([...mind.synonyms, ...ext.synonyms])],
      impliesKnowingSkills: [...new Set([...mind.impliesKnowingSkills, ...ext.impliesKnowingSkills])],
      technicalDomains: [...new Set([...mind.technicalDomains, ...ext.technicalDomains])],
      type: ext.type.length > 0 ? ext.type : mind.type,
      extendsMindEntry: true,
    };
  });

  // Filter out MIND entries whose canonical name is replaced or extended by a custom entry
  const overriddenNames = new Set(
    [...replaceEntries, ...mergedExtends].map((e) => e.name.toLowerCase()),
  );
  const filteredMind = baseSkillsList.filter(
    (e) => !overriddenNames.has(e.name.toLowerCase()),
  );

  // Extended + replace entries listed first so they appear first in search results
  effectiveSkillsList = [...mergedExtends, ...replaceEntries, ...filteredMind];

  // Rebuild lookup map: custom entries take synonym priority over MIND
  const merged = new Map<string, OntologySkill>();
  for (const entry of effectiveSkillsList) {
    merged.set(entry.name.toLowerCase(), entry);
    for (const syn of entry.synonyms) {
      const key = syn.toLowerCase();
      if (!merged.has(key)) merged.set(key, entry);
    }
  }
  effectiveLookupMap = merged;
}

/**
 * Look up a MIND (base) entry by name or synonym.
 * Returns null if the name is not found in the MIND data (regardless of custom entries).
 * Useful for determining whether a custom entry overrides a MIND entry.
 */
export function getMindEntry(name: string): OntologySkill | null {
  if (!name) return null;
  return baseLookupMap.get(name.toLowerCase().trim()) ?? null;
}

// ---------------------------------------------------------------------------
// Lookup helpers (operate on effective/merged dataset)
// ---------------------------------------------------------------------------

/**
 * Find the canonical ontology entry for a skill name.
 * Checks both canonical names and synonyms, case-insensitively.
 * Returns null if no match is found.
 */
export function findByName(name: string): OntologySkill | null {
  if (!name) return null;
  return effectiveLookupMap.get(name.toLowerCase().trim()) ?? null;
}

/**
 * Suggest the canonical name for a user-typed string.
 * Returns the canonical name if a match is found via synonyms,
 * or null if the input is already canonical / unknown.
 *
 * Example: "reactjs" → "React", "Csharp" → "C#"
 * Example: "React" → null (already canonical)
 */
export function suggestCanonicalName(input: string): string | null {
  if (!input) return null;
  const entry = findByName(input);
  if (!entry) return null;
  // Only suggest if the input doesn't already match the canonical name exactly
  if (entry.name.toLowerCase() === input.toLowerCase().trim()) return null;
  return entry.name;
}

/**
 * Get the technical domains for a skill (e.g. ["Backend", "Fullstack"]).
 * Accepts either a canonical name or a synonym.
 * Returns an empty array if the skill is not in the ontology.
 */
export function getDomains(nameOrSynonym: string): string[] {
  return findByName(nameOrSynonym)?.technicalDomains ?? [];
}

/**
 * Get the implied parent/related concepts for a skill.
 * For example, "Next.js" implies knowing ["React", "JavaScript", "CSS", "HTML"].
 * Returns an empty array if the skill is not in the ontology or has no implied skills.
 */
export function getImpliedConcepts(nameOrSynonym: string): string[] {
  return findByName(nameOrSynonym)?.impliesKnowingSkills ?? [];
}

// ---------------------------------------------------------------------------
// Search interfaces
// ---------------------------------------------------------------------------

export interface OntologySuggestion {
  name: string;
  synonyms: string[];
  technicalDomains: string[];
}

export interface NeighborhoodNode {
  name: string;
  /** 0 = seed (user owns it in context), 1 = 1-hop implied, 2 = 2-hop implied */
  depth: number;
  /** Skill ID from cv.skills when the user owns this skill in the current context */
  ownedId?: string;
}

export interface NeighborhoodEdge {
  /** Canonical name of the source node */
  from: string;
  /** Canonical name of the target node (direction: from implies knowing to) */
  to: string;
}

export interface NeighborhoodGraph {
  nodes: NeighborhoodNode[];
  edges: NeighborhoodEdge[];
}

// ---------------------------------------------------------------------------
// Search functions
// ---------------------------------------------------------------------------

/** Shared scoring logic — extracted so both search variants reuse it. */
function scoreEntries(
  list: OntologySkill[],
  map: Map<string, OntologySkill>,
  query: string,
  excludeNames: Set<string>,
  limit: number,
): OntologySuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { entry: OntologySkill; score: number }[] = [];

  for (const entry of list) {
    const nameLc = entry.name.toLowerCase();
    if (excludeNames.has(nameLc)) continue;

    let score = -1;
    if (nameLc === q) score = 0;
    else if (nameLc.startsWith(q)) score = 1;
    else {
      for (const syn of entry.synonyms) {
        if (syn.toLowerCase().startsWith(q)) {
          score = 2;
          break;
        }
      }
      if (score === -1 && nameLc.includes(q)) score = 3;
      else if (score === -1) {
        for (const syn of entry.synonyms) {
          if (syn.toLowerCase().includes(q)) {
            score = 4;
            break;
          }
        }
      }
    }

    if (score >= 0) scored.push({ entry, score });
  }

  // Unused `map` parameter kept for consistent signature; suppress lint
  void map;

  scored.sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name));

  return scored.slice(0, limit).map(({ entry }) => ({
    name: entry.name,
    synonyms: entry.synonyms,
    technicalDomains: entry.technicalDomains,
  }));
}

/**
 * Search the effective (MIND + custom) ontology.
 *
 * Ranking (best first):
 *   0 — exact name match
 *   1 — name starts with query
 *   2 — any synonym starts with query
 *   3 — name contains query
 *   4 — any synonym contains query
 *
 * `excludeNames` is a set of lowercased canonical names the caller already
 * has (typically derived from cv.skills) and wants filtered out.
 */
export function searchOntology(
  query: string,
  excludeNames: Set<string>,
  limit: number,
): OntologySuggestion[] {
  return scoreEntries(effectiveSkillsList, effectiveLookupMap, query, excludeNames, limit);
}

/**
 * Search only the MIND base ontology (ignores custom entries).
 * Used by the "Import from MIND" feature in the ontology editor so the user
 * can browse the upstream dataset directly.
 */
export function searchMindOntology(
  query: string,
  excludeNames: Set<string>,
  limit: number,
): OntologySuggestion[] {
  return scoreEntries(baseSkillsList, baseLookupMap, query, excludeNames, limit);
}

// ---------------------------------------------------------------------------
// Graph building
// ---------------------------------------------------------------------------

/**
 * Build a graph of ontology nodes within `maxHops` of the seed skill names.
 *
 * `seeds` — canonical or synonym names of the skills in the current context.
 * `ownedMap` — Map<lowerCaseCanonicalName, skillId> for skills the user has in context.
 * `maxHops` — number of `impliesKnowingSkills` hops from seeds (typically 1 or 2).
 * `nodeCap` — max number of non-seed nodes included (closest-first).
 *
 * Returns only nodes and edges between nodes that made it into the result set.
 */
export function buildNeighborhood(
  seeds: string[],
  ownedMap: Map<string, string>,
  maxHops: number,
  nodeCap: number,
): NeighborhoodGraph {
  // Resolve seeds to canonical names via the lookup map
  const seedEntries: { canonical: string; ownedId: string | undefined }[] = [];
  for (const seed of seeds) {
    const entry = findByName(seed);
    const canonical = entry?.name ?? seed;
    const ownedId = ownedMap.get(canonical.toLowerCase());
    seedEntries.push({ canonical, ownedId });
  }

  // BFS
  const nodeMap = new Map<string, NeighborhoodNode>(); // canonical → node
  const edgeSet = new Set<string>(); // "from→to" dedup key
  const rawEdges: NeighborhoodEdge[] = [];

  // Initialise seeds at depth 0
  for (const { canonical, ownedId } of seedEntries) {
    if (!nodeMap.has(canonical)) {
      nodeMap.set(canonical, { name: canonical, depth: 0, ownedId });
    }
  }

  // BFS queue: [canonicalName, depth]
  const queue: [string, number][] = seedEntries.map(({ canonical }) => [canonical, 0]);
  let neighborCount = 0;

  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;
    if (depth >= maxHops) continue;

    const entry = findByName(current);
    if (!entry) continue;

    for (const implied of entry.impliesKnowingSkills) {
      const impliedEntry = findByName(implied);
      const canonical = impliedEntry?.name ?? implied;

      // Record edge (between nodes that may or may not make the cap)
      const edgeKey = `${current}→${canonical}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        rawEdges.push({ from: current, to: canonical });
      }

      if (nodeMap.has(canonical)) {
        // Already seen — no re-queue, but depth already set at its earliest encounter
        continue;
      }

      // Enforce non-seed cap
      if (neighborCount >= nodeCap) continue;

      const newDepth = depth + 1;
      const ownedId = ownedMap.get(canonical.toLowerCase());
      nodeMap.set(canonical, { name: canonical, depth: newDepth, ownedId });
      neighborCount++;
      queue.push([canonical, newDepth]);
    }
  }

  // Only return edges where both endpoints are in the node set
  const nodeNames = new Set(nodeMap.keys());
  const edges = rawEdges.filter((e) => nodeNames.has(e.from) && nodeNames.has(e.to));

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}
