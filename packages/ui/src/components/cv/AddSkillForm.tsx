'use client';

/**
 * Search-and-add typeahead for adding skills to a role or hobby project.
 *
 * Handles: main-skills search, ontology suggestions, keyboard nav,
 * "Create new" sub-form, and the SkillGraphModal explore button.
 *
 * The caller provides `onAddSkill` which is called with the Skill (existing or
 * newly created) to wire it into the appropriate role / hobby-project context.
 */

import { useState, useEffect, useRef, useMemo, lazy, Suspense, startTransition } from 'react';
import type { DomainCV, Locale, Skill } from '@cvsystem/core';
import { useSkills, useCVState } from '../../store/cv-store';
import { searchOntology, type OntologySuggestion } from '@cvsystem/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AddSkillForm as CreateSkillSubForm } from '../../editors/skill-editor';
import type { GraphContext } from '../../editors/SkillGraphModal';

const SkillGraphModal = lazy(() =>
  import('../../editors/SkillGraphModal').then((m) => ({ default: m.SkillGraphModal })),
);

const DEBOUNCE_MS = 250;

export interface AddSkillFormProps {
  locale: Locale;
  /** IDs of skills already on this context (used to exclude them from suggestions). */
  existingSkillIds: string[];
  /** Context forwarded to SkillGraphModal (role or hobby project). */
  graphContext: GraphContext;
  /** Called with the skill to add to the caller's context. */
  onAddSkill: (skill: Skill) => void;
}

export function AddSkillForm({
  locale,
  existingSkillIds,
  graphContext,
  onAddSkill,
}: AddSkillFormProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormInitial, setCreateFormInitial] = useState<{
    name: string;
    level: number | null;
    years: number | null;
  }>({ name: '', level: 3, years: null });
  const [pendingOntologyRef, setPendingOntologyRef] = useState<string | null>(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { cv } = useCVState();
  const { skills: mainSkills, addSkill } = useSkills();

  // Derive a unique listbox id from graphContext
  const listboxId =
    graphContext === null
      ? 'skill-listbox-all'
      : graphContext.type === 'role'
        ? `skill-listbox-role-${graphContext.roleId}`
        : `skill-listbox-hobby-${graphContext.projectId}`;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim();
    const alreadyOnContext = new Set(existingSkillIds);
    const matching = mainSkills.filter(
      (s) =>
        !alreadyOnContext.has(s.id) &&
        (q === '' || s.name.toLowerCase().includes(q.toLowerCase())),
    );
    const exactMatch = q ? mainSkills.find((s) => s.name === q) : null;
    const showCreateNew = q.length > 0 && !exactMatch;
    const excludeNames = new Set(mainSkills.map((s) => (s.ontologyRef ?? s.name).toLowerCase()));
    const ontology = q ? searchOntology(q, excludeNames, 8) : [];
    return { matching, showCreateNew, createName: q, ontology };
  }, [mainSkills, existingSkillIds, debouncedQuery]);

  const options = useMemo(() => {
    const list: (
      | { type: 'skill'; skill: Skill }
      | { type: 'ontology'; entry: OntologySuggestion }
      | { type: 'create'; name: string }
    )[] = [
      ...suggestions.matching.slice(0, 12).map((skill) => ({ type: 'skill' as const, skill })),
      ...suggestions.ontology.map((entry) => ({ type: 'ontology' as const, entry })),
    ];
    if (suggestions.showCreateNew) {
      list.push({ type: 'create' as const, name: suggestions.createName });
    }
    return list;
  }, [suggestions]);

  const firstOntologyIndex = useMemo(
    () => options.findIndex((o) => o.type === 'ontology'),
    [options],
  );

  useEffect(() => {
    startTransition(() => {
      setHighlightIndex(0);
    });
  }, [options.length]);

  const handleSelectExisting = (skill: Skill) => {
    onAddSkill(skill);
    setQuery('');
    setIsDropdownOpen(false);
  };

  const handleCreateNew = () => {
    if (!suggestions.createName) return;
    setCreateFormInitial({ name: suggestions.createName, level: 3, years: null });
    setPendingOntologyRef(null);
    setShowCreateForm(true);
    setQuery('');
    setIsDropdownOpen(false);
  };

  const handleSelectOntology = (entry: OntologySuggestion) => {
    setCreateFormInitial({ name: entry.name, level: 3, years: null });
    setPendingOntologyRef(entry.name);
    setShowCreateForm(true);
    setQuery('');
    setIsDropdownOpen(false);
  };

  const handleCreateFormSubmit = (skillData: Omit<Skill, 'id'>) => {
    const payload = pendingOntologyRef
      ? { ...skillData, ontologyRef: pendingOntologyRef }
      : skillData;
    const newSkill = addSkill(payload);
    onAddSkill(newSkill);
    setShowCreateForm(false);
    setCreateFormInitial({ name: '', level: 3, years: null });
    setPendingOntologyRef(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || options.length === 0) {
      if (e.key === 'Escape') setIsDropdownOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % options.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + options.length) % options.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[highlightIndex];
      if (opt.type === 'skill') handleSelectExisting(opt.skill);
      else if (opt.type === 'ontology') handleSelectOntology(opt.entry);
      else handleCreateNew();
      return;
    }
    if (e.key === 'Escape') setIsDropdownOpen(false);
  };

  const showDropdown =
    isDropdownOpen &&
    query.trim() !== '' &&
    (suggestions.matching.length > 0 || suggestions.ontology.length > 0 || suggestions.showCreateNew);

  const inputLabel = locale === 'sv' ? 'Sök eller skapa teknik' : 'Search or create technology';
  const addTarget =
    graphContext?.type === 'hobby'
      ? locale === 'sv'
        ? 'Lägg till i projektet och i Kompetenser'
        : 'Add to project and to Skills'
      : locale === 'sv'
        ? 'Lägg till i rollen och i Kompetenser'
        : 'Add to role and to Skills';

  return (
    <div ref={containerRef} className="relative mt-2 space-y-2">
      {showCreateForm ? (
        <div className="rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-3">
          <p className="mb-2 text-xs font-medium text-[var(--brand-secondary)]">{addTarget}</p>
          <CreateSkillSubForm
            initialName={createFormInitial.name}
            initialLevel={createFormInitial.level}
            initialYears={createFormInitial.years}
            onAdd={handleCreateFormSubmit}
            onCancel={() => {
              setShowCreateForm(false);
              setCreateFormInitial({ name: '', level: 3, years: null });
              setPendingOntologyRef(null);
            }}
          />
        </div>
      ) : (
        <>
          <div className="flex gap-1.5">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'sv' ? 'Sök eller skapa teknik…' : 'Search or create technology…'}
              className="flex-1"
              aria-label={inputLabel}
              aria-expanded={showDropdown}
              aria-controls={showDropdown ? listboxId : undefined}
              aria-autocomplete="list"
              role="combobox"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGraphOpen(true)}
              title={locale === 'sv' ? 'Utforska ontologi' : 'Explore ontology'}
              className="px-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                />
              </svg>
            </Button>
          </div>
          {showDropdown && (
            <ul
              id={listboxId}
              className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white py-1 shadow-lg dark:bg-zinc-900"
              role="listbox"
              aria-label={inputLabel}
            >
              {options.map((opt, i) => {
                const key =
                  opt.type === 'skill'
                    ? opt.skill.id
                    : opt.type === 'ontology'
                      ? `ont-${opt.entry.name}`
                      : `create-${opt.name}`;
                const showDivider = i === firstOntologyIndex && i > 0;
                return (
                  <div key={key}>
                    {showDivider && (
                      <li
                        role="presentation"
                        className="border-t border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-zinc-700"
                      >
                        {locale === 'sv' ? 'Ontologi' : 'Ontology'}
                      </li>
                    )}
                    <li
                      role="option"
                      aria-selected={i === highlightIndex}
                      className={`cursor-pointer px-3 py-1.5 text-sm ${i === highlightIndex ? 'bg-[var(--brand-primary)]/15' : ''}`}
                      onMouseEnter={() => setHighlightIndex(i)}
                      onClick={() => {
                        if (opt.type === 'skill') handleSelectExisting(opt.skill);
                        else if (opt.type === 'ontology') handleSelectOntology(opt.entry);
                        else handleCreateNew();
                      }}
                    >
                      {opt.type === 'skill' ? (
                        opt.skill.name
                      ) : opt.type === 'ontology' ? (
                        <span className="flex items-baseline justify-between gap-2">
                          <span>{opt.entry.name}</span>
                          {opt.entry.technicalDomains.length > 0 && (
                            <span className="text-[10px] text-gray-500">
                              {opt.entry.technicalDomains.slice(0, 2).join(' · ')}
                            </span>
                          )}
                        </span>
                      ) : locale === 'sv' ? (
                        `Skapa ny: ${opt.name}`
                      ) : (
                        `Create new: ${opt.name}`
                      )}
                    </li>
                  </div>
                );
              })}
            </ul>
          )}
        </>
      )}
      {cv && graphOpen && (
        <Suspense fallback={null}>
          <SkillGraphModal
            isOpen={graphOpen}
            onClose={() => setGraphOpen(false)}
            cv={cv}
            initialContext={graphContext}
            locale={locale}
          />
        </Suspense>
      )}
    </div>
  );
}
