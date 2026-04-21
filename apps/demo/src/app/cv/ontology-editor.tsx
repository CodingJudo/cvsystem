'use client';

/**
 * OntologyEditor — dedicated section for managing custom ontology entries.
 *
 * Custom entries override MIND entries of the same canonical name (full replacement)
 * or add brand-new terms. Changes are persisted to localStorage immediately and
 * reflected in autocomplete + graph modal without a page reload.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useCustomOntology } from '@/lib/store/ontology-store';
import { searchOntology, searchMindOntology, getMindEntry, type OntologySkill } from '@/lib/ontology';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/domain/model/cv';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const ENTRY_TYPES = [
  'Language',
  'Framework',
  'Library',
  'Platform',
  'Tool',
  'Concept',
  'Service',
  'Other',
] as const;

type EntryType = (typeof ENTRY_TYPES)[number];

interface EntryFormState {
  name: string;
  synonymsRaw: string;       // comma-separated text
  impliesNames: string[];    // canonical names (chips)
  domainsRaw: string;        // comma-separated text
  type: EntryType | '';
  extendsMindEntry: boolean; // when true, fields are merged on top of MIND data
}

const blankForm = (): EntryFormState => ({
  name: '',
  synonymsRaw: '',
  impliesNames: [],
  domainsRaw: '',
  type: '',
  extendsMindEntry: false,
});

function formToSkill(form: EntryFormState): OntologySkill {
  return {
    name: form.name.trim(),
    synonyms: form.synonymsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    technicalDomains: form.domainsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    impliesKnowingSkills: form.impliesNames,
    type: form.type ? [form.type] : [],
    extendsMindEntry: form.extendsMindEntry || undefined,
  };
}

function skillToForm(skill: OntologySkill): EntryFormState {
  return {
    name: skill.name,
    synonymsRaw: skill.synonyms.join(', '),
    impliesNames: skill.impliesKnowingSkills,
    domainsRaw: skill.technicalDomains.join(', '),
    type: (skill.type[0] as EntryType) ?? '',
    extendsMindEntry: skill.extendsMindEntry ?? false,
  };
}

// ---------------------------------------------------------------------------
// ImpliesInput — tag-style autocomplete input for the implies field
// ---------------------------------------------------------------------------

function ImpliesInput({
  value,
  onChange,
  locale,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  locale: Locale;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const excluded = new Set(value.map((n) => n.toLowerCase()));
    return searchOntology(query, excluded, 12);
  }, [query, value]);

  const addImplied = (name: string) => {
    if (!value.includes(name)) onChange([...value, name]);
    setQuery('');
    setOpen(false);
  };

  const removeImplied = (name: string) => {
    onChange(value.filter((n) => n !== name));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Chips */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-0.5 rounded-full bg-(--brand-primary)/10 border border-(--brand-primary)/30 px-2 py-0.5 text-xs text-(--brand-secondary)"
          >
            {name}
            <button
              type="button"
              onClick={() => removeImplied(name)}
              className="ml-0.5 text-(--brand-primary) hover:text-red-500"
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Text input */}
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const typed = query.trim();
            if (!typed) return;
            // Prefer an exact-name match from suggestions, otherwise use the typed text as-is.
            // This lets users reference ontology entries that aren't yet in the dataset
            // (e.g. ".NET" before a canonical entry for it exists).
            const exactMatch = suggestions.find(
              (s) => s.name.toLowerCase() === typed.toLowerCase(),
            );
            addImplied(exactMatch ? exactMatch.name : typed);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={locale === 'sv' ? 'Sök och lägg till, eller skriv fritt + Enter…' : 'Search and add, or type freely + Enter…'}
        className="text-sm"
      />

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg text-sm max-h-48 overflow-y-auto dark:bg-zinc-900">
          {suggestions.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-(--brand-primary)/10 flex items-center justify-between"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addImplied(s.name);
                }}
              >
                <span>{s.name}</span>
                {s.technicalDomains.length > 0 && (
                  <span className="text-[10px] text-gray-400 ml-2 truncate max-w-[120px]">
                    {s.technicalDomains.slice(0, 2).join(', ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntryForm — add / edit form
// ---------------------------------------------------------------------------

interface EntryFormProps {
  initial: EntryFormState;
  isEditing: boolean;         // true = edit mode (name field disabled)
  locale: Locale;
  onSave: (form: EntryFormState) => void;
  onCancel: () => void;
}

function EntryForm({ initial, isEditing, locale, onSave, onCancel }: EntryFormProps) {
  const [form, setForm] = useState<EntryFormState>(initial);
  const mindEntry = getMindEntry(form.name.trim());
  const [importQuery, setImportQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const importSuggestions = useMemo(() => {
    if (!importQuery.trim()) return [];
    return searchMindOntology(importQuery, new Set(), 8);
  }, [importQuery]);

  const applyMindEntry = (entry: { name: string; synonyms: string[]; technicalDomains: string[] }) => {
    // searchMindOntology returns OntologySuggestion; to get full entry we need to look it up
    // We have all data we expose in OntologySuggestion — use what's available
    setForm((prev) => ({
      ...prev,
      name: entry.name,
      synonymsRaw: entry.synonyms.join(', '),
      domainsRaw: entry.technicalDomains.join(', '),
      // implies: not in OntologySuggestion shape — user fills manually or we can extend
    }));
    setShowImport(false);
    setImportQuery('');
    setImportOpen(false);
  };

  const canSave = form.name.trim().length > 0;

  return (
    <Card className="border-2 border-(--brand-primary) shadow-none">
      <CardContent className="pt-4 space-y-4">
        {/* Import from MIND */}
        {!isEditing && (
          <div>
            {!showImport ? (
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="text-xs text-(--brand-primary) hover:underline"
              >
                {locale === 'sv' ? '↓ Importera från MIND-ontologin' : '↓ Import from MIND ontology'}
              </button>
            ) : (
              <div className="relative">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {locale === 'sv' ? 'Sök i MIND-data (klicka för att förfylla formuläret)' : 'Search MIND data (click to pre-fill form)'}
                </p>
                <Input
                  autoFocus
                  value={importQuery}
                  onChange={(e) => { setImportQuery(e.target.value); setImportOpen(true); }}
                  onFocus={() => setImportOpen(true)}
                  onBlur={() => setTimeout(() => setImportOpen(false), 150)}
                  placeholder={locale === 'sv' ? 'Sök i MIND…' : 'Search MIND…'}
                  className="text-sm"
                />
                {importOpen && importSuggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg text-sm max-h-48 overflow-y-auto dark:bg-zinc-900">
                    {importSuggestions.map((s) => (
                      <li key={s.name}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); applyMindEntry(s); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-(--brand-primary)/10 flex items-center justify-between"
                        >
                          <span>{s.name}</span>
                          {s.technicalDomains.length > 0 && (
                            <span className="text-[10px] text-gray-400 ml-2">
                              {s.technicalDomains.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  {locale === 'sv' ? 'Avbryt import' : 'Cancel import'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Name */}
        <div>
          <Label htmlFor="onto-name" className="text-xs font-medium text-gray-600">
            {locale === 'sv' ? 'Kanoniskt namn *' : 'Canonical name *'}
          </Label>
          <Input
            id="onto-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={isEditing}
            placeholder={locale === 'sv' ? 't.ex. .NET' : 'e.g. .NET'}
            className="mt-1 text-sm"
          />
          {isEditing && (
            <p className="mt-0.5 text-[11px] text-gray-400">
              {locale === 'sv' ? 'Namnet är nyckeln och kan inte ändras efter skapandet.' : 'Name is the key and cannot be changed after creation.'}
            </p>
          )}
        </div>

        {/* Extend toggle — only shown when the name matches a MIND entry */}
        {mindEntry && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.extendsMindEntry}
                onChange={(e) => setForm((f) => ({ ...f, extendsMindEntry: e.target.checked }))}
                className="rounded"
              />
              {locale === 'sv'
                ? 'Utöka MIND-post — lägg till ovanpå befintlig MIND-data istället för att ersätta'
                : 'Extend MIND entry — merge fields on top of MIND data instead of replacing it'}
            </label>
            {form.extendsMindEntry && (
              <div className="rounded bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 space-y-0.5">
                <p className="font-medium mb-1">
                  {locale === 'sv' ? 'MIND-data som bevaras:' : 'MIND data preserved:'}
                </p>
                {mindEntry.synonyms.length > 0 && (
                  <p>{locale === 'sv' ? 'Synonymer' : 'Synonyms'}: {mindEntry.synonyms.join(', ')}</p>
                )}
                {mindEntry.impliesKnowingSkills.length > 0 && (
                  <p>{locale === 'sv' ? 'Medför' : 'Implies'}: {mindEntry.impliesKnowingSkills.join(', ')}</p>
                )}
                {mindEntry.technicalDomains.length > 0 && (
                  <p>{locale === 'sv' ? 'Domäner' : 'Domains'}: {mindEntry.technicalDomains.join(', ')}</p>
                )}
                <p className="text-blue-500 mt-1">
                  {locale === 'sv'
                    ? 'Fälten nedan läggs till MIND-datan ovan.'
                    : 'Fields below are added to the MIND data above.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Two-column grid for the rest */}
        <div className="grid grid-cols-2 gap-4">
          {/* Synonyms */}
          <div>
            <Label htmlFor="onto-synonyms" className="text-xs font-medium text-gray-600">
              {locale === 'sv' ? 'Synonymer (kommaseparerade)' : 'Synonyms (comma-separated)'}
            </Label>
            <Input
              id="onto-synonyms"
              value={form.synonymsRaw}
              onChange={(e) => setForm({ ...form, synonymsRaw: e.target.value })}
              placeholder={locale === 'sv' ? 't.ex. dotnet, .net 8' : 'e.g. dotnet, .net 8'}
              className="mt-1 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <Label className="text-xs font-medium text-gray-600">
              {locale === 'sv' ? 'Typ' : 'Type'}
            </Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as EntryType })}
            >
              <SelectTrigger className="mt-1 text-sm h-9">
                <SelectValue placeholder={locale === 'sv' ? 'Välj typ…' : 'Select type…'} />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Technical domains */}
          <div>
            <Label htmlFor="onto-domains" className="text-xs font-medium text-gray-600">
              {locale === 'sv' ? 'Tekniska domäner (kommaseparerade)' : 'Technical domains (comma-separated)'}
            </Label>
            <Input
              id="onto-domains"
              value={form.domainsRaw}
              onChange={(e) => setForm({ ...form, domainsRaw: e.target.value })}
              placeholder={locale === 'sv' ? 't.ex. Backend, Cloud' : 'e.g. Backend, Cloud'}
              className="mt-1 text-sm"
            />
          </div>

          {/* Implies (spans full width) */}
          <div className="col-span-2">
            <Label className="text-xs font-medium text-gray-600">
              {locale === 'sv' ? 'Medför kunskap om (implikationer)' : 'Implies knowing (graph edges)'}
            </Label>
            <div className="mt-1">
              <ImpliesInput
                value={form.impliesNames}
                onChange={(next) => setForm({ ...form, impliesNames: next })}
                locale={locale}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {locale === 'sv' ? 'Avbryt' : 'Cancel'}
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => onSave(form)}
          >
            {isEditing
              ? locale === 'sv' ? 'Spara' : 'Save'
              : locale === 'sv' ? 'Lägg till' : 'Add entry'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// EntryRow — single entry in the list
// ---------------------------------------------------------------------------

function EntryRow({
  entry,
  isOverride,
  locale,
  onEdit,
  onDelete,
}: {
  entry: OntologySkill;
  isOverride: boolean;
  locale: Locale;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = entry.extendsMindEntry ? (
    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
      {locale === 'sv' ? 'Utökar MIND' : 'Extend'}
    </span>
  ) : isOverride ? (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      {locale === 'sv' ? 'Åsidosätter MIND' : 'Override'}
    </span>
  ) : (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      {locale === 'sv' ? 'Anpassad' : 'Custom'}
    </span>
  );

  const meta: string[] = [];
  if (entry.synonyms.length > 0) meta.push(`synonyms: ${entry.synonyms.slice(0, 3).join(', ')}${entry.synonyms.length > 3 ? '…' : ''}`);
  if (entry.impliesKnowingSkills.length > 0) meta.push(`implies: ${entry.impliesKnowingSkills.slice(0, 3).join(', ')}${entry.impliesKnowingSkills.length > 3 ? '…' : ''}`);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm dark:bg-zinc-900">
      <span className="font-medium text-(--brand-secondary) min-w-[120px] truncate">
        {entry.name}
      </span>
      {badge}
      {entry.type[0] && (
        <span className="text-xs text-gray-400">{entry.type[0]}</span>
      )}
      {meta.length > 0 && (
        <span className="text-xs text-gray-400 truncate flex-1">{meta.join('  ·  ')}</span>
      )}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
          title={locale === 'sv' ? 'Redigera' : 'Edit'}
        >
          {locale === 'sv' ? 'Redigera' : 'Edit'}
        </button>
        <button
          onClick={onDelete}
          className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50"
          title={locale === 'sv' ? 'Ta bort' : 'Delete'}
        >
          {locale === 'sv' ? 'Ta bort' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OntologyEditor — main exported section component
// ---------------------------------------------------------------------------

export function OntologyEditor({ locale }: { locale: Locale }) {
  const { entries, addEntry, updateEntry, deleteEntry, downloadEntries, isOverride } =
    useCustomOntology();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const handleAdd = useCallback(
    (form: EntryFormState) => {
      addEntry(formToSkill(form));
      setShowAddForm(false);
    },
    [addEntry],
  );

  const handleUpdate = useCallback(
    (originalName: string, form: EntryFormState) => {
      updateEntry(originalName, formToSkill(form));
      setEditingName(null);
    },
    [updateEntry],
  );

  const handleDelete = useCallback(
    (name: string) => {
      if (window.confirm(
        locale === 'sv'
          ? `Ta bort "${name}" från din anpassade ontologi?`
          : `Remove "${name}" from your custom ontology?`,
      )) {
        deleteEntry(name);
        if (editingName === name) setEditingName(null);
      }
    },
    [deleteEntry, editingName, locale],
  );

  const filteredEntries = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.synonyms.some((s) => s.toLowerCase().includes(q)),
    );
  }, [entries, filterQuery]);

  const extendCount = entries.filter((e) => e.extendsMindEntry).length;
  const overrideCount = entries.filter((e) => !e.extendsMindEntry && isOverride(e.name)).length;
  const customCount = entries.length - extendCount - overrideCount;

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">
              {locale === 'sv' ? 'Ontologi' : 'Ontology'}
            </CardTitle>
            <CardDescription>
              {entries.length === 0
                ? locale === 'sv'
                  ? 'Inga anpassade poster. MIND-ontologin används som standard.'
                  : 'No custom entries. MIND ontology used as default.'
                : locale === 'sv'
                  ? `${entries.length} poster · ${extendCount} utökar · ${overrideCount} åsidosätter · ${customCount} nya`
                  : `${entries.length} entries · ${extendCount} extend · ${overrideCount} override · ${customCount} new`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadEntries}
                title={locale === 'sv' ? 'Ladda ner ontologi.json' : 'Download ontology.json'}
              >
                {locale === 'sv' ? 'Ladda ner' : 'Download'}
              </Button>
            )}
            {!showAddForm && !editingName && (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                + {locale === 'sv' ? 'Lägg till' : 'Add entry'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add form */}
        {showAddForm && (
          <EntryForm
            initial={blankForm()}
            isEditing={false}
            locale={locale}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Filter */}
        {entries.length > 4 && !showAddForm && (
          <Input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={locale === 'sv' ? 'Filtrera poster…' : 'Filter entries…'}
            className="text-sm"
          />
        )}

        {/* Entry list */}
        {filteredEntries.length === 0 && entries.length > 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            {locale === 'sv' ? 'Inga poster matchar filtret.' : 'No entries match the filter.'}
          </p>
        )}

        {filteredEntries.map((entry) =>
          editingName === entry.name ? (
            <EntryForm
              key={entry.name}
              initial={skillToForm(entry)}
              isEditing
              locale={locale}
              onSave={(form) => handleUpdate(entry.name, form)}
              onCancel={() => setEditingName(null)}
            />
          ) : (
            <EntryRow
              key={entry.name}
              entry={entry}
              isOverride={isOverride(entry.name)}
              locale={locale}
              onEdit={() => {
                setShowAddForm(false);
                setEditingName(entry.name);
              }}
              onDelete={() => handleDelete(entry.name)}
            />
          ),
        )}

        {/* Empty state */}
        {entries.length === 0 && !showAddForm && (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">
              {locale === 'sv'
                ? 'Skapa egna ontologiposter för att åsidosätta MIND-termer eller lägga till nya begrepp.'
                : 'Create custom ontology entries to override MIND terms or add new concepts.'}
            </p>
            <p className="mt-1 text-xs text-gray-300">
              {locale === 'sv'
                ? 'Tips: importera en MIND-post för att börja med befintliga data.'
                : 'Tip: use "Import from MIND" to start from existing data.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
