'use client';

import { useState } from 'react';
import type { Commitment, CommitmentType, Locale, BilingualText } from '@/domain/model/cv';
import { useCommitments } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function getBilingualText(text: BilingualText, locale: Locale): string {
  return text[locale] ?? text[locale === 'sv' ? 'en' : 'sv'] ?? '';
}

function getTypeIcon(type: CommitmentType): string {
  switch (type) {
    case 'presentation': return '🎤';
    case 'publication': return '📄';
    case 'open-source': return '💻';
    case 'volunteer': return '🤝';
    default: return '📌';
  }
}

function getTypeLabel(type: CommitmentType, locale: Locale): string {
  switch (type) {
    case 'presentation': return locale === 'sv' ? 'Presentation' : 'Presentation';
    case 'publication': return locale === 'sv' ? 'Publikation' : 'Publication';
    case 'open-source': return locale === 'sv' ? 'Open Source' : 'Open Source';
    case 'volunteer': return locale === 'sv' ? 'Volontärarbete' : 'Volunteer';
    default: return locale === 'sv' ? 'Annat' : 'Other';
  }
}

// Commitment card component
interface CommitmentCardProps {
  commitment: Commitment;
  locale: Locale;
  onEdit: () => void;
}

function CommitmentCard({ commitment, locale, onEdit }: CommitmentCardProps) {
  const { toggleVisibility, deleteCommitment } = useCommitments();
  const [showDelete, setShowDelete] = useState(false);
  
  const description = getBilingualText(commitment.description, locale);
  const icon = getTypeIcon(commitment.commitmentType);
  const typeLabel = getTypeLabel(commitment.commitmentType, locale);

  return (
    <div className={`p-3 border rounded-lg bg-white ${!commitment.visible ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-xs text-[var(--geisli-primary)]">{typeLabel}</span>
            {commitment.date && (
              <span className="text-xs text-gray-500">{commitment.date}</span>
            )}
          </div>
          <p className="font-medium text-[var(--geisli-secondary)] mt-1">{commitment.title}</p>
          {commitment.venue && (
            <p className="text-sm text-gray-600">{commitment.venue}</p>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
          )}
          {commitment.url && (
            <a 
              href={commitment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-[var(--geisli-primary)] hover:underline mt-1 inline-block"
            >
              {locale === 'sv' ? 'Visa länk →' : 'View link →'}
            </a>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-[var(--geisli-primary)] h-8 px-2"
          >
            {locale === 'sv' ? 'Redigera' : 'Edit'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleVisibility(commitment.id)}
            className={`h-8 px-2 ${commitment.visible ? 'text-gray-500' : 'text-[var(--geisli-accent)]'}`}
            title={commitment.visible ? 'Hide' : 'Show'}
          >
            {commitment.visible ? '👁' : '👁‍🗨'}
          </Button>
          {showDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteCommitment(commitment.id)}
              className="text-red-600 h-8 px-2"
            >
              {locale === 'sv' ? 'Bekräfta' : 'Confirm'}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDelete(true)}
              className="text-gray-400 hover:text-red-600 h-8 px-2"
            >
              🗑
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Add/Edit Commitment Form
interface CommitmentFormProps {
  locale: Locale;
  commitment?: Commitment;
  onCancel: () => void;
  onSaved: () => void;
  defaultType?: CommitmentType;
}

function CommitmentForm({ locale, commitment, onCancel, onSaved, defaultType = 'presentation' }: CommitmentFormProps) {
  const { addCommitment, updateCommitment } = useCommitments();
  const isEdit = !!commitment;
  
  const [title, setTitle] = useState(commitment?.title ?? '');
  const [commitmentType, setCommitmentType] = useState<CommitmentType>(commitment?.commitmentType ?? defaultType);
  const [venue, setVenue] = useState(commitment?.venue ?? '');
  const [date, setDate] = useState(commitment?.date ?? '');
  const [url, setUrl] = useState(commitment?.url ?? '');
  const [descriptionSv, setDescriptionSv] = useState(commitment?.description.sv ?? '');
  const [descriptionEn, setDescriptionEn] = useState(commitment?.description.en ?? '');

  const t = {
    title: locale === 'sv' ? 'Titel' : 'Title',
    type: locale === 'sv' ? 'Typ' : 'Type',
    presentation: locale === 'sv' ? 'Presentation' : 'Presentation',
    publication: locale === 'sv' ? 'Publikation' : 'Publication',
    openSource: 'Open Source',
    volunteer: locale === 'sv' ? 'Volontärarbete' : 'Volunteer',
    other: locale === 'sv' ? 'Annat' : 'Other',
    venue: locale === 'sv' ? 'Plats/Event' : 'Venue/Event',
    date: locale === 'sv' ? 'Datum' : 'Date',
    url: locale === 'sv' ? 'Länk' : 'URL',
    descriptionSv: locale === 'sv' ? 'Beskrivning (svenska)' : 'Description (Swedish)',
    descriptionEn: locale === 'sv' ? 'Beskrivning (engelska)' : 'Description (English)',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    save: locale === 'sv' ? 'Spara' : 'Save',
    add: locale === 'sv' ? 'Lägg till' : 'Add',
    venuePlaceholder: commitmentType === 'presentation' 
      ? 'ReactConf 2024' 
      : commitmentType === 'publication' 
        ? 'Medium, Dev.to' 
        : 'GitHub',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      commitmentType,
      venue: venue.trim() || null,
      date: date || null,
      url: url.trim() || null,
      description: {
        sv: descriptionSv.trim() || null,
        en: descriptionEn.trim() || null,
      },
      visible: commitment?.visible ?? true,
    };

    if (isEdit && commitment) {
      updateCommitment(commitment.id, data);
    } else {
      addCommitment(data);
    }
    onSaved();
  };

  return (
    <Card className="border-[var(--geisli-primary)] border-2">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-gray-700">{t.title} *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-gray-700">{t.type}</label>
              <select
                value={commitmentType}
                onChange={(e) => setCommitmentType(e.target.value as CommitmentType)}
                className="w-full h-10 px-3 border rounded-md"
              >
                <option value="presentation">{t.presentation}</option>
                <option value="publication">{t.publication}</option>
                <option value="open-source">{t.openSource}</option>
                <option value="volunteer">{t.volunteer}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.venue}</label>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={t.venuePlaceholder}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.date}</label>
              <Input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2024, Jan 2024, etc."
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.url}</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionSv}</label>
            <Textarea
              value={descriptionSv}
              onChange={(e) => setDescriptionSv(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionEn}</label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button 
              type="submit"
              disabled={!title.trim()}
              className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
            >
              {isEdit ? t.save : t.add}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Main commitments editor
interface CommitmentsEditorProps {
  locale: Locale;
}

export function CommitmentsEditor({ locale }: CommitmentsEditorProps) {
  const { commitments, presentations, publications, visibleCommitments } = useCommitments();
  const [showAddForm, setShowAddForm] = useState<CommitmentType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const t = {
    title: locale === 'sv' ? 'Presentationer & Publikationer' : 'Presentations & Publications',
    addPresentation: locale === 'sv' ? '+ Presentation' : '+ Presentation',
    addPublication: locale === 'sv' ? '+ Publikation' : '+ Publication',
    addOther: locale === 'sv' ? '+ Annat' : '+ Other',
    visible: locale === 'sv' ? 'synliga' : 'visible',
    noItems: locale === 'sv' ? 'Inga presentationer eller publikationer tillagda.' : 'No presentations or publications added.',
  };

  const editingCommitment = editingId ? commitments.find(c => c.id === editingId) : undefined;

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[var(--geisli-secondary)]">{t.title}</CardTitle>
            <CardDescription>
              {visibleCommitments.length} {t.visible}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm('presentation')}
              className="text-[var(--geisli-primary)] border-[var(--geisli-primary)]"
            >
              {t.addPresentation}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm('publication')}
              className="text-[var(--geisli-primary)] border-[var(--geisli-primary)]"
            >
              {t.addPublication}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAddForm && (
          <CommitmentForm
            locale={locale}
            defaultType={showAddForm}
            onCancel={() => setShowAddForm(null)}
            onSaved={() => setShowAddForm(null)}
          />
        )}

        {editingId && editingCommitment && (
          <CommitmentForm
            locale={locale}
            commitment={editingCommitment}
            onCancel={() => setEditingId(null)}
            onSaved={() => setEditingId(null)}
          />
        )}

        {commitments.length === 0 && !showAddForm ? (
          <p className="text-gray-400 italic text-center py-4">{t.noItems}</p>
        ) : (
          <div className="space-y-2">
            {commitments.map((c) => (
              editingId !== c.id && (
                <CommitmentCard
                  key={c.id}
                  commitment={c}
                  locale={locale}
                  onEdit={() => setEditingId(c.id)}
                />
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
