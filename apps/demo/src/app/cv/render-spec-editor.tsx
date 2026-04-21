'use client';

/**
 * RenderSpecEditor — create, configure, and delete audience-specific render specs.
 *
 * Each spec controls:
 *  - Which CV items (roles, projects, trainings, educations, commitments) are visible
 *  - Whether role-level skills are shown individually or collapsed by their groupAs label
 *
 * The active spec in the editor is persisted on the CV so the print preview
 * opens with the same selection.
 */

import { useState, useId } from 'react';
import type { Locale, RenderSpec } from '@/domain/model/cv';
import { getBilingualText } from '@/lib/format';
import { useRenderSpecs } from '@/lib/store/cv-store';
import { useRoles, useHobbyProjects, useTrainings, useEducations, useCommitments } from '@/lib/store/cv-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type HiddenKey = keyof NonNullable<RenderSpec['hiddenItemIds']>;

function isItemHidden(spec: RenderSpec, type: HiddenKey, id: string): boolean {
  return (spec.hiddenItemIds?.[type] ?? []).includes(id);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ItemToggleProps {
  id: string;
  label: string;
  sublabel?: string;
  hidden: boolean;
  onToggle: (hidden: boolean) => void;
}

function ItemToggle({ id, label, sublabel, hidden, onToggle }: ItemToggleProps) {
  const checkId = useId();
  return (
    <label
      htmlFor={checkId}
      className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
        hidden
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <input
        id={checkId}
        type="checkbox"
        checked={!hidden}
        onChange={(e) => onToggle(!e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--brand-primary)]"
        aria-label={`${hidden ? 'Show' : 'Hide'} "${label}"`}
      />
      <span className="flex flex-col min-w-0">
        <span className={`text-sm font-medium truncate ${hidden ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {label}
        </span>
        {sublabel && (
          <span className="text-xs text-gray-500 truncate">{sublabel}</span>
        )}
      </span>
    </label>
  );
}

interface ItemSectionProps {
  title: string;
  items: { id: string; label: string; sublabel?: string }[];
  spec: RenderSpec;
  type: HiddenKey;
  onToggle: (type: HiddenKey, itemId: string, hidden: boolean) => void;
}

function ItemSection({ title, items, spec, type, onToggle }: ItemSectionProps) {
  if (items.length === 0) return null;
  const hiddenCount = items.filter((i) => isItemHidden(spec, type, i.id)).length;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        {hiddenCount > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
            {hiddenCount} hidden
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <ItemToggle
            key={item.id}
            id={item.id}
            label={item.label}
            sublabel={item.sublabel}
            hidden={isItemHidden(spec, type, item.id)}
            onToggle={(hidden) => onToggle(type, item.id, hidden)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Spec card ────────────────────────────────────────────────────────────────

interface SpecCardProps {
  spec: RenderSpec;
  isActive: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onSetActive: () => void;
  onUpdateSpec: (updates: Partial<Omit<RenderSpec, 'id'>>) => void;
  onRemove: () => void;
  locale: Locale;
  roles: ReturnType<typeof useRoles>['roles'];
  hobbyProjects: ReturnType<typeof useHobbyProjects>['hobbyProjects'];
  trainings: ReturnType<typeof useTrainings>['trainings'];
  educations: ReturnType<typeof useEducations>['educations'];
  commitments: ReturnType<typeof useCommitments>['commitments'];
}

function SpecCard({
  spec,
  isActive,
  isExpanded,
  onExpand,
  onSetActive,
  onUpdateSpec,
  onRemove,
  locale,
  roles,
  hobbyProjects,
  trainings,
  educations,
  commitments,
}: SpecCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(spec.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== spec.name) {
      onUpdateSpec({ name: trimmed });
    } else {
      setNameValue(spec.name);
    }
    setEditingName(false);
  };

  const handleToggleItem = (type: HiddenKey, itemId: string, hidden: boolean) => {
    const current = spec.hiddenItemIds?.[type] ?? [];
    const updated = hidden
      ? [...current, itemId]
      : current.filter((id) => id !== itemId);
    onUpdateSpec({ hiddenItemIds: { ...spec.hiddenItemIds, [type]: updated } });
  };

  const totalHidden = Object.values(spec.hiddenItemIds ?? {}).reduce(
    (sum, arr) => sum + (arr?.length ?? 0),
    0,
  );

  // Build item lists for each section
  const roleItems = roles.map((r) => ({
    id: r.id,
    label: r.title ?? r.company ?? 'Untitled role',
    sublabel: r.company ?? undefined,
  }));

  const projectItems = hobbyProjects.map((p) => ({
    id: p.id,
    label: p.title ?? 'Untitled project',
  }));

  const trainingItems = trainings.map((t) => ({
    id: t.id,
    label: t.title,
    sublabel: t.issuer ?? undefined,
  }));

  const educationItems = educations.map((e) => ({
    id: e.id,
    label: e.schoolName,
    sublabel: e.programName ?? undefined,
  }));

  const commitmentItems = commitments.map((c) => ({
    id: c.id,
    label: c.title,
    sublabel: getBilingualText(c.description, locale) ?? undefined,
  }));

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm transition-all ${
        isActive ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onExpand}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
          aria-expanded={isExpanded}
        >
          <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
          {editingName ? (
            <Input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') { setNameValue(spec.name); setEditingName(false); }
              }}
              className="h-7 text-sm font-semibold px-2 py-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="font-semibold text-sm text-gray-800 truncate"
              onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
              title="Double-click to rename"
            >
              {spec.name}
            </span>
          )}
          {isActive && (
            <span className="shrink-0 text-xs bg-[var(--brand-primary)] text-white px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          )}
          {totalHidden > 0 && (
            <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {totalHidden} hidden
            </span>
          )}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
              onClick={onSetActive}
            >
              Set active
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => { setEditingName(true); setNameValue(spec.name); }}
            title="Rename spec"
          >
            ✏️
          </Button>
          {confirmDelete ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                onClick={onRemove}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
              title="Delete spec"
            >
              🗑
            </Button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-5">
          {/* Skill display */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
              Role-level skill display
            </Label>
            <div className="flex gap-2">
              {(['individual', 'grouped'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateSpec({ skillDisplay: mode })}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm text-center transition-colors ${
                    spec.skillDisplay === mode
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'individual' ? '📋 Individual' : '📦 Grouped'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {spec.skillDisplay === 'grouped'
                ? 'Skills sharing the same "group label" on each role will be collapsed into one entry.'
                : 'Each skill is shown individually in role sections.'}
            </p>
          </div>

          {/* Item visibility */}
          <div className="flex flex-col gap-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block -mb-2">
              Item visibility
            </Label>
            <ItemSection
              title="Roles & Experience"
              items={roleItems}
              spec={spec}
              type="roles"
              onToggle={handleToggleItem}
            />
            <ItemSection
              title="Hobby Projects"
              items={projectItems}
              spec={spec}
              type="hobbyProjects"
              onToggle={handleToggleItem}
            />
            <ItemSection
              title="Trainings & Certifications"
              items={trainingItems}
              spec={spec}
              type="trainings"
              onToggle={handleToggleItem}
            />
            <ItemSection
              title="Education"
              items={educationItems}
              spec={spec}
              type="educations"
              onToggle={handleToggleItem}
            />
            <ItemSection
              title="Commitments"
              items={commitmentItems}
              spec={spec}
              type="commitments"
              onToggle={handleToggleItem}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RenderSpecEditorProps {
  locale: Locale;
}

export function RenderSpecEditor({ locale }: RenderSpecEditorProps) {
  const { specs, activeSpecId, addSpec, updateSpec, removeSpec, setActiveSpec } = useRenderSpecs();
  const { roles } = useRoles();
  const { hobbyProjects } = useHobbyProjects();
  const { trainings } = useTrainings();
  const { educations } = useEducations();
  const { commitments } = useCommitments();

  const [expandedSpecId, setExpandedSpecId] = useState<string | null>(null);
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecSkillDisplay, setNewSpecSkillDisplay] = useState<'individual' | 'grouped'>('individual');

  const handleAddSpec = () => {
    const trimmed = newSpecName.trim();
    if (!trimmed) return;
    const newSpec = addSpec({
      name: trimmed,
      locale,
      skillDisplay: newSpecSkillDisplay,
      hiddenItemIds: {},
    });
    setNewSpecName('');
    setNewSpecSkillDisplay('individual');
    setIsAddingSpec(false);
    // Auto-expand the new spec so the user can configure it immediately
    setExpandedSpecId(newSpec.id);
  };

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--brand-secondary)]">
            {locale === 'sv' ? 'Visningsprofiler' : 'Audience Specs'}
          </CardTitle>
          {!isAddingSpec && (
            <Button
              size="sm"
              onClick={() => setIsAddingSpec(true)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white h-8 px-3 text-xs"
            >
              + {locale === 'sv' ? 'Ny profil' : 'New spec'}
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {locale === 'sv'
            ? 'Skapa namngivna vyer av ditt CV för olika målgrupper — dölj specifika uppdrag, kurser eller projekt och välj hur kompetenser visas.'
            : 'Create named views of your CV for different audiences — hide specific roles, trainings, or projects and control how skills are displayed.'}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Add spec form */}
        {isAddingSpec && (
          <div className="rounded-lg border border-dashed border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5 p-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="new-spec-name" className="text-xs font-semibold text-gray-700 mb-1 block">
                {locale === 'sv' ? 'Namn på profilen' : 'Spec name'}
              </Label>
              <Input
                id="new-spec-name"
                autoFocus
                placeholder={locale === 'sv' ? 't.ex. Java-team, Management' : 'e.g. Java team, Management'}
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSpec();
                  if (e.key === 'Escape') { setIsAddingSpec(false); setNewSpecName(''); }
                }}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                {locale === 'sv' ? 'Standard kompetensvisning' : 'Default skill display'}
              </Label>
              <div className="flex gap-2">
                {(['individual', 'grouped'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setNewSpecSkillDisplay(mode)}
                    className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      newSpecSkillDisplay === mode
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {mode === 'individual'
                      ? (locale === 'sv' ? '📋 Individuellt' : '📋 Individual')
                      : (locale === 'sv' ? '📦 Grupperat' : '📦 Grouped')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIsAddingSpec(false); setNewSpecName(''); }}
              >
                {locale === 'sv' ? 'Avbryt' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                disabled={!newSpecName.trim()}
                onClick={handleAddSpec}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
              >
                {locale === 'sv' ? 'Skapa profil' : 'Create spec'}
              </Button>
            </div>
          </div>
        )}

        {/* Spec list */}
        {specs.length === 0 && !isAddingSpec && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {locale === 'sv' ? 'Inga profiler skapade' : 'No specs yet'}
            </p>
            <p className="text-xs text-gray-400">
              {locale === 'sv'
                ? 'Skapa en profil för att filtrera och anpassa ditt CV för olika målgrupper.'
                : 'Create a spec to filter and tailor your CV for different audiences.'}
            </p>
          </div>
        )}

        {specs.map((spec) => (
          <SpecCard
            key={spec.id}
            spec={spec}
            isActive={activeSpecId === spec.id}
            isExpanded={expandedSpecId === spec.id}
            onExpand={() => setExpandedSpecId(expandedSpecId === spec.id ? null : spec.id)}
            onSetActive={() => setActiveSpec(spec.id)}
            onUpdateSpec={(updates) => updateSpec(spec.id, updates)}
            onRemove={() => {
              removeSpec(spec.id);
              if (expandedSpecId === spec.id) setExpandedSpecId(null);
            }}
            locale={locale}
            roles={roles}
            hobbyProjects={hobbyProjects}
            trainings={trainings}
            educations={educations}
            commitments={commitments}
          />
        ))}

        {/* Active spec hint */}
        {specs.length > 0 && (
          <p className="text-xs text-gray-400 text-center pt-1">
            {locale === 'sv'
              ? 'Den aktiva profilen visas i förhandsgranskningen. Välj "Full CV" i förhandsgranskningen för att se allt.'
              : 'The active spec is applied in print preview. Select "Full CV" in the preview to show everything.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
