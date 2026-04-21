// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillBadge } from './SkillBadge';
import type { RoleSkill } from '@/domain/model/cv';

function makeSkill(overrides: Partial<RoleSkill> = {}): RoleSkill {
  return {
    id: 'skill-1',
    name: 'TypeScript',
    level: 4,
    visible: true,
    ...overrides,
  };
}

describe('SkillBadge', () => {
  describe('rendering', () => {
    it('renders the skill name', () => {
      render(
        <SkillBadge
          skill={makeSkill()}
          locale="en"
          editable={false}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
        />,
      );
      expect(screen.getByText('TypeScript')).toBeTruthy();
    });

    it('renders level as static text when onLevelChange is not provided', () => {
      render(
        <SkillBadge
          skill={makeSkill({ level: 3 })}
          locale="en"
          editable={true}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
        />,
      );
      expect(screen.getByText('(3/5)')).toBeTruthy();
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('renders level as select when onLevelChange is provided and editable', () => {
      render(
        <SkillBadge
          skill={makeSkill({ level: 4 })}
          locale="en"
          editable={true}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
          onLevelChange={vi.fn()}
        />,
      );
      expect(screen.getByRole('combobox')).toBeTruthy();
    });

    it('renders level as static text when editable is false, even if onLevelChange provided', () => {
      render(
        <SkillBadge
          skill={makeSkill({ level: 2 })}
          locale="en"
          editable={false}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
          onLevelChange={vi.fn()}
        />,
      );
      expect(screen.getByText('(2/5)')).toBeTruthy();
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('applies strikethrough style when skill is not visible', () => {
      const { container } = render(
        <SkillBadge
          skill={makeSkill({ visible: false })}
          locale="en"
          editable={true}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
        />,
      );
      expect(container.firstChild).toHaveProperty(
        'className',
        expect.stringContaining('line-through'),
      );
    });

    it('does not render remove or visibility buttons when not editable', () => {
      render(
        <SkillBadge
          skill={makeSkill()}
          locale="en"
          editable={false}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
        />,
      );
      expect(screen.queryByTitle(/remove skill/i)).toBeNull();
      expect(screen.queryByTitle(/hide in export/i)).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onRemove with the skill id when × is clicked', () => {
      const onRemove = vi.fn();
      render(
        <SkillBadge
          skill={makeSkill({ id: 'abc' })}
          locale="en"
          editable={true}
          onRemove={onRemove}
          onToggleVisibility={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTitle('Remove skill'));
      expect(onRemove).toHaveBeenCalledWith('abc');
    });

    it('calls onToggleVisibility with the skill id when eye button is clicked', () => {
      const onToggleVisibility = vi.fn();
      render(
        <SkillBadge
          skill={makeSkill({ id: 'xyz' })}
          locale="en"
          editable={true}
          onRemove={vi.fn()}
          onToggleVisibility={onToggleVisibility}
        />,
      );
      fireEvent.click(screen.getByTitle(/hide in export/i));
      expect(onToggleVisibility).toHaveBeenCalledWith('xyz');
    });

    it('calls onLevelChange with skill id and new level when select changes', () => {
      const onLevelChange = vi.fn();
      render(
        <SkillBadge
          skill={makeSkill({ id: 'skill-1', level: 3 })}
          locale="en"
          editable={true}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
          onLevelChange={onLevelChange}
        />,
      );
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
      expect(onLevelChange).toHaveBeenCalledWith('skill-1', 5);
    });

    it('uses Swedish labels when locale is sv', () => {
      render(
        <SkillBadge
          skill={makeSkill()}
          locale="sv"
          editable={true}
          onRemove={vi.fn()}
          onToggleVisibility={vi.fn()}
        />,
      );
      expect(screen.getByTitle(/dölj i export/i)).toBeTruthy();
    });
  });
});
