'use client';

/**
 * Full skills management section for roles and hobby projects.
 * Combines: ordered badge list, drag-to-reorder, visibility toggles,
 * level editing, and the AddSkillForm search/typeahead.
 */

import { useState } from 'react';
import type { RoleSkill, Locale, Skill } from '@/domain/model/cv';
import { getOrderedSkills } from '@/lib/role-helpers';
import { Button } from '@/components/ui/button';
import { SkillBadge } from './SkillBadge';
import { AddSkillForm } from './AddSkillForm';
import type { GraphContext } from '@/app/cv/SkillGraphModal';

export interface SkillsSectionProps {
  /** RoleSkill list (with optional custom ordering via skillOrder). */
  skills: RoleSkill[];
  /** Optional custom ordering; passed through for getOrderedSkills. */
  skillOrder?: string[];
  locale: Locale;
  editable: boolean;
  /** Whether to show the "Sort alphabetically" reset button. */
  canResetOrder: boolean;
  graphContext: GraphContext;
  onRemove: (skillId: string) => void;
  onToggleVisibility: (skillId: string) => void;
  /** When provided and editable, renders a level dropdown in each badge. */
  onLevelChange?: (skillId: string, level: number) => void;
  onReorder: (orderedIds: string[]) => void;
  onResetOrder: () => void;
  onAddSkill: (skill: Skill) => void;
}

export function SkillsSection({
  skills,
  skillOrder,
  locale,
  editable,
  canResetOrder,
  graphContext,
  onRemove,
  onToggleVisibility,
  onLevelChange,
  onReorder,
  onResetOrder,
  onAddSkill,
}: SkillsSectionProps) {
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Use a minimal SkillContainer shape for getOrderedSkills
  const container = { skills, skillOrder };
  const orderedSkills = editable
    ? getOrderedSkills(container)
    : getOrderedSkills(container).filter((s) => s.visible !== false);

  const allHidden =
    editable && skills.length > 0 && skills.every((s) => s.visible === false);

  return (
    <div className="pt-2 border-t border-gray-100">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {locale === 'sv' ? 'Tekniker' : 'Technologies'}
        </div>
        {editable && canResetOrder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetOrder}
            className="text-xs text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
          >
            {locale === 'sv' ? 'Sortera alfabetiskt' : 'Sort alphabetically'}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <span className="text-xs text-gray-400 italic">
            {locale === 'sv' ? 'Inga tekniker tillagda' : 'No technologies added'}
          </span>
        ) : (
          <>
            {allHidden && (
              <p className="w-full text-xs text-amber-600 italic mb-1">
                {locale === 'sv'
                  ? 'Alla tekniker är dolda. Klicka på ögonikonen för att visa i export.'
                  : 'All skills are hidden. Click the eye icon to show in export.'}
              </p>
            )}
            {orderedSkills.map((skill, index) => {
              const isDragging = draggedSkillId === skill.id;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={skill.id}
                  draggable={editable}
                  onDragStart={(e) => {
                    setDraggedSkillId(skill.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', skill.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverIndex(null);
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId && draggedId !== skill.id) {
                      const currentOrder = getOrderedSkills(container).map((s) => s.id);
                      const fromIndex = currentOrder.indexOf(draggedId);
                      const toIndex = currentOrder.indexOf(skill.id);
                      if (fromIndex !== -1 && toIndex !== -1) {
                        const newOrder = [...currentOrder];
                        newOrder.splice(fromIndex, 1);
                        newOrder.splice(toIndex, 0, draggedId);
                        onReorder(newOrder);
                      }
                    }
                    setDraggedSkillId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedSkillId(null);
                    setDragOverIndex(null);
                  }}
                  className={`inline-flex items-center gap-1 transition-opacity duration-150 ${
                    isDragging ? 'opacity-50' : ''
                  } ${isDragOver ? 'ring-2 ring-[var(--brand-primary)] rounded' : ''}`}
                >
                  <SkillBadge
                    skill={skill}
                    locale={locale}
                    editable={editable}
                    onRemove={onRemove}
                    onToggleVisibility={onToggleVisibility}
                    onLevelChange={onLevelChange}
                  />
                  {editable && (
                    <span
                      className="text-gray-400 cursor-move select-none"
                      title={locale === 'sv' ? 'Dra för att ändra ordning' : 'Drag to reorder'}
                    >
                      ⋮⋮
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {editable && (
        <div className="mt-2">
          <AddSkillForm
            locale={locale}
            existingSkillIds={skills.map((s) => s.id)}
            graphContext={graphContext}
            onAddSkill={onAddSkill}
          />
        </div>
      )}
    </div>
  );
}
