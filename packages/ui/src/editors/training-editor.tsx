'use client';

import { useState } from 'react';
import type { Training, TrainingType, Locale, BilingualText } from '@cvsystem/core';
import { useTrainings, useCVState, useCVActions } from '../store/cv-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BasicMarkdownText } from '../components/BasicMarkdownText';
import { getBilingualText } from '@cvsystem/core';

// Training card component
interface TrainingCardProps {
  training: Training;
  locale: Locale;
  onEdit: () => void;
}

function TrainingCard({ training, locale, onEdit }: TrainingCardProps) {
  const { toggleVisibility, deleteTraining, updateTraining } = useTrainings();
  const { cv } = useCVState();
  const { toggleBreakBefore } = useCVActions();
  const [showDelete, setShowDelete] = useState(false);
  const breakBeforeThis = Boolean(cv?.printBreakBefore?.['courses-certification']?.includes(training.id));
  
  const description = getBilingualText(training.description, locale);
  const typeLabel = training.trainingType === 1 
    ? (locale === 'sv' ? 'Certifiering' : 'Certification')
    : (locale === 'sv' ? 'Kurs' : 'Course');
  
  const expireInfo = training.expireDate 
    ? ` (${locale === 'sv' ? 'giltigt till' : 'valid until'} ${new Date(training.expireDate).getFullYear()})`
    : '';

  return (
    <div className={`p-3 border rounded-lg bg-white ${!training.visible ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              training.trainingType === 1 
                ? 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]' 
                : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
            }`}>
              {typeLabel}
            </span>
            {training.year && (
              <span className="text-xs text-gray-500">{training.year}{expireInfo}</span>
            )}
          </div>
          <p className="font-medium text-[var(--brand-secondary)] mt-1">{training.title}</p>
          {training.issuer && (
            <p className="text-sm text-gray-600">{training.issuer}</p>
          )}
          {description && (
            <div
              className={`text-sm text-gray-500 mt-1 line-clamp-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_li]:my-0.5 ${training.hideDescription ? 'opacity-50 line-through' : ''}`}
            >
              <BasicMarkdownText text={description} className="m-0" />
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={training.hideDescription ?? false}
              onChange={() => updateTraining(training.id, { hideDescription: !(training.hideDescription ?? false) })}
              className="rounded border-gray-300"
            />
            <span>{locale === 'sv' ? 'Dölj beskrivning i utskrift' : 'Hide description in print'}</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={breakBeforeThis}
              onChange={() => toggleBreakBefore('courses-certification', training.id)}
              className="rounded border-gray-300"
            />
            <span>{locale === 'sv' ? 'Ny sida före denna' : 'Start new page before this'}</span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-[var(--brand-primary)] h-8 px-2"
          >
            {locale === 'sv' ? 'Redigera' : 'Edit'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleVisibility(training.id)}
            className={`h-8 px-2 ${training.visible ? 'text-gray-500' : 'text-[var(--brand-accent)]'}`}
            title={training.visible ? 'Hide' : 'Show'}
          >
            {training.visible ? '👁' : '👁‍🗨'}
          </Button>
          {showDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTraining(training.id)}
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

// Add/Edit Training Form
interface TrainingFormProps {
  locale: Locale;
  training?: Training;
  onCancel: () => void;
  onSaved: () => void;
  defaultType?: TrainingType;
}

function TrainingForm({ locale, training, onCancel, onSaved, defaultType = 0 }: TrainingFormProps) {
  const { addTraining, updateTraining } = useTrainings();
  const isEdit = !!training;
  
  const [title, setTitle] = useState(training?.title ?? '');
  const [issuer, setIssuer] = useState(training?.issuer ?? '');
  const [year, setYear] = useState(training?.year?.toString() ?? new Date().getFullYear().toString());
  const [expireDate, setExpireDate] = useState(training?.expireDate ?? '');
  const [url, setUrl] = useState(training?.url ?? '');
  const [trainingType, setTrainingType] = useState<TrainingType>(training?.trainingType ?? defaultType);
  const [hideDescription, setHideDescription] = useState(training?.hideDescription ?? false);
  const [descriptionSv, setDescriptionSv] = useState(training?.description.sv ?? '');
  const [descriptionEn, setDescriptionEn] = useState(training?.description.en ?? '');

  const t = {
    title: locale === 'sv' ? 'Titel' : 'Title',
    issuer: locale === 'sv' ? 'Utfärdare' : 'Issuer',
    year: locale === 'sv' ? 'År' : 'Year',
    expireDate: locale === 'sv' ? 'Utgångsdatum' : 'Expiration date',
    url: locale === 'sv' ? 'Länk' : 'URL',
    type: locale === 'sv' ? 'Typ' : 'Type',
    course: locale === 'sv' ? 'Kurs' : 'Course',
    certification: locale === 'sv' ? 'Certifiering' : 'Certification',
    other: locale === 'sv' ? 'Annat' : 'Other',
    descriptionSv: locale === 'sv' ? 'Beskrivning (svenska)' : 'Description (Swedish)',
    descriptionEn: locale === 'sv' ? 'Beskrivning (engelska)' : 'Description (English)',
    hideDescription: locale === 'sv' ? 'Dölj beskrivning i utskrift' : 'Hide description in print',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    save: locale === 'sv' ? 'Spara' : 'Save',
    add: locale === 'sv' ? 'Lägg till' : 'Add',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      issuer: issuer.trim() || null,
      year: year ? parseInt(year, 10) : null,
      expireDate: expireDate || null,
      url: url.trim() || null,
      trainingType,
      description: {
        sv: descriptionSv.trim() || null,
        en: descriptionEn.trim() || null,
      },
      visible: training?.visible ?? true,
      hideDescription,
    };

    if (isEdit && training) {
      updateTraining(training.id, data);
    } else {
      addTraining(data);
    }
    onSaved();
  };

  return (
    <Card className="border-[var(--brand-primary)] border-2">
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
                value={trainingType}
                onChange={(e) => setTrainingType(parseInt(e.target.value, 10) as TrainingType)}
                className="w-full h-10 px-3 border rounded-md"
              >
                <option value={0}>{t.course}</option>
                <option value={1}>{t.certification}</option>
                <option value={2}>{t.other}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.issuer}</label>
              <Input
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. AWS, Coursera"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.year}</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1900"
                max="2100"
              />
            </div>
          </div>

          {trainingType === 1 && (
            <div>
              <label className="text-sm font-medium text-gray-700">{t.expireDate}</label>
              <Input
                type="date"
                value={expireDate}
                onChange={(e) => setExpireDate(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">{t.url}</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hideDescription}
              onChange={(e) => setHideDescription(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>{t.hideDescription}</span>
          </label>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionSv}</label>
            <Textarea
              value={descriptionSv}
              onChange={(e) => setDescriptionSv(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionEn}</label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button 
              type="submit"
              disabled={!title.trim()}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {isEdit ? t.save : t.add}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Main trainings editor
interface TrainingsEditorProps {
  locale: Locale;
}

export function TrainingsEditor({ locale }: TrainingsEditorProps) {
  const { courses, certifications, trainings } = useTrainings();
  const [showAddForm, setShowAddForm] = useState<TrainingType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const t = {
    title: locale === 'sv' ? 'Kurser & Certifieringar' : 'Courses & Certifications',
    addCourse: locale === 'sv' ? '+ Lägg till kurs' : '+ Add Course',
    addCert: locale === 'sv' ? '+ Lägg till certifiering' : '+ Add Certification',
    certifications: locale === 'sv' ? 'Certifieringar' : 'Certifications',
    courses: locale === 'sv' ? 'Kurser' : 'Courses',
    noCerts: locale === 'sv' ? 'Inga certifieringar' : 'No certifications',
    noCourses: locale === 'sv' ? 'Inga kurser' : 'No courses',
  };

  const editingTraining = editingId ? trainings.find(t => t.id === editingId) : undefined;

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[var(--brand-secondary)]">{t.title}</CardTitle>
            <CardDescription>
              {certifications.length} {t.certifications.toLowerCase()}, {courses.length} {t.courses.toLowerCase()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(0)}
              className="text-[var(--brand-primary)] border-[var(--brand-primary)]"
            >
              {t.addCourse}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(1)}
              className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/90"
            >
              {t.addCert}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm !== null && (
          <TrainingForm
            locale={locale}
            defaultType={showAddForm}
            onCancel={() => setShowAddForm(null)}
            onSaved={() => setShowAddForm(null)}
          />
        )}

        {editingId && editingTraining && (
          <TrainingForm
            locale={locale}
            training={editingTraining}
            onCancel={() => setEditingId(null)}
            onSaved={() => setEditingId(null)}
          />
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t.certifications}</h4>
            <div className="space-y-2">
              {certifications.map((cert) => (
                editingId !== cert.id && (
                  <TrainingCard
                    key={cert.id}
                    training={cert}
                    locale={locale}
                    onEdit={() => setEditingId(cert.id)}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {/* Courses */}
        {courses.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t.courses}</h4>
            <div className="space-y-2">
              {courses.map((course) => (
                editingId !== course.id && (
                  <TrainingCard
                    key={course.id}
                    training={course}
                    locale={locale}
                    onEdit={() => setEditingId(course.id)}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {trainings.length === 0 && showAddForm === null && (
          <p className="text-gray-400 italic text-center py-4">
            {locale === 'sv' ? 'Inga kurser eller certifieringar tillagda.' : 'No courses or certifications added.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
