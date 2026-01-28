'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BilingualText, Role, Skill } from '@/domain/model/cv';
import type { 
  TextConflict, 
  RoleConflict, 
  SkillConflict, 
  ConflictResolution,
  ConflictType 
} from '@/lib/conflict';

interface ConflictCardProps {
  locale: 'sv' | 'en';
  resolution?: ConflictResolution;
  onResolve: (resolution: ConflictResolution) => void;
}

/**
 * Get bilingual text for display
 */
function getText(text: BilingualText, locale: 'sv' | 'en'): string {
  return text[locale] ?? text[locale === 'sv' ? 'en' : 'sv'] ?? '';
}

/**
 * Format a date string for display
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '?';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * Get label for conflict type
 */
function getTypeLabel(type: ConflictType, locale: 'sv' | 'en'): { label: string; color: string } {
  switch (type) {
    case 'modified':
      return { 
        label: locale === 'sv' ? 'Ändrad' : 'Modified', 
        color: 'bg-amber-100 text-amber-800' 
      };
    case 'added':
      return { 
        label: locale === 'sv' ? 'Ny' : 'New', 
        color: 'bg-green-100 text-green-800' 
      };
    case 'removed':
      return { 
        label: locale === 'sv' ? 'Borttagen' : 'Removed', 
        color: 'bg-red-100 text-red-800' 
      };
  }
}

/**
 * Resolution buttons component
 */
function ResolutionButtons({ 
  type, 
  resolution, 
  onResolve, 
  locale,
  currentLabel,
  incomingLabel,
}: { 
  type: ConflictType;
  resolution?: ConflictResolution;
  onResolve: (r: ConflictResolution) => void;
  locale: 'sv' | 'en';
  currentLabel?: string;
  incomingLabel?: string;
}) {
  const t = {
    keepCurrent: currentLabel ?? (locale === 'sv' ? 'Behåll nuvarande' : 'Keep current'),
    acceptIncoming: incomingLabel ?? (locale === 'sv' ? 'Använd inkommande' : 'Accept incoming'),
    skip: locale === 'sv' ? 'Hoppa över' : 'Skip',
    add: locale === 'sv' ? 'Lägg till' : 'Add',
    remove: locale === 'sv' ? 'Ta bort' : 'Remove',
    keep: locale === 'sv' ? 'Behåll' : 'Keep',
  };

  if (type === 'added') {
    return (
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant={resolution === 'skip' ? 'default' : 'outline'}
          onClick={() => onResolve('skip')}
          className={resolution === 'skip' ? 'bg-gray-600' : ''}
        >
          {t.skip}
        </Button>
        <Button
          size="sm"
          variant={resolution === 'accept' ? 'default' : 'outline'}
          onClick={() => onResolve('accept')}
          className={resolution === 'accept' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {t.add}
        </Button>
      </div>
    );
  }

  if (type === 'removed') {
    return (
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant={resolution === 'keep' ? 'default' : 'outline'}
          onClick={() => onResolve('keep')}
          className={resolution === 'keep' ? 'bg-[var(--geisli-primary)]' : ''}
        >
          {t.keep}
        </Button>
        <Button
          size="sm"
          variant={resolution === 'accept' ? 'default' : 'outline'}
          onClick={() => onResolve('accept')}
          className={resolution === 'accept' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          {t.remove}
        </Button>
      </div>
    );
  }

  // Modified
  return (
    <div className="flex gap-2 mt-3">
      <Button
        size="sm"
        variant={resolution === 'keep' ? 'default' : 'outline'}
        onClick={() => onResolve('keep')}
        className={resolution === 'keep' ? 'bg-[var(--geisli-primary)]' : ''}
      >
        {t.keepCurrent}
      </Button>
      <Button
        size="sm"
        variant={resolution === 'accept' ? 'default' : 'outline'}
        onClick={() => onResolve('accept')}
        className={resolution === 'accept' ? 'bg-[var(--geisli-accent)] hover:bg-[var(--geisli-accent)]/90' : ''}
      >
        {t.acceptIncoming}
      </Button>
    </div>
  );
}

/**
 * Text conflict card (title or summary)
 */
export function TextConflictCard({ 
  conflict, 
  locale, 
  resolution, 
  onResolve 
}: ConflictCardProps & { conflict: TextConflict }) {
  const typeInfo = getTypeLabel(conflict.type, locale);
  const sectionLabel = conflict.section === 'title' 
    ? (locale === 'sv' ? 'Titel' : 'Title')
    : (locale === 'sv' ? 'Sammanfattning' : 'Summary');
  
  const currentText = getText(conflict.current, locale);
  const incomingText = getText(conflict.incoming, locale);
  
  return (
    <Card className={`border-l-4 ${resolution ? 'border-l-green-500' : 'border-l-amber-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="font-medium text-[var(--geisli-secondary)]">{sectionLabel}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Current */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {locale === 'sv' ? 'Nuvarande' : 'Current'}
            </p>
            <p className={`text-sm ${!currentText ? 'text-gray-400 italic' : ''}`}>
              {currentText || (locale === 'sv' ? '(tom)' : '(empty)')}
            </p>
          </div>
          
          {/* Incoming */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-600 mb-1">
              {locale === 'sv' ? 'Inkommande' : 'Incoming'}
            </p>
            <p className={`text-sm ${!incomingText ? 'text-gray-400 italic' : ''}`}>
              {incomingText || (locale === 'sv' ? '(tom)' : '(empty)')}
            </p>
          </div>
        </div>
        
        <ResolutionButtons 
          type={conflict.type} 
          resolution={resolution} 
          onResolve={onResolve} 
          locale={locale} 
        />
      </CardContent>
    </Card>
  );
}

/**
 * Role conflict card
 */
export function RoleConflictCard({ 
  conflict, 
  locale, 
  resolution, 
  onResolve 
}: ConflictCardProps & { conflict: RoleConflict }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getTypeLabel(conflict.type, locale);
  
  const role = conflict.current ?? conflict.incoming;
  const title = role?.title ?? (locale === 'sv' ? 'Okänd roll' : 'Unknown role');
  const company = role?.company ?? '';
  const dateRange = role 
    ? `${formatDate(role.start)} – ${role.isCurrent ? (locale === 'sv' ? 'Pågående' : 'Present') : formatDate(role.end)}`
    : '';
  
  return (
    <Card className={`border-l-4 ${resolution ? 'border-l-green-500' : 'border-l-amber-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs text-gray-500">
              {locale === 'sv' ? 'Roll' : 'Role'}
            </span>
          </div>
          {conflict.matchScore && (
            <span className="text-xs text-gray-400">
              {locale === 'sv' ? 'Matchning' : 'Match'}: {Math.round(conflict.matchScore * 100)}%
            </span>
          )}
        </div>
        
        <div className="mb-2">
          <p className="font-medium text-[var(--geisli-secondary)]">{title}</p>
          {company && <p className="text-sm text-gray-600">{company}</p>}
          {dateRange && <p className="text-xs text-gray-500">{dateRange}</p>}
        </div>
        
        {conflict.type === 'modified' && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-[var(--geisli-primary)] hover:underline mb-2"
            >
              {expanded 
                ? (locale === 'sv' ? 'Dölj detaljer' : 'Hide details')
                : (locale === 'sv' ? 'Visa skillnader' : 'Show differences')
              }
            </button>
            
            {expanded && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                {/* Current description */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {locale === 'sv' ? 'Nuvarande beskrivning' : 'Current description'}
                  </p>
                  <p className="text-xs text-gray-700 line-clamp-4">
                    {getText(conflict.current?.description ?? { sv: null, en: null }, locale) || '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {conflict.current?.skills.length ?? 0} {locale === 'sv' ? 'teknologier' : 'technologies'}
                  </p>
                </div>
                
                {/* Incoming description */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 mb-1">
                    {locale === 'sv' ? 'Inkommande beskrivning' : 'Incoming description'}
                  </p>
                  <p className="text-xs text-gray-700 line-clamp-4">
                    {getText(conflict.incoming?.description ?? { sv: null, en: null }, locale) || '—'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {conflict.incoming?.skills.length ?? 0} {locale === 'sv' ? 'teknologier' : 'technologies'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        
        <ResolutionButtons 
          type={conflict.type} 
          resolution={resolution} 
          onResolve={onResolve} 
          locale={locale} 
        />
      </CardContent>
    </Card>
  );
}

/**
 * Skill conflict card
 */
export function SkillConflictCard({ 
  conflict, 
  locale, 
  resolution, 
  onResolve 
}: ConflictCardProps & { conflict: SkillConflict }) {
  const typeInfo = getTypeLabel(conflict.type, locale);
  const skill = conflict.current ?? conflict.incoming;
  const name = skill?.name ?? '?';
  
  return (
    <Card className={`border-l-4 ${resolution ? 'border-l-green-500' : 'border-l-amber-500'}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="font-medium text-[var(--geisli-secondary)]">{name}</span>
        </div>
        
        {conflict.type === 'modified' && (
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="p-2 bg-gray-50 rounded">
              <span className="text-gray-500">{locale === 'sv' ? 'Nuv.' : 'Cur.'}: </span>
              {conflict.current?.years ?? '?'} {locale === 'sv' ? 'år' : 'yrs'}
              {conflict.current?.level && `, Level ${conflict.current.level}`}
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <span className="text-blue-600">{locale === 'sv' ? 'Ink.' : 'Inc.'}: </span>
              {conflict.incoming?.years ?? '?'} {locale === 'sv' ? 'år' : 'yrs'}
              {conflict.incoming?.level && `, Level ${conflict.incoming.level}`}
            </div>
          </div>
        )}
        
        <ResolutionButtons 
          type={conflict.type} 
          resolution={resolution} 
          onResolve={onResolve} 
          locale={locale} 
        />
      </CardContent>
    </Card>
  );
}
