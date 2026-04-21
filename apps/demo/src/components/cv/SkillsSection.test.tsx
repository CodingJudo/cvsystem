// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillsSection } from './SkillsSection';
import type { RoleSkill } from '@/domain/model/cv';

// Mock AddSkillForm and store hooks to keep tests focused on SkillsSection logic
vi.mock('./AddSkillForm', () => ({
  AddSkillForm: () => <div data-testid="add-skill-form" />,
}));

vi.mock('@/lib/store/cv-store', () => ({
  useSkills: () => ({ skills: [], addSkill: vi.fn() }),
  useCVState: () => ({ cv: null }),
  useRoles: () => ({}),
  useHobbyProjects: () => ({}),
}));

function makeSkill(overrides: Partial<RoleSkill> = {}): RoleSkill {
  return {
    id: 'skill-1',
    name: 'TypeScript',
    level: 3,
    visible: true,
    ...overrides,
  };
}

const defaultProps = {
  locale: 'en' as const,
  editable: true,
  canResetOrder: false,
  graphContext: null,
  onRemove: vi.fn(),
  onToggleVisibility: vi.fn(),
  onReorder: vi.fn(),
  onResetOrder: vi.fn(),
  onAddSkill: vi.fn(),
};

describe('SkillsSection', () => {
  describe('rendering', () => {
    it('shows empty message when no skills', () => {
      render(<SkillsSection {...defaultProps} skills={[]} />);
      expect(screen.getByText('No technologies added')).toBeTruthy();
    });

    it('renders skill badges', () => {
      const skills = [
        makeSkill({ id: 'a', name: 'React' }),
        makeSkill({ id: 'b', name: 'Node.js' }),
      ];
      render(<SkillsSection {...defaultProps} skills={skills} />);
      expect(screen.getByText('React')).toBeTruthy();
      expect(screen.getByText('Node.js')).toBeTruthy();
    });

    it('shows AddSkillForm when editable', () => {
      render(<SkillsSection {...defaultProps} skills={[]} editable={true} />);
      expect(screen.getByTestId('add-skill-form')).toBeTruthy();
    });

    it('hides AddSkillForm when not editable', () => {
      render(<SkillsSection {...defaultProps} skills={[]} editable={false} />);
      expect(screen.queryByTestId('add-skill-form')).toBeNull();
    });

    it('shows reset button when canResetOrder is true and editable', () => {
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill()]}
          canResetOrder={true}
        />,
      );
      expect(screen.getByText('Sort alphabetically')).toBeTruthy();
    });

    it('hides reset button when canResetOrder is false', () => {
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill()]}
          canResetOrder={false}
        />,
      );
      expect(screen.queryByText('Sort alphabetically')).toBeNull();
    });

    it('does not render level select when onLevelChange is not provided', () => {
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill({ level: 4 })]}
          editable={true}
        />,
      );
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('renders level select when onLevelChange is provided and editable', () => {
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill({ level: 3 })]}
          editable={true}
          onLevelChange={vi.fn()}
        />,
      );
      expect(screen.getByRole('combobox')).toBeTruthy();
    });

    it('uses Swedish labels when locale is sv', () => {
      render(
        <SkillsSection
          {...defaultProps}
          locale="sv"
          skills={[]}
        />,
      );
      expect(screen.getByText('Inga tekniker tillagda')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onRemove when × is clicked', () => {
      const onRemove = vi.fn();
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill({ id: 'skill-1' })]}
          onRemove={onRemove}
        />,
      );
      fireEvent.click(screen.getByTitle('Remove skill'));
      expect(onRemove).toHaveBeenCalledWith('skill-1');
    });

    it('calls onToggleVisibility when eye button is clicked', () => {
      const onToggleVisibility = vi.fn();
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill({ id: 'skill-1' })]}
          onToggleVisibility={onToggleVisibility}
        />,
      );
      fireEvent.click(screen.getByTitle(/hide in export/i));
      expect(onToggleVisibility).toHaveBeenCalledWith('skill-1');
    });

    it('calls onLevelChange when level select changes', () => {
      const onLevelChange = vi.fn();
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill({ id: 'skill-1', level: 2 })]}
          onLevelChange={onLevelChange}
        />,
      );
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
      expect(onLevelChange).toHaveBeenCalledWith('skill-1', 4);
    });

    it('calls onResetOrder when reset button is clicked', () => {
      const onResetOrder = vi.fn();
      render(
        <SkillsSection
          {...defaultProps}
          skills={[makeSkill()]}
          canResetOrder={true}
          onResetOrder={onResetOrder}
        />,
      );
      fireEvent.click(screen.getByText('Sort alphabetically'));
      expect(onResetOrder).toHaveBeenCalled();
    });
  });
});
