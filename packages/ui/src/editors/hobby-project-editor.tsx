"use client";

import { useState } from "react";
import type { HobbyProject, Locale } from '@cvsystem/core';
import {
  useCVActions,
  useCVState,
  useHobbyProjects,
} from '../store/cv-store';
import { isAlphabeticalOrder } from '../store/role-helpers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { BasicMarkdownText } from '../components/BasicMarkdownText';
import { getBilingualText, formatDate } from '@cvsystem/core';
import { SkillsSection } from '../components/cv/SkillsSection';

function HobbyProjectCard({
  project,
  locale,
  isEditing,
  onToggleEdit,
}: {
  project: HobbyProject;
  locale: Locale;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const {
    updateHobbyProject,
    toggleVisibility,
    deleteHobbyProject,
    removeHobbyProjectSkill,
    toggleHobbyProjectSkillVisibility,
    updateHobbyProjectSkillLevel,
    reorderHobbyProjectSkills,
    resetHobbyProjectSkillsToAlphabetical,
    addExistingSkillToHobbyProject,
  } = useHobbyProjects();
  const { cv } = useCVState();
  const { toggleBreakBefore } = useCVActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const breakBeforeThis = Boolean(
    cv?.printBreakBefore?.["hobby-projects"]?.includes(project.id),
  );
  const dateRange = [
    formatDate(project.start),
    project.isCurrent
      ? locale === "sv"
        ? "Pågående"
        : "Present"
      : formatDate(project.end),
  ]
    .filter(Boolean)
    .join(" – ");
  const description = getBilingualText(project.description, locale);
  const needsExpansion = description.length > 300;

  const handleDescriptionChange = (value: string) => {
    updateHobbyProject(project.id, {
      description: {
        ...project.description,
        [locale]: value,
      },
    });
  };

  return (
    <Card
      className={`transition-opacity border-none shadow-lg bg-white ${!project.visible ? "opacity-50" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleVisibility(project.id)}
              className={`text-lg transition-colors ${project.visible ? "text-[var(--brand-primary)]" : "text-gray-400"}`}
              title={
                project.visible
                  ? locale === "sv"
                    ? "Synlig i export"
                    : "Visible in export"
                  : locale === "sv"
                    ? "Dold i export"
                    : "Hidden in export"
              }
            >
              {project.visible ? "👁" : "👁‍🗨"}
            </button>

            <div>
              <h4 className="font-semibold text-[var(--brand-secondary)]">
                {project.title ||
                  (locale === "sv" ? "Namnlöst projekt" : "Untitled project")}
              </h4>
              {project.url ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--brand-primary)] hover:underline"
                >
                  {project.url}
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={breakBeforeThis}
                onChange={() => toggleBreakBefore("hobby-projects", project.id)}
                className="rounded border-gray-300"
              />
              <span>
                {locale === "sv"
                  ? "Ny sida före denna"
                  : "Start new page before this"}
              </span>
            </label>
            {dateRange ? (
              <span className="text-sm text-[var(--brand-primary)]">
                {dateRange}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEdit}
              className="text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
            >
              {isEditing
                ? locale === "sv"
                  ? "Klar"
                  : "Done"
                : locale === "sv"
                  ? "Redigera"
                  : "Edit"}
            </Button>
            {showDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteHobbyProject(project.id)}
                className="text-red-600 hover:bg-red-50"
              >
                {locale === "sv" ? "Bekräfta" : "Confirm"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-gray-400 hover:text-red-600"
              >
                🗑
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "Titel" : "Title"}
              </label>
              <Input
                value={project.title ?? ""}
                onChange={(e) =>
                  updateHobbyProject(project.id, {
                    title: e.target.value || null,
                  })
                }
                placeholder={
                  locale === "sv"
                    ? "T.ex. Open source-projekt"
                    : "e.g. Open source project"
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "URL / Repo" : "URL / Repo"}
              </label>
              <Input
                value={project.url ?? ""}
                onChange={(e) =>
                  updateHobbyProject(project.id, {
                    url: e.target.value || null,
                  })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "Startdatum" : "Start date"}
              </label>
              <Input
                type="date"
                value={project.start ?? ""}
                onChange={(e) =>
                  updateHobbyProject(project.id, {
                    start: e.target.value || null,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "Slutdatum" : "End date"}
              </label>
              <Input
                type="date"
                value={project.end ?? ""}
                disabled={project.isCurrent}
                onChange={(e) =>
                  updateHobbyProject(project.id, {
                    end: e.target.value || null,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={project.isCurrent ?? false}
                onChange={(e) =>
                  updateHobbyProject(project.id, {
                    isCurrent: e.target.checked,
                    end: e.target.checked ? null : (project.end ?? null),
                  })
                }
                className="rounded border-gray-300"
              />
              <span>
                {locale === "sv" ? "Pågående projekt" : "Ongoing project"}
              </span>
            </label>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "Beskrivning" : "Description"}
              </label>
              <Textarea
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                rows={10}
                className="text-sm"
              />
            </div>
          </div>
        ) : description ? (
          <div>
            <div
              className={`text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_li]:my-0.5 ${!isExpanded && needsExpansion ? "line-clamp-4" : ""}`}
            >
              <BasicMarkdownText text={description} className="m-0" />
            </div>
            {needsExpansion ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-sm text-[var(--brand-primary)] hover:underline"
              >
                {isExpanded
                  ? locale === "sv"
                    ? "▲ Visa mindre"
                    : "▲ Show less"
                  : locale === "sv"
                    ? "▼ Visa mer"
                    : "▼ Show more"}
              </button>
            ) : null}
          </div>
        ) : null}

        <SkillsSection
          skills={project.skills}
          skillOrder={project.skillOrder}
          locale={locale}
          editable={isEditing}
          canResetOrder={isEditing && project.skills.length > 0 && !isAlphabeticalOrder(project)}
          graphContext={{ type: "hobby", projectId: project.id }}
          onRemove={(skillId) => removeHobbyProjectSkill(project.id, skillId)}
          onToggleVisibility={(skillId) => toggleHobbyProjectSkillVisibility(project.id, skillId)}
          onLevelChange={(skillId, level) => updateHobbyProjectSkillLevel(project.id, skillId, level)}
          onReorder={(ids) => reorderHobbyProjectSkills(project.id, ids)}
          onResetOrder={() => resetHobbyProjectSkillsToAlphabetical(project.id)}
          onAddSkill={(skill) => addExistingSkillToHobbyProject(project.id, skill)}
        />
      </CardContent>
    </Card>
  );
}

function AddHobbyProjectForm({
  locale,
  onCancel,
  onAdded,
}: {
  locale: Locale;
  onCancel: () => void;
  onAdded: () => void;
}) {
  const { addHobbyProject } = useHobbyProjects();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [descriptionSv, setDescriptionSv] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addHobbyProject({
      title: title.trim(),
      url: url.trim() || null,
      start: startDate || null,
      end: isCurrent ? null : endDate || null,
      isCurrent,
      description: {
        sv: descriptionSv.trim() || null,
        en: descriptionEn.trim() || null,
      },
      skills: [],
      visible: true,
    });

    onAdded();
  };

  return (
    <Card className="border-[var(--brand-primary)] border-2">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              {locale === "sv" ? "Titel" : "Title"} *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                locale === "sv" ? "T.ex. Hobbyprojekt" : "e.g. Hobby project"
              }
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              URL / Repo
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "Startdatum" : "Start date"}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                {locale === "sv" ? "Slutdatum" : "End date"}
              </label>
              <Input
                type="date"
                value={endDate}
                disabled={isCurrent}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>
              {locale === "sv" ? "Pågående projekt" : "Ongoing project"}
            </span>
          </label>

          <div>
            <label className="text-sm font-medium text-gray-700">
              {locale === "sv"
                ? "Beskrivning (svenska)"
                : "Description (Swedish)"}
            </label>
            <Textarea
              value={descriptionSv}
              onChange={(e) => setDescriptionSv(e.target.value)}
              rows={5}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              {locale === "sv"
                ? "Beskrivning (engelska)"
                : "Description (English)"}
            </label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {locale === "sv" ? "Avbryt" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {locale === "sv" ? "Lägg till" : "Add"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface HobbyProjectsEditorProps {
  locale: Locale;
}

export function HobbyProjectsEditor({ locale }: HobbyProjectsEditorProps) {
  const { hobbyProjects } = useHobbyProjects();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const visibleCount = hobbyProjects.filter((p) => p.visible).length;
  const hiddenCount = hobbyProjects.length - visibleCount;
  const sortedProjects = [...hobbyProjects].sort((a, b) => {
    const dateA = a.start ? new Date(a.start).getTime() : 0;
    const dateB = b.start ? new Date(b.start).getTime() : 0;
    if (dateA === dateB) {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      const endA = a.end ? new Date(a.end).getTime() : 0;
      const endB = b.end ? new Date(b.end).getTime() : 0;
      return endB - endA;
    }
    return dateB - dateA;
  });

  const t = {
    title: locale === "sv" ? "Hobbyprojekt" : "Hobby projects",
    addProject: locale === "sv" ? "+ Lägg till projekt" : "+ Add project",
    visible: locale === "sv" ? "synliga" : "visible",
    hidden: locale === "sv" ? "dolda" : "hidden",
    none:
      locale === "sv"
        ? "Inga hobbyprojekt tillagda."
        : "No hobby projects added.",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--brand-secondary)]">
          {t.title}
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {visibleCount} {t.visible}
            {hiddenCount > 0 ? (
              <span className="text-[var(--brand-accent)]">{`, ${hiddenCount} ${t.hidden}`}</span>
            ) : null}
          </span>
          {!showAddForm ? (
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t.addProject}
            </Button>
          ) : null}
        </div>
      </div>

      {showAddForm ? (
        <AddHobbyProjectForm
          locale={locale}
          onCancel={() => setShowAddForm(false)}
          onAdded={() => setShowAddForm(false)}
        />
      ) : null}

      {hobbyProjects.length === 0 && !showAddForm ? (
        <p className="text-gray-400 italic">{t.none}</p>
      ) : (
        <div className="space-y-4">
          {sortedProjects.map((project) => (
            <HobbyProjectCard
              key={project.id}
              project={project}
              locale={locale}
              isEditing={editingProjectId === project.id}
              onToggleEdit={() =>
                setEditingProjectId(
                  editingProjectId === project.id ? null : project.id,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
