'use client';

/**
 * SkillGraphModal — ontology graph exploration for a role, hobby project,
 * or the full competence list.
 *
 * Features: radial auto-layout, drag-and-drop, configurable hop depth,
 * node selection (green highlight), Hide / Merge / Focus actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  type NodeProps,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { DomainCV, Locale, Skill } from '@/domain/model/cv';
import { buildNeighborhood, findByName, type NeighborhoodNode } from '@/lib/ontology';
import { useSkills, useRoles, useHobbyProjects } from '@/lib/store/cv-store';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GraphContext =
  | { type: 'role'; roleId: string }
  | { type: 'hobby'; projectId: string }
  | null;

export interface SkillGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  cv: DomainCV;
  initialContext: GraphContext;
  locale: Locale;
}

// ---------------------------------------------------------------------------
// Draft state
// ---------------------------------------------------------------------------

interface DraftState {
  /** main-skill IDs to set visible:false on Save */
  hiddenSkillIds: Set<string>;
  /** canonical names to create + add to context on Save */
  addedOntologyNames: string[];
  /** for replacement-edge styling: original hidden → canonical added */
  replacements: Array<{ originalSkillId: string; canonicalName: string }>;
}

const emptyDraft = (): DraftState => ({
  hiddenSkillIds: new Set(),
  addedOntologyNames: [],
  replacements: [],
});

// ---------------------------------------------------------------------------
// Custom node type
// ---------------------------------------------------------------------------

type SkillNodeData = {
  label: string;
  depth: number;
  isOwned: boolean;
  isSelected: boolean;
  isDraftHidden: boolean;
  isDraftAdded: boolean;
  isReplacement: boolean;
};

type SkillNodeType = Node<SkillNodeData, 'skillNode'>;

function SkillNode({ data }: NodeProps<SkillNodeType>) {
  const { label, depth, isOwned, isSelected, isDraftHidden, isDraftAdded, isReplacement } =
    data;

  let colorCls: string;
  if (isSelected) {
    colorCls =
      'bg-green-100 border-green-500 text-green-800 font-semibold ring-2 ring-green-300';
  } else if (isDraftHidden) {
    colorCls = 'bg-gray-100 border-gray-300 text-gray-400 line-through opacity-50';
  } else if (isReplacement) {
    colorCls = 'bg-green-50 border-green-400 text-green-700 font-semibold';
  } else if (isOwned || isDraftAdded) {
    colorCls =
      'bg-(--brand-primary)/15 border-(--brand-primary) text-(--brand-secondary) font-semibold';
  } else {
    colorCls = 'bg-white border-gray-200 text-gray-500';
  }

  const sizeCls =
    depth === 0
      ? 'text-sm px-3 py-1.5'
      : depth === 1
        ? 'text-xs px-2.5 py-1'
        : 'text-[10px] px-2 py-0.5';

  return (
    <div
      className={`rounded-full border-2 cursor-pointer select-none transition-colors ${colorCls} ${sizeCls}`}
      title={label}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span className="whitespace-nowrap">{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { skillNode: SkillNode };

// ---------------------------------------------------------------------------
// Radial layout
// ---------------------------------------------------------------------------

const MIN_ARC = 150;
const MIN_GAP = 200;

function radialLayout(nodes: NeighborhoodNode[]): SkillNodeType[] {
  const byDepth: Record<number, NeighborhoodNode[]> = {};
  for (const n of nodes) (byDepth[n.depth] ??= []).push(n);

  const depths = Object.keys(byDepth)
    .map(Number)
    .sort((a, b) => a - b);

  const ringR: Record<number, number> = {};
  let prevR = 0;

  depths.forEach((depth, di) => {
    const count = byDepth[depth].length;
    const minForSpacing = (count * MIN_ARC) / (2 * Math.PI);
    if (di === 0) {
      ringR[depth] = count <= 1 ? 0 : Math.max(minForSpacing, 120);
    } else {
      ringR[depth] = Math.max(prevR + MIN_GAP, minForSpacing);
    }
    prevR = ringR[depth];
  });

  const result: SkillNodeType[] = [];

  for (const depth of depths) {
    const group = byDepth[depth];
    const r = ringR[depth];

    group.forEach((n, i) => {
      const angle =
        r === 0 ? 0 : (2 * Math.PI * i) / group.length - Math.PI / 2;
      result.push({
        id: n.name,
        type: 'skillNode' as const,
        position: { x: r * Math.cos(angle), y: r * Math.sin(angle) },
        data: {
          label: n.name,
          depth,
          isOwned: !!n.ownedId,
          isSelected: false,
          isDraftHidden: false,
          isDraftAdded: false,
          isReplacement: false,
        },
      });
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function SkillGraphModal({
  isOpen,
  onClose,
  cv,
  initialContext,
  locale,
}: SkillGraphModalProps) {
  const [context, setContext] = useState<GraphContext>(initialContext);
  const [maxHops, setMaxHops] = useState(2);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mergeMenuOpen, setMergeMenuOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfInstanceRef = useRef<any>(null);

  const { addSkill } = useSkills();
  const { addExistingSkillToRole, toggleRoleSkillVisibility } = useRoles();
  const { addExistingSkillToHobbyProject, toggleHobbyProjectSkillVisibility } =
    useHobbyProjects();

  // --- Context skills ---

  const contextSkills = useMemo((): Skill[] => {
    if (context === null) return cv.skills;
    if (context.type === 'role') {
      const role = cv.roles.find((r) => r.id === context.roleId);
      return role
        ? role.skills
            .map((rs) => cv.skills.find((s) => s.id === rs.id))
            .filter((s): s is Skill => !!s)
        : [];
    }
    const proj = (cv.hobbyProjects ?? []).find((p) => p.id === context.projectId);
    return proj
      ? proj.skills
          .map((rs) => cv.skills.find((s) => s.id === rs.id))
          .filter((s): s is Skill => !!s)
      : [];
  }, [cv, context]);

  // synonymPairs: owned skills whose stored name is a synonym of a canonical name
  const synonymPairs = useMemo(() => {
    return contextSkills.flatMap((s) => {
      const rawName = s.ontologyRef ?? s.name;
      const entry = findByName(rawName);
      if (!entry || entry.name.toLowerCase() === rawName.toLowerCase()) return [];
      return [{ rawName, canonical: entry.name, skillId: s.id }];
    });
  }, [contextSkills]);

  // ownedMap: canonical-name-lowercase → skillId (includes draft-added)
  const ownedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of contextSkills) {
      const c = s.ontologyRef ?? s.name;
      m.set(c.toLowerCase(), s.id);
      m.set(s.name.toLowerCase(), s.id);
    }
    // Also map canonical names for synonym skills so canonical nodes show as owned
    for (const { canonical, skillId } of synonymPairs) {
      if (!m.has(canonical.toLowerCase())) {
        m.set(canonical.toLowerCase(), skillId);
      }
    }
    for (const name of draft.addedOntologyNames) {
      m.set(name.toLowerCase(), `draft-${name}`);
    }
    return m;
  }, [contextSkills, synonymPairs, draft.addedOntologyNames]);

  // --- Neighborhood ---

  const neighborhood = useMemo(() => {
    const seeds = contextSkills.map((s) => s.ontologyRef ?? s.name);
    const nodeCap = Math.min(30 + maxHops * 30, 150);
    return buildNeighborhood(seeds, ownedMap, maxHops, nodeCap);
  }, [contextSkills, ownedMap, maxHops]);

  // --- Derived sets for node data ---

  const hiddenSkillNames = useMemo(() => {
    const s = new Set<string>();
    for (const id of draft.hiddenSkillIds) {
      const skill = cv.skills.find((sk) => sk.id === id);
      if (skill) {
        s.add((skill.ontologyRef ?? skill.name).toLowerCase());
        s.add(skill.name.toLowerCase());
      }
    }
    return s;
  }, [draft.hiddenSkillIds, cv.skills]);

  const addedNames = useMemo(
    () => new Set(draft.addedOntologyNames.map((n) => n.toLowerCase())),
    [draft.addedOntologyNames],
  );

  const replacementTargets = useMemo(
    () => new Set(draft.replacements.map((r) => r.canonicalName.toLowerCase())),
    [draft.replacements],
  );

  // --- Compute node data (without positions — positions managed by useNodesState) ---

  const layoutNodes = useMemo(
    () => radialLayout(neighborhood.nodes),
    [neighborhood.nodes],
  );

  // Extra nodes for synonym skills (owned skill name ≠ canonical name).
  // These are added OUTSIDE buildNeighborhood so the raw alias appears as its own node.
  const synonymExtraNodes = useMemo((): SkillNodeType[] => {
    return synonymPairs
      .filter((p) => !layoutNodes.some((n) => n.id.toLowerCase() === p.rawName.toLowerCase()))
      .map((p) => {
        const canonicalNode = layoutNodes.find(
          (n) => n.id.toLowerCase() === p.canonical.toLowerCase(),
        );
        const pos = canonicalNode
          ? { x: canonicalNode.position.x + 80, y: canonicalNode.position.y - 60 }
          : { x: 80, y: -60 };
        return {
          id: p.rawName,
          type: 'skillNode' as const,
          position: pos,
          data: {
            label: p.rawName,
            depth: 0,
            isOwned: true,
            isSelected: false,
            isDraftHidden: false,
            isDraftAdded: false,
            isReplacement: false,
          },
        };
      });
  }, [synonymPairs, layoutNodes]);

  const allLayoutNodes = useMemo(
    () => [...layoutNodes, ...synonymExtraNodes],
    [layoutNodes, synonymExtraNodes],
  );

  const computedNodes = useMemo(
    (): SkillNodeType[] =>
      allLayoutNodes.map((n) => {
        const nameLc = n.id.toLowerCase();
        const ownedId = ownedMap.get(nameLc);
        return {
          ...n,
          data: {
            ...n.data,
            isOwned: !!ownedId && !ownedId.startsWith('draft-'),
            isSelected: n.id === selectedNode,
            isDraftHidden: hiddenSkillNames.has(nameLc),
            isDraftAdded: addedNames.has(nameLc),
            isReplacement: replacementTargets.has(nameLc),
          },
        };
      }),
    [
      allLayoutNodes,
      ownedMap,
      selectedNode,
      hiddenSkillNames,
      addedNames,
      replacementTargets,
    ],
  );

  // Layout edges — replacement edges get a green animated style; synonym edges get amber dashed
  const layoutEdges = useMemo((): Edge[] => {
    const replacementOrigNames = new Set(
      draft.replacements.flatMap((r) => {
        const skill = cv.skills.find((s) => s.id === r.originalSkillId);
        return skill ? [(skill.ontologyRef ?? skill.name)] : [];
      }),
    );
    const ontologyEdges: Edge[] = neighborhood.edges.map((e) => {
      const isReplacementEdge =
        replacementOrigNames.has(e.from) && replacementTargets.has(e.to.toLowerCase());
      return {
        id: `${e.from}→${e.to}`,
        source: e.from,
        target: e.to,
        animated: isReplacementEdge,
        style: isReplacementEdge
          ? { stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '4 2' }
          : { stroke: '#cbd5e1', strokeWidth: 1 },
      };
    });
    const synonymEdges: Edge[] = synonymPairs.map(({ rawName, canonical }) => ({
      id: `syn:${rawName}→${canonical}`,
      source: rawName,
      target: canonical,
      animated: false,
      style: { stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '5 3' },
      label: '≈',
      labelStyle: { fontSize: 10, fill: '#f59e0b' },
      labelBgStyle: { fill: 'transparent' },
    }));
    return [...ontologyEdges, ...synonymEdges];
  }, [neighborhood.edges, draft.replacements, replacementTargets, cv.skills, synonymPairs]);

  // --- React Flow node state (supports drag) ---

  const [nodes, setNodes, onNodesChange] = useNodesState<SkillNodeType>(computedNodes);

  // Detect whether the neighborhood structure changed (different set of node IDs)
  const currentNodeIds = useMemo(
    () => allLayoutNodes.map((n) => n.id).sort().join(','),
    [allLayoutNodes],
  );
  const prevNodeIdsRef = useRef('');

  useEffect(() => {
    const isNewStructure = prevNodeIdsRef.current !== currentNodeIds;
    prevNodeIdsRef.current = currentNodeIds;

    if (isNewStructure) {
      // New neighborhood: reset to computed positions
      setNodes(computedNodes);
      setTimeout(
        () => rfInstanceRef.current?.fitView({ padding: 0.2, duration: 300 }),
        50,
      );
    } else {
      // Same nodes: merge drag positions with updated data
      setNodes((prev) => {
        const posMap = new Map(prev.map((n) => [n.id, n.position]));
        return computedNodes.map((n) => ({
          ...n,
          position: posMap.get(n.id) ?? n.position,
        }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedNodes, currentNodeIds]);

  // --- Selected node info ---

  const selectedNodeInfo = useMemo(() => {
    if (!selectedNode) return null;
    const nameLc = selectedNode.toLowerCase();
    const ownedId = ownedMap.get(nameLc);
    const isOwned = !!ownedId && !ownedId.startsWith('draft-');
    const isDraftAdded = addedNames.has(nameLc);
    const isDraftHidden = hiddenSkillNames.has(nameLc);

    // If the selected node is a synonym alias, its canonical is a merge target
    const synonymCanonical = synonymPairs.find(
      (p) => p.rawName.toLowerCase() === nameLc,
    )?.canonical;
    const synonymMergeOptions = synonymCanonical ? [synonymCanonical] : [];

    // Merge options: synonym canonical first, then implied skills
    const entry = findByName(selectedNode);
    const mergeOptions = [
      ...synonymMergeOptions,
      ...(entry?.impliesKnowingSkills ?? []),
    ].slice(0, 6);

    return { ownedId, isOwned, isDraftAdded, isDraftHidden, mergeOptions };
  }, [selectedNode, ownedMap, addedNames, hiddenSkillNames, synonymPairs]);

  // --- Action handlers ---

  const handleHide = useCallback(() => {
    if (!selectedNode || !selectedNodeInfo?.isOwned) return;
    const { ownedId } = selectedNodeInfo;
    if (!ownedId || ownedId.startsWith('draft-')) return;
    setDraft((d) => {
      const next = new Set(d.hiddenSkillIds);
      next.add(ownedId);
      return { ...d, hiddenSkillIds: next };
    });
    setMergeMenuOpen(false);
  }, [selectedNode, selectedNodeInfo]);

  const handleShow = useCallback(() => {
    if (!selectedNode || !selectedNodeInfo?.ownedId) return;
    const { ownedId } = selectedNodeInfo;
    setDraft((d) => {
      const next = new Set(d.hiddenSkillIds);
      next.delete(ownedId!);
      return { ...d, hiddenSkillIds: next };
    });
  }, [selectedNode, selectedNodeInfo]);

  const handleMerge = useCallback(
    (canonicalName: string) => {
      if (!selectedNode || !selectedNodeInfo?.isOwned) return;
      const { ownedId } = selectedNodeInfo;
      if (!ownedId || ownedId.startsWith('draft-')) return;
      setDraft((d) => {
        // Only add to addedOntologyNames if not already a real owned skill or already draft-added
        const alreadyOwned = ownedMap.has(canonicalName.toLowerCase()) &&
          !d.addedOntologyNames.includes(canonicalName);
        const alreadyDraft = d.addedOntologyNames.includes(canonicalName);
        return {
          hiddenSkillIds: new Set([...d.hiddenSkillIds, ownedId]),
          addedOntologyNames: (alreadyOwned || alreadyDraft)
            ? d.addedOntologyNames
            : [...d.addedOntologyNames, canonicalName],
          replacements: [...d.replacements, { originalSkillId: ownedId, canonicalName }],
        };
      });
      setSelectedNode(null);
      setMergeMenuOpen(false);
    },
    [selectedNode, selectedNodeInfo, ownedMap],
  );

  /** Re-position neighbors tightly around the focused node. */
  const handleFocus = useCallback(() => {
    if (!selectedNode) return;

    setNodes((prev) => {
      const focusNode = prev.find((n) => n.id === selectedNode);
      if (!focusNode) return prev;

      const { x: cx, y: cy } = focusNode.position;

      // Direct neighbors in the graph
      const ring1Ids: string[] = [];
      for (const e of layoutEdges) {
        if (e.source === selectedNode && !ring1Ids.includes(e.target as string))
          ring1Ids.push(e.target as string);
        if (e.target === selectedNode && !ring1Ids.includes(e.source as string))
          ring1Ids.push(e.source as string);
      }

      // 2-hop neighbors (connected to ring1, not already in ring1 or focus)
      const ring2Ids: string[] = [];
      for (const e of layoutEdges) {
        const src = e.source as string;
        const tgt = e.target as string;
        if (ring1Ids.includes(src) && src !== selectedNode && !ring1Ids.includes(tgt) && tgt !== selectedNode && !ring2Ids.includes(tgt))
          ring2Ids.push(tgt);
        if (ring1Ids.includes(tgt) && tgt !== selectedNode && !ring1Ids.includes(src) && src !== selectedNode && !ring2Ids.includes(src))
          ring2Ids.push(src);
      }

      const place = (ids: string[], r: number, cx: number, cy: number) =>
        Object.fromEntries(
          ids.map((id, i) => {
            const angle =
              ids.length === 1
                ? -Math.PI / 2
                : (2 * Math.PI * i) / ids.length - Math.PI / 2;
            return [id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }];
          }),
        ) as Record<string, { x: number; y: number }>;

      const ring1Pos = place(ring1Ids, 170, cx, cy);
      const ring2Pos = place(ring2Ids, 340, cx, cy);

      return prev.map((n) => {
        if (n.id === selectedNode) return n;
        if (ring1Pos[n.id]) return { ...n, position: ring1Pos[n.id] };
        if (ring2Pos[n.id]) return { ...n, position: ring2Pos[n.id] };
        return n;
      });
    });

    // Fit view to the focus cluster
    setTimeout(() => {
      const neighborIds = layoutEdges
        .flatMap((e) =>
          e.source === selectedNode
            ? [{ id: e.target as string }]
            : e.target === selectedNode
              ? [{ id: e.source as string }]
              : [],
        );
      rfInstanceRef.current?.fitView({
        nodes: [{ id: selectedNode }, ...neighborIds],
        padding: 0.35,
        duration: 400,
      });
    }, 30);

    setMergeMenuOpen(false);
  }, [selectedNode, layoutEdges]);

  // --- Save / Cancel ---

  const handleSave = useCallback(() => {
    const currentRoleId = context?.type === 'role' ? context.roleId : null;
    const currentProjectId = context?.type === 'hobby' ? context.projectId : null;

    for (const skillId of draft.hiddenSkillIds) {
      if (currentRoleId) {
        const role = cv.roles.find((r) => r.id === currentRoleId);
        const rs = role?.skills.find((rs) => rs.id === skillId);
        if (rs?.visible !== false) toggleRoleSkillVisibility(currentRoleId, skillId);
      } else if (currentProjectId) {
        const proj = (cv.hobbyProjects ?? []).find((p) => p.id === currentProjectId);
        const rs = proj?.skills.find((rs) => rs.id === skillId);
        if (rs?.visible !== false)
          toggleHobbyProjectSkillVisibility(currentProjectId, skillId);
      }
    }

    for (const canonicalName of draft.addedOntologyNames) {
      const existing = cv.skills.find(
        (s) =>
          (s.ontologyRef ?? s.name).toLowerCase() === canonicalName.toLowerCase(),
      );
      const skill: Skill =
        existing ??
        addSkill({ name: canonicalName, ontologyRef: canonicalName, level: null, years: null });
      if (currentRoleId) {
        const role = cv.roles.find((r) => r.id === currentRoleId);
        if (!role?.skills.some((rs) => rs.id === skill.id))
          addExistingSkillToRole(currentRoleId, skill);
      } else if (currentProjectId) {
        const proj = (cv.hobbyProjects ?? []).find((p) => p.id === currentProjectId);
        if (!proj?.skills.some((rs) => rs.id === skill.id))
          addExistingSkillToHobbyProject(currentProjectId, skill);
      }
    }

    onClose();
  }, [
    draft,
    context,
    cv,
    addSkill,
    addExistingSkillToRole,
    addExistingSkillToHobbyProject,
    toggleRoleSkillVisibility,
    toggleHobbyProjectSkillVisibility,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    setDraft(emptyDraft());
    setSelectedNode(null);
    setMergeMenuOpen(false);
    onClose();
  }, [onClose]);

  // --- Context dropdown ---

  const contextOptions = useMemo(
    () => [
      {
        label: locale === 'sv' ? 'Alla kompetenser' : 'All competences',
        value: '__all__',
      },
      ...cv.roles
        .filter((r) => r.visible !== false)
        .map((r) => ({
          label: [r.company, r.title].filter(Boolean).join(' — ') || `Role ${r.id}`,
          value: `role:${r.id}`,
        })),
      ...(cv.hobbyProjects ?? [])
        .filter((p) => p.visible !== false)
        .map((p) => ({
          label: p.title ?? `Project ${p.id}`,
          value: `hobby:${p.id}`,
        })),
    ],
    [cv.roles, cv.hobbyProjects, locale],
  );

  const contextValue =
    context === null
      ? '__all__'
      : context.type === 'role'
        ? `role:${context.roleId}`
        : `hobby:${context.projectId}`;

  const handleContextChange = (value: string) => {
    setSelectedNode(null);
    setMergeMenuOpen(false);
    if (value === '__all__') setContext(null);
    else if (value.startsWith('role:'))
      setContext({ type: 'role', roleId: value.slice(5) });
    else setContext({ type: 'hobby', projectId: value.slice(6) });
  };

  if (!isOpen) return null;

  // Derived button states
  const canActOnSelected = !!(selectedNodeInfo?.isOwned || selectedNodeInfo?.isDraftAdded);
  const isHidden = !!selectedNodeInfo?.isDraftHidden;
  const hasDraftChanges =
    draft.hiddenSkillIds.size > 0 || draft.addedOntologyNames.length > 0;

  const btnBase =
    'rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const btnOutline =
    `${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-100 enabled:hover:border-gray-300`;
  const btnGreen =
    `${btnBase} border border-green-300 bg-green-50 text-green-700 hover:bg-green-100`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div className="flex flex-col w-full max-w-5xl h-[85vh] rounded-xl border bg-white shadow-2xl dark:bg-zinc-900 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          {/* Context picker */}
          <select
            value={contextValue}
            onChange={(e) => handleContextChange(e.target.value)}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-sm font-medium text-(--brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--brand-primary)/40 dark:bg-zinc-900"
          >
            {contextOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Hops input */}
          <label className="flex items-center gap-1 text-sm text-gray-500 shrink-0">
            <span>{locale === 'sv' ? 'Steg' : 'Hops'}:</span>
            <input
              type="number"
              min={1}
              max={5}
              value={maxHops}
              onChange={(e) =>
                setMaxHops(
                  Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)),
                )
              }
              className="w-12 rounded border border-gray-200 px-2 py-0.5 text-sm text-center text-(--brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--brand-primary)/40"
            />
          </label>

          {/* Separator */}
          <div className="h-5 w-px bg-gray-200 shrink-0" />

          {/* Node action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Hide / Show toggle */}
            <button
              className={isHidden ? btnGreen : btnOutline}
              disabled={!canActOnSelected}
              onClick={isHidden ? handleShow : handleHide}
              title={
                isHidden
                  ? locale === 'sv'
                    ? 'Visa i export'
                    : 'Show in export'
                  : locale === 'sv'
                    ? 'Dölj i export'
                    : 'Hide in export'
              }
            >
              {isHidden
                ? locale === 'sv'
                  ? 'Visa'
                  : 'Show'
                : locale === 'sv'
                  ? 'Dölj'
                  : 'Hide'}
            </button>

            {/* Merge dropdown */}
            <div className="relative">
              <button
                className={btnOutline}
                disabled={!canActOnSelected}
                onClick={() => setMergeMenuOpen((o) => !o)}
                title={locale === 'sv' ? 'Ersätt med ett bredare begrepp' : 'Replace with a broader term'}
              >
                {locale === 'sv' ? 'Slå ihop' : 'Merge'}{' '}
                <span className="opacity-60">{mergeMenuOpen ? '▲' : '▼'}</span>
              </button>
              {mergeMenuOpen && canActOnSelected && (
                <div className="absolute top-full left-0 z-30 mt-1 min-w-44 rounded-lg border bg-white shadow-lg dark:bg-zinc-900">
                  {(selectedNodeInfo?.mergeOptions ?? []).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">
                      {locale === 'sv' ? 'Inga förslag' : 'No suggestions'}
                    </p>
                  ) : (
                    selectedNodeInfo!.mergeOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleMerge(opt)}
                        className="w-full rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-800"
                      >
                        {opt}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Focus */}
            <button
              className={btnOutline}
              disabled={!selectedNode}
              onClick={handleFocus}
              title={
                locale === 'sv'
                  ? 'Dra relaterade noder nära den valda'
                  : 'Pull connected nodes close'
              }
            >
              {locale === 'sv' ? 'Fokus' : 'Focus'}
            </button>
          </div>

          {/* Selected node label */}
          {selectedNode && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 max-w-[140px] truncate shrink-0">
              {selectedNode}
            </span>
          )}

          {/* Node count */}
          <span className="ml-auto text-xs text-gray-400 shrink-0">
            {nodes.length} {locale === 'sv' ? 'noder' : 'nodes'}
          </span>

          {/* Close */}
          <button
            onClick={handleCancel}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
            title={locale === 'sv' ? 'Stäng' : 'Close'}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Canvas ─────────────────────────────────────────────────────── */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={layoutEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => {
              setSelectedNode((prev) => (prev === node.id ? null : node.id));
              setMergeMenuOpen(false);
            }}
            onPaneClick={() => {
              setSelectedNode(null);
              setMergeMenuOpen(false);
            }}
            onInit={(instance) => {
              rfInstanceRef.current = instance;
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable
            nodesConnectable={false}
            deleteKeyCode={null}
            minZoom={0.05}
            maxZoom={2}
          >
            <Background gap={20} color="#f0f0f0" />
            <Controls showInteractive={false} />
          </ReactFlow>

          {contextSkills.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
              {locale === 'sv'
                ? 'Inga kompetenser i det här sammanhanget.'
                : 'No skills in this context.'}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-gray-400">
            {locale === 'sv'
              ? 'Klicka för att markera · Dra för att flytta · Scrolla för att zooma'
              : 'Click to select · Drag to reposition · Scroll to zoom'}
            {hasDraftChanges && (
              <span className="ml-2 font-medium text-(--brand-primary)">
                · {locale === 'sv' ? 'Osparat' : 'Unsaved changes'}
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="rounded px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              {locale === 'sv' ? 'Avbryt' : 'Cancel'}
            </button>
            {hasDraftChanges && (
              <button
                onClick={handleSave}
                className="rounded bg-(--brand-primary) px-4 py-1.5 text-sm font-medium text-white hover:bg-(--brand-primary)/90"
              >
                {locale === 'sv' ? 'Spara' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
