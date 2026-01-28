'use client';

import { useState } from 'react';
import type { Education, Locale, BilingualText } from '@/domain/model/cv';
import { useEducations } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function getBilingualText(text: BilingualText, locale: Locale): string {
  return text[locale] ?? text[locale === 'sv' ? 'en' : 'sv'] ?? '';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.getFullYear().toString();
  } catch {
    return dateStr;
  }
}

// Education card component
interface EducationCardProps {
  education: Education;
  locale: Locale;
  onEdit: () => void;
}

function EducationCard({ education, locale, onEdit }: EducationCardProps) {
  const { toggleVisibility, deleteEducation } = useEducations();
  const [showDelete, setShowDelete] = useState(false);
  
  const description = getBilingualText(education.description, locale);
  const dateRange = [
    formatDate(education.startDate),
    education.ongoing ? (locale === 'sv' ? 'Pågående' : 'Ongoing') : formatDate(education.endDate),
  ].filter(Boolean).join(' – ');

  return (
    <div className={`p-3 border rounded-lg bg-white ${!education.visible ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {education.degree && <span className="text-[var(--geisli-primary)]">{education.degree}</span>}
            {dateRange && <span>{dateRange}</span>}
          </div>
          <p className="font-medium text-[var(--geisli-secondary)]">
            {education.programName || education.schoolName}
          </p>
          {education.programName && (
            <p className="text-sm text-gray-600">{education.schoolName}</p>
          )}
          {education.location && (
            <p className="text-xs text-gray-500">{education.location}</p>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
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
            onClick={() => toggleVisibility(education.id)}
            className={`h-8 px-2 ${education.visible ? 'text-gray-500' : 'text-[var(--geisli-accent)]'}`}
            title={education.visible ? 'Hide' : 'Show'}
          >
            {education.visible ? '👁' : '👁‍🗨'}
          </Button>
          {showDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteEducation(education.id)}
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

// Add/Edit Education Form
interface EducationFormProps {
  locale: Locale;
  education?: Education;
  onCancel: () => void;
  onSaved: () => void;
}

function EducationForm({ locale, education, onCancel, onSaved }: EducationFormProps) {
  const { addEducation, updateEducation } = useEducations();
  const isEdit = !!education;
  
  const [schoolName, setSchoolName] = useState(education?.schoolName ?? '');
  const [programName, setProgramName] = useState(education?.programName ?? '');
  const [degree, setDegree] = useState(education?.degree ?? '');
  const [location, setLocation] = useState(education?.location ?? '');
  const [startDate, setStartDate] = useState(education?.startDate?.split('T')[0] ?? '');
  const [endDate, setEndDate] = useState(education?.endDate?.split('T')[0] ?? '');
  const [ongoing, setOngoing] = useState(education?.ongoing ?? false);
  const [url, setUrl] = useState(education?.url ?? '');
  const [descriptionSv, setDescriptionSv] = useState(education?.description.sv ?? '');
  const [descriptionEn, setDescriptionEn] = useState(education?.description.en ?? '');

  const t = {
    schoolName: locale === 'sv' ? 'Skola/Universitet' : 'School/University',
    programName: locale === 'sv' ? 'Program' : 'Program',
    degree: locale === 'sv' ? 'Examen' : 'Degree',
    location: locale === 'sv' ? 'Plats' : 'Location',
    startDate: locale === 'sv' ? 'Startdatum' : 'Start date',
    endDate: locale === 'sv' ? 'Slutdatum' : 'End date',
    ongoing: locale === 'sv' ? 'Pågående' : 'Ongoing',
    url: locale === 'sv' ? 'Länk' : 'URL',
    descriptionSv: locale === 'sv' ? 'Beskrivning (svenska)' : 'Description (Swedish)',
    descriptionEn: locale === 'sv' ? 'Beskrivning (engelska)' : 'Description (English)',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    save: locale === 'sv' ? 'Spara' : 'Save',
    add: locale === 'sv' ? 'Lägg till' : 'Add',
    degreePlaceholder: 'M.Sc., B.Sc., PhD, etc.',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) return;

    const data = {
      schoolName: schoolName.trim(),
      programName: programName.trim() || null,
      degree: degree.trim() || null,
      location: location.trim() || null,
      startDate: startDate || null,
      endDate: ongoing ? null : (endDate || null),
      ongoing,
      url: url.trim() || null,
      description: {
        sv: descriptionSv.trim() || null,
        en: descriptionEn.trim() || null,
      },
      visible: education?.visible ?? true,
    };

    if (isEdit && education) {
      updateEducation(education.id, data);
    } else {
      addEducation(data);
    }
    onSaved();
  };

  return (
    <Card className="border-[var(--geisli-primary)] border-2">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-gray-700">{t.schoolName} *</label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Uppsala University"
                required
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-gray-700">{t.programName}</label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.degree}</label>
              <Input
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder={t.degreePlaceholder}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.location}</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Uppsala, Sweden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.startDate}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.endDate}</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={ongoing}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ongoing"
              checked={ongoing}
              onChange={(e) => setOngoing(e.target.checked)}
              className="h-4 w-4 text-[var(--geisli-primary)]"
            />
            <label htmlFor="ongoing" className="text-sm text-gray-700">
              {t.ongoing}
            </label>
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
              disabled={!schoolName.trim()}
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

// Main education editor
interface EducationEditorProps {
  locale: Locale;
}

export function EducationEditor({ locale }: EducationEditorProps) {
  const { educations, visibleEducations } = useEducations();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const t = {
    title: locale === 'sv' ? 'Utbildning' : 'Education',
    add: locale === 'sv' ? '+ Lägg till utbildning' : '+ Add Education',
    visible: locale === 'sv' ? 'synlig' : 'visible',
    noEducation: locale === 'sv' ? 'Ingen utbildning tillagd.' : 'No education added.',
  };

  const editingEducation = editingId ? educations.find(e => e.id === editingId) : undefined;

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[var(--geisli-secondary)]">{t.title}</CardTitle>
            <CardDescription>
              {visibleEducations.length} {t.visible}
            </CardDescription>
          </div>
          {!showAddForm && (
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
            >
              {t.add}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAddForm && (
          <EducationForm
            locale={locale}
            onCancel={() => setShowAddForm(false)}
            onSaved={() => setShowAddForm(false)}
          />
        )}

        {editingId && editingEducation && (
          <EducationForm
            locale={locale}
            education={editingEducation}
            onCancel={() => setEditingId(null)}
            onSaved={() => setEditingId(null)}
          />
        )}

        {educations.length === 0 && !showAddForm ? (
          <p className="text-gray-400 italic text-center py-4">{t.noEducation}</p>
        ) : (
          <div className="space-y-2">
            {educations.map((edu) => (
              editingId !== edu.id && (
                <EducationCard
                  key={edu.id}
                  education={edu}
                  locale={locale}
                  onEdit={() => setEditingId(edu.id)}
                />
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
