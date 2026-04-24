'use client';

import type { RoleSkill, Locale } from '@cvsystem/core';

const LEVEL_LABELS_SV = ['', 'Nybörjare', 'Grundläggande', 'Medel', 'Avancerad', 'Expert'] as const;
const LEVEL_LABELS_EN = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'] as const;

export interface SkillBadgeProps {
  skill: RoleSkill;
  locale: Locale;
  editable: boolean;
  onRemove: (skillId: string) => void;
  onToggleVisibility: (skillId: string) => void;
  /** When provided and editable, renders a level dropdown instead of static text. */
  onLevelChange?: (skillId: string, level: number) => void;
}

export function SkillBadge({
  skill,
  locale,
  editable,
  onRemove,
  onToggleVisibility,
  onLevelChange,
}: SkillBadgeProps) {
  const levelLabels = locale === 'sv' ? LEVEL_LABELS_SV : LEVEL_LABELS_EN;
  const hasLevel = skill.level != null && skill.level >= 1 && skill.level <= 5;
  const isVisible = skill.visible !== false;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--brand-secondary)] ${
        !isVisible ? 'opacity-50 line-through' : ''
      }`}
    >
      {skill.name}
      {editable && onLevelChange && hasLevel ? (
        <select
          value={skill.level!}
          onChange={(e) => onLevelChange(skill.id, Number(e.target.value))}
          className="ml-0.5 min-w-0 rounded border-0 bg-transparent py-0 pr-5 text-[var(--brand-primary)] focus:ring-0"
          title={`Level ${skill.level}/5`}
        >
          {[1, 2, 3, 4, 5].map((l) => (
            <option key={l} value={l}>
              {l} - {levelLabels[l]}
            </option>
          ))}
        </select>
      ) : hasLevel ? (
        <span className="text-[var(--brand-primary)]">({skill.level}/5)</span>
      ) : null}
      {editable && (
        <button
          onClick={() => onToggleVisibility(skill.id)}
          className={`ml-1 text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] transition-colors ${
            !isVisible ? 'opacity-100' : ''
          }`}
          title={
            isVisible
              ? locale === 'sv'
                ? 'Dölj i export (påverkar bara visning, inte år eller kompetenslista)'
                : 'Hide in export (presentation only, does not affect years or main skills list)'
              : locale === 'sv'
                ? 'Visa i export'
                : 'Show in export'
          }
        >
          {isVisible ? '👁' : '👁‍🗨'}
        </button>
      )}
      {editable && (
        <button
          onClick={() => onRemove(skill.id)}
          className="ml-1 text-[var(--brand-primary)] hover:text-red-600"
          title={locale === 'sv' ? 'Ta bort' : 'Remove skill'}
        >
          ×
        </button>
      )}
    </span>
  );
}
