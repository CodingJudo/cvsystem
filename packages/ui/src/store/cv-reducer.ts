import type {
  DomainCV,
  RoleSkill,
  PrintBreakBefore,
  RenderSpec,
} from '@cvsystem/core';
import {
  normalizeAfterImport,
  ensureUniqueSkillsCaseInsensitive,
  addSkill as addSkillService,
  updateSkill as updateSkillService,
  removeSkill as removeSkillService,
  addSkillToRole as addSkillToRoleService,
  removeSkillFromRole as removeSkillFromRoleService,
  updateSkillLevelOnRole as updateSkillLevelOnRoleService,
  findSkillByName,
  recalculateYears,
} from '@cvsystem/core';
import { syncSkillOrder } from '@cvsystem/core';
import type { CVAction, CVState } from './cv-types';

// Storage key for localStorage
export const STORAGE_KEY = 'cv-data';

/**
 * Normalize a CV object to ensure all required arrays exist
 * (handles old data that was saved before new fields were added)
 */
export function normalizeCv(cv: DomainCV): DomainCV {
  // Normalize role skills to ensure visible property exists (defaults to true for backward compatibility)
  // Preserve and validate skillOrder (remove orphaned IDs)
  const normalizedRoles = cv.roles.map((role) => {
    const withVisible = {
      ...role,
      skills: role.skills.map((skill) => ({
        ...skill,
        visible: skill.visible ?? true,
      })),
      skillOrder: role.skillOrder,
    };
    return syncSkillOrder(withVisible);
  });
  const normalizedHobbyProjects = (cv.hobbyProjects ?? []).map((project) => {
    const withVisible = {
      ...project,
      skills: project.skills.map((skill) => ({
        ...skill,
        visible: skill.visible ?? true,
      })),
      skillOrder: project.skillOrder,
    };
    return syncSkillOrder(withVisible);
  });

  const normalizedTrainings = (cv.trainings ?? []).map((t) => ({
    ...t,
    hideDescription: t.hideDescription ?? false,
  }));
  const normalizedEducations = (cv.educations ?? []).map((e) => ({
    ...e,
    hideDescription: e.hideDescription ?? false,
  }));

  return {
    ...cv,
    roles: normalizedRoles,
    hobbyProjects: normalizedHobbyProjects,
    trainings: normalizedTrainings,
    educations: normalizedEducations,
    commitments: cv.commitments ?? [],
    photoDataUrl: cv.photoDataUrl ?? null,
    contacts: cv.contacts ?? { email: null, phone: null, address: null, website: null },
    featuredProjects: cv.featuredProjects ?? [],
    coverPageGroups: cv.coverPageGroups ?? { roles: [], expertKnowledge: [], languages: [] },
    printBreakBefore: cv.printBreakBefore ?? null,
    renderSpecs: cv.renderSpecs ?? [],
    activeRenderSpecId: cv.activeRenderSpecId ?? null,
  };
}

/**
 * Create a minimal/blank CV from a seed (keeps id and locales so the app works).
 * Used when the user clears loaded data so they see empty content, not the full fixture.
 */
export function createMinimalCv(seed: DomainCV): DomainCV {
  return normalizeCv({
    id: seed.id,
    locales: seed.locales,
    name: { first: null, last: null },
    title: { sv: null, en: null },
    summary: { sv: null, en: null },
    contacts: { email: null, phone: null, address: null, website: null },
    photoDataUrl: null,
    featuredProjects: [],
    coverPageGroups: { roles: [], expertKnowledge: [], languages: [] },
    printBreakBefore: null,
    skills: [],
    roles: [],
    hobbyProjects: [],
    trainings: [],
    educations: [],
    commitments: [],
  });
}

function preserveSkillVisibilityAndOrder<T extends { id: string; skills: RoleSkill[]; skillOrder?: string[] }>(
  normalizedItems: T[],
  originalItems: T[],
): T[] {
  return normalizedItems.map((item) => {
    const originalItem = originalItems.find((r) => r.id === item.id);
    if (!originalItem) return item;
    const originalSkillMapById = new Map(originalItem.skills.map((s) => [s.id, s]));
    const originalSkillMapByName = new Map(
      originalItem.skills.map((s) => [s.name.toLowerCase().trim(), s]),
    );
    return {
      ...item,
      skillOrder: originalItem.skillOrder,
      skills: item.skills.map((skill) => {
        let originalSkill = originalSkillMapById.get(skill.id);
        if (!originalSkill) {
          originalSkill = originalSkillMapByName.get(skill.name.toLowerCase().trim());
        }
        const preservedVisible = originalSkill?.visible !== undefined
          ? originalSkill.visible
          : (skill.visible !== undefined ? skill.visible : true);
        return {
          ...skill,
          visible: preservedVisible,
        };
      }),
    };
  });
}

export function cvReducer(state: CVState, action: CVAction): CVState {
  switch (action.type) {
    case 'INIT': {
      const cv = normalizeCv(action.cv);
      return {
        cv,
        originalCv: cv,
        hasChanges: false,
        isInitialized: true,
        metadata: state.metadata,
        rawCinode: state.rawCinode,
      };
    }

    case 'RESET_TO_SERVER': {
      const cv = normalizeCv(action.cv);
      return {
        cv,
        originalCv: cv,
        hasChanges: false,
        isInitialized: true,
        metadata: null,
        rawCinode: null,
      };
    }

    case 'LOAD_FROM_STORAGE': {
      const normalized = normalizeAfterImport(normalizeCv(action.cv));
      const rolesWithPreservedVisibility = preserveSkillVisibilityAndOrder(
        normalized.roles,
        action.cv.roles,
      );
      const hobbiesWithPreservedVisibility = preserveSkillVisibilityAndOrder(
        normalized.hobbyProjects ?? [],
        action.cv.hobbyProjects ?? [],
      );
      const cv: DomainCV = {
        ...normalized,
        roles: rolesWithPreservedVisibility,
        hobbyProjects: hobbiesWithPreservedVisibility,
        educations: action.cv.educations ?? normalized.educations ?? [],
        trainings: action.cv.trainings ?? normalized.trainings ?? [],
      };
      return {
        ...state,
        cv,
        hasChanges: true,
        metadata: action.metadata ?? state.metadata,
        rawCinode: action.rawCinode ?? state.rawCinode,
      };
    }

    case 'IMPORT_CV': {
      const normalized = normalizeAfterImport(normalizeCv(action.cv));
      const cv: DomainCV = {
        ...normalized,
        hobbyProjects: action.cv.hobbyProjects ?? normalized.hobbyProjects ?? [],
        educations: action.cv.educations ?? normalized.educations ?? [],
        trainings: action.cv.trainings ?? normalized.trainings ?? [],
      };
      return {
        cv,
        originalCv: cv,
        hasChanges: false,
        isInitialized: true,
        metadata: action.metadata ?? null,
        rawCinode: action.rawCinode ?? null,
      };
    }

    case 'UPDATE_TITLE': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, title: action.title },
        hasChanges: true,
      };
    }

    case 'UPDATE_SUMMARY': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, summary: action.summary },
        hasChanges: true,
      };
    }

    case 'UPDATE_CONTACTS': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, contacts: action.contacts },
        hasChanges: true,
      };
    }

    case 'UPDATE_PHOTO': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, photoDataUrl: action.photoDataUrl },
        hasChanges: true,
      };
    }

    case 'UPDATE_COVERPAGE_GROUPS': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, coverPageGroups: action.groups },
        hasChanges: true,
      };
    }

    case 'ADD_FEATURED_PROJECT': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: {
          ...state.cv,
          featuredProjects: [action.project, ...(state.cv.featuredProjects ?? [])],
        },
        hasChanges: true,
      };
    }

    case 'UPDATE_FEATURED_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.featuredProjects ?? [];
      const updated = current.map((p) => (p.id === action.projectId ? { ...p, ...action.updates } : p));
      return {
        ...state,
        cv: { ...state.cv, featuredProjects: updated },
        hasChanges: true,
      };
    }

    case 'DELETE_FEATURED_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.featuredProjects ?? [];
      return {
        ...state,
        cv: { ...state.cv, featuredProjects: current.filter((p) => p.id !== action.projectId) },
        hasChanges: true,
      };
    }

    case 'ADD_HOBBY_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.hobbyProjects ?? [];
      return {
        ...state,
        cv: {
          ...state.cv,
          hobbyProjects: [action.project, ...current],
        },
        hasChanges: true,
      };
    }

    case 'UPDATE_HOBBY_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.hobbyProjects ?? [];
      const hobbyProjects = current.map((p) =>
        p.id === action.projectId ? { ...p, ...action.updates } : p,
      );
      return {
        ...state,
        cv: { ...state.cv, hobbyProjects },
        hasChanges: true,
      };
    }

    case 'DELETE_HOBBY_PROJECT': {
      if (!state.cv) return state;
      const current = state.cv.hobbyProjects ?? [];
      return {
        ...state,
        cv: { ...state.cv, hobbyProjects: current.filter((p) => p.id !== action.projectId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_HOBBY_PROJECT_VISIBILITY': {
      if (!state.cv) return state;
      const hobbyProjects = (state.cv.hobbyProjects ?? []).map((p) =>
        p.id === action.projectId ? { ...p, visible: !p.visible } : p,
      );
      return {
        ...state,
        cv: { ...state.cv, hobbyProjects },
        hasChanges: true,
      };
    }

    case 'ADD_HOBBY_PROJECT_SKILL': {
      if (!state.cv) return state;
      let cv = state.cv;
      const skillIdInMain = cv.skills.some((s) => s.id === action.skill.id);
      const skillId = skillIdInMain
        ? action.skill.id
        : (() => {
          const existing = findSkillByName(cv, action.skill.name);
          if (existing) return existing.id;
          cv = addSkillService(cv, {
            name: action.skill.name,
            level: action.skill.level ?? null,
          });
          const added = findSkillByName(cv, action.skill.name);
          return added?.id ?? action.skill.id;
        })();

      const mainSkill = cv.skills.find((s) => s.id === skillId);
      if (!mainSkill) return state;

      const hobbyProjects = (cv.hobbyProjects ?? []).map((project) => {
        if (project.id !== action.projectId) return project;
        if (project.skills.some((s) => s.id === skillId)) return project;

        const newSkill: RoleSkill = {
          id: mainSkill.id,
          name: mainSkill.name,
          level: action.skill.level ?? mainSkill.level ?? null,
          category: action.skill.category ?? null,
          visible: action.skill.visible ?? true,
        };
        const nextSkills = [...project.skills, newSkill];
        let nextSkillOrder = project.skillOrder;

        if (project.skillOrder && project.skillOrder.length > 0) {
          const currentOrdered = project.skillOrder
            .map((id) => project.skills.find((s) => s.id === id))
            .filter((s): s is RoleSkill => s !== undefined);
          const insertIndex = currentOrdered.findIndex(
            (s) => s.name.localeCompare(newSkill.name, undefined, { sensitivity: 'base' }) > 0,
          );
          nextSkillOrder = [...project.skillOrder];
          if (insertIndex === -1) {
            nextSkillOrder.push(skillId);
          } else {
            nextSkillOrder.splice(insertIndex, 0, skillId);
          }
        }

        return {
          ...project,
          skills: nextSkills,
          skillOrder: nextSkillOrder,
        };
      });

      cv = recalculateYears({ ...cv, hobbyProjects });
      return { ...state, cv, hasChanges: true };
    }

    case 'REMOVE_HOBBY_PROJECT_SKILL': {
      if (!state.cv) return state;
      const hobbyProjects = (state.cv.hobbyProjects ?? []).map((project) => {
        if (project.id !== action.projectId) return project;
        const nextOrder = project.skillOrder?.filter((id) => id !== action.skillId);
        return {
          ...project,
          skills: project.skills.filter((s) => s.id !== action.skillId),
          skillOrder: nextOrder && nextOrder.length > 0 ? nextOrder : undefined,
        };
      });
      const cv = recalculateYears({ ...state.cv, hobbyProjects });
      return { ...state, cv, hasChanges: true };
    }

    case 'TOGGLE_HOBBY_PROJECT_SKILL_VISIBILITY': {
      if (!state.cv) return state;
      const hobbyProjects = (state.cv.hobbyProjects ?? []).map((project) => {
        if (project.id !== action.projectId) return project;
        return {
          ...project,
          skills: project.skills.map((skill) =>
            skill.id === action.skillId
              ? { ...skill, visible: !(skill.visible ?? true) }
              : skill,
          ),
        };
      });
      return {
        ...state,
        cv: { ...state.cv, hobbyProjects },
        hasChanges: true,
      };
    }

    case 'UPDATE_HOBBY_PROJECT_SKILL_LEVEL': {
      if (!state.cv) return state;
      const hobbyProjects = (state.cv.hobbyProjects ?? []).map((project) => {
        if (project.id !== action.projectId) return project;
        return {
          ...project,
          skills: project.skills.map((skill) =>
            skill.id === action.skillId ? { ...skill, level: action.level } : skill,
          ),
        };
      });
      const cv = recalculateYears({ ...state.cv, hobbyProjects });
      return { ...state, cv, hasChanges: true };
    }

    case 'REORDER_HOBBY_PROJECT_SKILLS': {
      if (!state.cv) return state;
      const hobbyProjects = (state.cv.hobbyProjects ?? []).map((project) => {
        if (project.id !== action.projectId) return project;
        const skillMap = new Map(project.skills.map((s) => [s.id, s]));
        const reordered = action.skillIds
          .map((id) => skillMap.get(id))
          .filter((s): s is RoleSkill => s !== undefined);
        const existingIds = new Set(action.skillIds);
        project.skills.forEach((s) => {
          if (!existingIds.has(s.id)) reordered.push(s);
        });
        return {
          ...project,
          skills: reordered,
          skillOrder: action.skillIds,
        };
      });
      return {
        ...state,
        cv: { ...state.cv, hobbyProjects },
        hasChanges: true,
      };
    }

    case 'RESET_HOBBY_PROJECT_SKILLS_ORDER': {
      if (!state.cv) return state;
      const hobbyProjects = (state.cv.hobbyProjects ?? []).map((project) => {
        if (project.id !== action.projectId) return project;
        const sorted = [...project.skills].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        return {
          ...project,
          skills: sorted,
          skillOrder: undefined,
        };
      });
      return {
        ...state,
        cv: { ...state.cv, hobbyProjects },
        hasChanges: true,
      };
    }

    case 'UPDATE_SKILL': {
      if (!state.cv) return state;
      const cv = recalculateYears(
        updateSkillService(state.cv, action.skill.id, {
          name: action.skill.name,
          level: action.skill.level,
          years: action.skill.years,
          overriddenYears: action.skill.overriddenYears,
          calculatedYears: action.skill.calculatedYears,
        }),
      );
      return { ...state, cv, hasChanges: true };
    }

    case 'ADD_SKILL': {
      if (!state.cv) return state;
      const cv = recalculateYears(
        addSkillService(state.cv, {
          name: action.skill.name,
          level: action.skill.level,
          years: action.skill.years,
          overriddenYears: action.skill.overriddenYears,
        }),
      );
      return { ...state, cv, hasChanges: true };
    }

    case 'DELETE_SKILL': {
      if (!state.cv) return state;
      const cv = removeSkillService(state.cv, action.skillId);
      return { ...state, cv, hasChanges: true };
    }

    case 'REORDER_SKILLS': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, skills: action.skills },
        hasChanges: true,
      };
    }

    case 'MERGE_DUPLICATE_SKILLS': {
      if (!state.cv) return state;
      const cv = ensureUniqueSkillsCaseInsensitive(state.cv);
      return { ...state, cv, hasChanges: true };
    }

    case 'RESET_TO_ORIGINAL': {
      if (!state.originalCv) return state;
      return {
        ...state,
        cv: state.originalCv,
        hasChanges: false,
        // Keep metadata and rawCinode
      };
    }

    case 'UPDATE_ROLE': {
      if (!state.cv) return state;
      const updatedRoles = state.cv.roles.map((r) =>
        r.id === action.roleId ? { ...r, ...action.updates } : r
      );
      const cv = recalculateYears({ ...state.cv, roles: updatedRoles });
      return { ...state, cv, hasChanges: true };
    }

    case 'TOGGLE_ROLE_VISIBILITY': {
      if (!state.cv) return state;
      const toggledRoles = state.cv.roles.map((r) =>
        r.id === action.roleId ? { ...r, visible: !r.visible } : r
      );
      return {
        ...state,
        cv: { ...state.cv, roles: toggledRoles },
        hasChanges: true,
      };
    }

    case 'ADD_ROLE_SKILL': {
      if (!state.cv) return state;
      let cv = state.cv;
      const skillIdInMain = state.cv.skills.some((s) => s.id === action.skill.id);
      const skillId = skillIdInMain
        ? action.skill.id
        : (() => {
          const existing = findSkillByName(state.cv, action.skill.name);
          if (existing) return existing.id;
          cv = addSkillService(cv, {
            name: action.skill.name,
            level: action.skill.level ?? null,
          });
          const added = findSkillByName(cv, action.skill.name);
          return added?.id ?? action.skill.id;
        })();
      cv = addSkillToRoleService(cv, action.roleId, skillId, action.skill.level ?? undefined);
      cv = recalculateYears(cv);

      // If role has skillOrder, insert new skill alphabetically
      const role = cv.roles.find((r) => r.id === action.roleId);
      if (role?.skillOrder && role.skillOrder.length > 0) {
        const newSkill = role.skills.find((s) => s.id === skillId);
        if (newSkill) {
          // Find alphabetical position
          const currentOrdered = role.skillOrder
            .map((id) => role.skills.find((s) => s.id === id))
            .filter((s): s is RoleSkill => s !== undefined);
          const insertIndex = currentOrdered.findIndex(
            (s) => s.name.localeCompare(newSkill.name, undefined, { sensitivity: 'base' }) > 0
          );
          const newOrder = [...role.skillOrder];
          if (insertIndex === -1) {
            newOrder.push(skillId);
          } else {
            newOrder.splice(insertIndex, 0, skillId);
          }
          cv = {
            ...cv,
            roles: cv.roles.map((r) =>
              r.id === action.roleId ? { ...r, skillOrder: newOrder } : r
            ),
          };
        }
      }

      return { ...state, cv, hasChanges: true };
    }

    case 'REMOVE_ROLE_SKILL': {
      if (!state.cv) return state;
      let cv = recalculateYears(removeSkillFromRoleService(state.cv, action.roleId, action.skillId));
      // Remove skill ID from skillOrder if it exists
      cv = {
        ...cv,
        roles: cv.roles.map((role) => {
          if (role.id !== action.roleId || !role.skillOrder) return role;
          const updatedOrder = role.skillOrder.filter((id) => id !== action.skillId);
          return {
            ...role,
            skillOrder: updatedOrder.length > 0 ? updatedOrder : undefined,
          };
        }),
      };
      return { ...state, cv, hasChanges: true };
    }

    case 'UPDATE_ROLE_SKILL_LEVEL': {
      if (!state.cv) return state;
      const cv = recalculateYears(
        updateSkillLevelOnRoleService(state.cv, action.roleId, action.skillId, action.level),
      );
      return { ...state, cv, hasChanges: true };
    }

    case 'TOGGLE_ROLE_SKILL_VISIBILITY': {
      if (!state.cv) return state;
      const roles = state.cv.roles.map((role) => {
        if (role.id !== action.roleId) return role;
        return {
          ...role,
          skills: role.skills.map((skill) =>
            skill.id === action.skillId
              ? { ...skill, visible: !(skill.visible ?? true) }
              : skill
          ),
        };
      });
      return {
        ...state,
        cv: { ...state.cv, roles },
        hasChanges: true,
      };
    }

    case 'REORDER_ROLE_SKILLS': {
      if (!state.cv) return state;
      const roles = state.cv.roles.map((role) => {
        if (role.id !== action.roleId) return role;
        // Create a map for quick lookup
        const skillMap = new Map(role.skills.map((s) => [s.id, s]));
        // Reorder according to skillIds array
        const reordered = action.skillIds
          .map((id) => skillMap.get(id))
          .filter((s): s is RoleSkill => s !== undefined);
        // Add any skills not in the list (shouldn't happen, but safety)
        const existingIds = new Set(action.skillIds);
        role.skills.forEach((s) => {
          if (!existingIds.has(s.id)) reordered.push(s);
        });
        return {
          ...role,
          skills: reordered,
          skillOrder: action.skillIds, // Store custom order
        };
      });
      return {
        ...state,
        cv: { ...state.cv, roles },
        hasChanges: true,
      };
    }

    case 'RESET_ROLE_SKILLS_ORDER': {
      if (!state.cv) return state;
      const roles = state.cv.roles.map((role) => {
        if (role.id !== action.roleId) return role;
        // Sort skills alphabetically and clear skillOrder
        const sorted = [...role.skills].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        return {
          ...role,
          skills: sorted,
          skillOrder: undefined, // Clear custom order
        };
      });
      return {
        ...state,
        cv: { ...state.cv, roles },
        hasChanges: true,
      };
    }

    case 'ADD_ROLE': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, roles: [action.role, ...state.cv.roles] },
        hasChanges: true,
      };
    }

    case 'DELETE_ROLE': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, roles: state.cv.roles.filter((r) => r.id !== action.roleId) },
        hasChanges: true,
      };
    }

    // Training actions
    case 'ADD_TRAINING': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, trainings: [action.training, ...state.cv.trainings] },
        hasChanges: true,
      };
    }

    case 'UPDATE_TRAINING': {
      if (!state.cv) return state;
      const updatedTrainings = state.cv.trainings.map((t) =>
        t.id === action.trainingId ? { ...t, ...action.updates } : t
      );
      return {
        ...state,
        cv: { ...state.cv, trainings: updatedTrainings },
        hasChanges: true,
      };
    }

    case 'DELETE_TRAINING': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, trainings: state.cv.trainings.filter((t) => t.id !== action.trainingId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_TRAINING_VISIBILITY': {
      if (!state.cv) return state;
      const toggledTrainings = state.cv.trainings.map((t) =>
        t.id === action.trainingId ? { ...t, visible: !t.visible } : t
      );
      return {
        ...state,
        cv: { ...state.cv, trainings: toggledTrainings },
        hasChanges: true,
      };
    }

    // Education actions
    case 'ADD_EDUCATION': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, educations: [action.education, ...state.cv.educations] },
        hasChanges: true,
      };
    }

    case 'UPDATE_EDUCATION': {
      if (!state.cv) return state;
      const updatedEducations = state.cv.educations.map((e) =>
        e.id === action.educationId ? { ...e, ...action.updates } : e
      );
      return {
        ...state,
        cv: { ...state.cv, educations: updatedEducations },
        hasChanges: true,
      };
    }

    case 'DELETE_EDUCATION': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, educations: state.cv.educations.filter((e) => e.id !== action.educationId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_EDUCATION_VISIBILITY': {
      if (!state.cv) return state;
      const toggledEducations = state.cv.educations.map((e) =>
        e.id === action.educationId ? { ...e, visible: !e.visible } : e
      );
      return {
        ...state,
        cv: { ...state.cv, educations: toggledEducations },
        hasChanges: true,
      };
    }

    // Commitment actions
    case 'ADD_COMMITMENT': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, commitments: [action.commitment, ...state.cv.commitments] },
        hasChanges: true,
      };
    }

    case 'UPDATE_COMMITMENT': {
      if (!state.cv) return state;
      const updatedCommitments = state.cv.commitments.map((c) =>
        c.id === action.commitmentId ? { ...c, ...action.updates } : c
      );
      return {
        ...state,
        cv: { ...state.cv, commitments: updatedCommitments },
        hasChanges: true,
      };
    }

    case 'DELETE_COMMITMENT': {
      if (!state.cv) return state;
      return {
        ...state,
        cv: { ...state.cv, commitments: state.cv.commitments.filter((c) => c.id !== action.commitmentId) },
        hasChanges: true,
      };
    }

    case 'TOGGLE_COMMITMENT_VISIBILITY': {
      if (!state.cv) return state;
      const toggledCommitments = state.cv.commitments.map((c) =>
        c.id === action.commitmentId ? { ...c, visible: !c.visible } : c
      );
      return {
        ...state,
        cv: { ...state.cv, commitments: toggledCommitments },
        hasChanges: true,
      };
    }

    case 'TOGGLE_BREAK_BEFORE': {
      if (!state.cv) return state;
      const prev = state.cv.printBreakBefore ?? {};
      const list = prev[action.blockType] ?? [];
      const has = list.includes(action.itemId);
      const nextList = has ? list.filter((id) => id !== action.itemId) : [...list, action.itemId];
      const next: PrintBreakBefore = { ...prev, [action.blockType]: nextList.length ? nextList : undefined };
      return {
        ...state,
        cv: { ...state.cv, printBreakBefore: Object.keys(next).length ? next : null },
        hasChanges: true,
      };
    }

    // RenderSpec actions (Phase B)
    case 'ADD_RENDER_SPEC': {
      if (!state.cv) return state;
      const renderSpecs = [...(state.cv.renderSpecs ?? []), action.spec];
      return { ...state, cv: { ...state.cv, renderSpecs }, hasChanges: true };
    }

    case 'UPDATE_RENDER_SPEC': {
      if (!state.cv) return state;
      const renderSpecs = (state.cv.renderSpecs ?? []).map((s) =>
        s.id === action.specId ? { ...s, ...action.updates } : s
      );
      return { ...state, cv: { ...state.cv, renderSpecs }, hasChanges: true };
    }

    case 'DELETE_RENDER_SPEC': {
      if (!state.cv) return state;
      const renderSpecs = (state.cv.renderSpecs ?? []).filter((s) => s.id !== action.specId);
      const activeRenderSpecId =
        state.cv.activeRenderSpecId === action.specId ? null : state.cv.activeRenderSpecId;
      return { ...state, cv: { ...state.cv, renderSpecs, activeRenderSpecId }, hasChanges: true };
    }

    case 'SET_ACTIVE_RENDER_SPEC': {
      if (!state.cv) return state;
      return { ...state, cv: { ...state.cv, activeRenderSpecId: action.specId }, hasChanges: true };
    }

    // Skill ontology actions (Phase B)
    case 'UPDATE_SKILL_ONTOLOGY_REF': {
      if (!state.cv) return state;
      const skills = state.cv.skills.map((s) =>
        s.id === action.skillId ? { ...s, ontologyRef: action.ontologyRef } : s
      );
      return { ...state, cv: { ...state.cv, skills }, hasChanges: true };
    }

    case 'UPDATE_SKILL_GROUP_AS': {
      if (!state.cv) return state;
      const skills = state.cv.skills.map((s) =>
        s.id === action.skillId ? { ...s, groupAs: action.groupAs } : s
      );
      return { ...state, cv: { ...state.cv, skills }, hasChanges: true };
    }

    default:
      return state;
  }
}
