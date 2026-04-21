"use client";

/**
 * Renders a single content block for print (and for measurement).
 * Used by PrintMeasurementRoot and by the final print page renderer.
 */

import type {
  DomainCV,
  Locale,
  BilingualText,
  Skill,
  Role,
  RoleSkill,
  RenderSpec,
  HobbyProject,
  Training,
  Education,
  Commitment,
  FeaturedProject,
} from "@/domain/model/cv";
import type { ContentBlockSpec } from "@/lib/print-layout-engine-types";
import { BasicMarkdownText } from "@/components/BasicMarkdownText";
import { getBilingualText } from "@/lib/format";
import { resolveRoleSkills, type RenderedRoleSkill } from "@/lib/render-spec";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const str = date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
    });
    const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
    return capitalized.replace(/\.$/, "");
  } catch {
    return dateStr;
  }
}

function PrintSkill({ skill }: { skill: Skill }) {
  return (
    <span className="print-skill">
      {skill.name}
      {skill.level != null && (
        <span className="skill-level"> ({skill.level}/5)</span>
      )}
      {skill.years != null && skill.years > 0 && (
        <span className="skill-years"> • {skill.years}y</span>
      )}
    </span>
  );
}

/**
 * Comma-separated list of role skill names. Receives pre-resolved skills from
 * resolveRoleSkills so grouped skills appear as a single entry (e.g. ".NET").
 */
function RoleSkillsList({ skills }: { skills: RenderedRoleSkill[] }) {
  if (skills.length === 0) return null;
  return (
    <p className="role-skills">
      {skills.map((skill, idx) => (
        <span key={skill.displayName}>
          {idx > 0 && ", "}
          {skill.displayName}
        </span>
      ))}
    </p>
  );
}

function PrintRoleHeader({ role, locale, resolvedSkills }: { role: Role; locale: Locale; resolvedSkills: RenderedRoleSkill[] }) {
  const dateRange = [
    formatDate(role.start),
    role.isCurrent
      ? locale === "sv"
        ? "Pågående"
        : "Present"
      : formatDate(role.end),
  ]
    .filter(Boolean)
    .join(" – ");
  return (
    <div className="print-role print-role--header-only">
      <div className="role-meta">
        {dateRange && <span className="role-date">{dateRange}</span>}
        {role.company && <span className="role-company">{role.company}</span>}
      </div>
      <div className="role-content">
        <h3 className="role-title">{role.title || "Untitled Role"}</h3>
        <RoleSkillsList skills={resolvedSkills} />
      </div>
    </div>
  );
}

function PrintRoleHeaderWithFirstParagraph({
  role,
  locale,
  firstParagraphText,
  showSkills,
  resolvedSkills,
}: {
  role: Role;
  locale: Locale;
  firstParagraphText: string;
  showSkills?: boolean;
  resolvedSkills: RenderedRoleSkill[];
}) {
  const dateRange = [
    formatDate(role.start),
    role.isCurrent
      ? locale === "sv"
        ? "Pågående"
        : "Present"
      : formatDate(role.end),
  ]
    .filter(Boolean)
    .join(" – ");
  return (
    <div className="print-role print-role--header-and-first-p">
      <div className="role-meta">
        {dateRange && <span className="role-date">{dateRange}</span>}
        {role.company && <span className="role-company">{role.company}</span>}
      </div>
      <div className="role-content">
        <h3 className="role-title">{role.title || "Untitled Role"}</h3>
        <BasicMarkdownText
          text={firstParagraphText}
          className="role-description"
        />
        {showSkills && <RoleSkillsList skills={resolvedSkills} />}
      </div>
    </div>
  );
}

function PrintRoleParagraph({
  text,
  resolvedSkills,
}: {
  text: string;
  resolvedSkills?: RenderedRoleSkill[]; // only provided on the last paragraph
}) {
  return (
    <div className="print-role print-role--paragraph-only">
      <div className="role-meta" aria-hidden="true" />
      <div className="role-content">
        <BasicMarkdownText text={text} className="role-description" />
        {resolvedSkills && <RoleSkillsList skills={resolvedSkills} />}
      </div>
    </div>
  );
}

function PrintRoleListItem({
  itemText,
  resolvedSkills,
  isFirstItem,
}: {
  itemText: string;
  resolvedSkills?: RenderedRoleSkill[]; // only provided on the last list item
  isFirstItem: boolean;
}) {
  return (
    <div className="print-role print-role--list-item-only">
      <div className="role-meta" aria-hidden="true" />
      <div className="role-content">
        <ul
          className="role-description"
          style={{ listStyle: "disc", paddingLeft: "1.5em", margin: 0 }}
        >
          <li>
            <BasicMarkdownText text={itemText} className="m-0" />
          </li>

        </ul>
        {resolvedSkills && <RoleSkillsList skills={resolvedSkills} />}
      </div>
    </div>
  );
}

function PrintRole({ role, locale, resolvedSkills }: { role: Role; locale: Locale; resolvedSkills: RenderedRoleSkill[] }) {
  const dateRange = [
    formatDate(role.start),
    role.isCurrent
      ? locale === "sv"
        ? "Pågående"
        : "Present"
      : formatDate(role.end),
  ]
    .filter(Boolean)
    .join(" – ");
  const description = getBilingualText(role.description, locale);
  return (
    <div className="print-role">
      <div className="role-meta">
        {dateRange && <span className="role-date">{dateRange}</span>}
        {role.company && <span className="role-company">{role.company}</span>}
      </div>
      <div className="role-content">
        <h3 className="role-title">{role.title || "Untitled Role"}</h3>
        {description && (
          <BasicMarkdownText text={description} className="role-description" />
        )}
        <RoleSkillsList skills={resolvedSkills} />
      </div>
    </div>
  );
}

function PrintHobbyProject({
  project,
  locale,
  resolvedSkills,
}: {
  project: HobbyProject;
  locale: Locale;
  resolvedSkills: RenderedRoleSkill[];
}) {
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

  return (
    <div className="print-role">
      <div className="role-meta">
        {dateRange && <span className="role-date">{dateRange}</span>}
        {project.url && <span className="role-company">{project.url}</span>}
      </div>
      <div className="role-content">
        <h3 className="role-title">
          {project.title ||
            (locale === "sv" ? "Namnlöst projekt" : "Untitled project")}
        </h3>
        {description && (
          <BasicMarkdownText text={description} className="role-description" />
        )}
        <RoleSkillsList skills={resolvedSkills} />
      </div>
    </div>
  );
}

function PrintEducation({
  education,
  locale,
}: {
  education: Education;
  locale: Locale;
}) {
  const dateRange = [
    education.startDate
      ? new Date(education.startDate).getFullYear().toString()
      : "",
    education.ongoing
      ? locale === "sv"
        ? "Pågående"
        : "Ongoing"
      : education.endDate
        ? new Date(education.endDate).getFullYear().toString()
        : "",
  ]
    .filter(Boolean)
    .join(" – ");
  const description = getBilingualText(education.description, locale);
  const schoolName = education.programName ? education.schoolName : null;
  return (
    <div className="print-education">
      <div className="education-meta">
        {dateRange && <span className="education-date">{dateRange}</span>}
        {schoolName && <span className="education-school">{schoolName}</span>}
      </div>
      <div className="education-content">
        <h3 className="education-program">
          {education.degree && `${education.degree} `}
          {education.programName || education.schoolName}
        </h3>
        {description && !education.hideDescription && (
          <BasicMarkdownText
            text={description}
            className="education-description"
          />
        )}
      </div>
    </div>
  );
}

function PrintTraining({
  training,
  locale,
}: {
  training: Training;
  locale: Locale;
}) {
  const typeLabel =
    training.trainingType === 1
      ? locale === "sv"
        ? "Certifiering"
        : "Certification"
      : "";
  const description = getBilingualText(training.description, locale);
  return (
    <div className="print-training">
      <div className="training-meta">
        {training.year != null && (
          <span className="training-year">{training.year}</span>
        )}
        {training.issuer && (
          <span className="training-issuer">{training.issuer}</span>
        )}
      </div>
      <div className="training-content">
        <span className="training-title">{training.title}</span>
        {typeLabel && <span className="training-type"> [{typeLabel}]</span>}
        {description && !training.hideDescription && (
          <BasicMarkdownText
            text={description}
            className="training-description"
          />
        )}
      </div>
    </div>
  );
}

function PrintCommitment({
  commitment,
  locale,
}: {
  commitment: Commitment;
  locale: Locale;
}) {
  const typeIcon =
    commitment.commitmentType === "presentation"
      ? "🎤 "
      : commitment.commitmentType === "publication"
        ? "📄 "
        : "";
  const description = getBilingualText(commitment.description, locale);
  return (
    <div className="print-commitment">
      <span className="commitment-title">
        {typeIcon}
        {commitment.title}
      </span>
      {commitment.venue && (
        <span className="commitment-venue"> – {commitment.venue}</span>
      )}
      {commitment.date && (
        <span className="commitment-date"> ({commitment.date})</span>
      )}
      {description && (
        <BasicMarkdownText
          text={description}
          className="commitment-description"
        />
      )}
    </div>
  );
}

/** Cover intro payload shape (from buildSectionsFromCv) */
interface CoverIntroPayload {
  cvId: string;
  name: DomainCV["name"];
  title: BilingualText;
  summary: BilingualText;
  contacts: DomainCV["contacts"];
  coverPageGroups: DomainCV["coverPageGroups"];
  featuredProjects: FeaturedProject[];
  photoDataUrl: string | null;
}

function CoverIntro({
  payload,
  locale,
}: {
  payload: CoverIntroPayload;
  locale: Locale;
}) {
  const title = getBilingualText(payload.title, locale);
  const summary = getBilingualText(payload.summary, locale);
  const contacts = payload.contacts ?? {
    email: null,
    phone: null,
    address: null,
    website: null,
  };
  const featuredProjects = payload.featuredProjects ?? [];

  return (
    <div className="cv-cover-main">
      <header className="cv-header">
        {payload.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={payload.photoDataUrl}
            alt={
              `${payload.name.first ?? ""} ${payload.name.last ?? ""}`.trim() ||
              "Profile photo"
            }
            className="cv-photo"
          />
        ) : null}
        <h1 className="cv-name">
          {payload.name.first} {payload.name.last}
        </h1>
        {title && <p className="cv-title">{title}</p>}
        {(contacts.email ||
          contacts.phone ||
          contacts.address ||
          contacts.website) && (
          <div className="cv-contacts">
            {contacts.email && (
              <span className="cv-contactItem">{contacts.email}</span>
            )}
            {contacts.phone && (
              <span className="cv-contactItem">{contacts.phone}</span>
            )}
            {contacts.address && (
              <span className="cv-contactItem">{contacts.address}</span>
            )}
            {contacts.website && (
              <span className="cv-contactItem">{contacts.website}</span>
            )}
          </div>
        )}
      </header>
      {summary && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === "sv" ? "Sammanfattning" : "Summary"}
          </h2>
          <BasicMarkdownText text={summary} className="summary-text" />
        </section>
      )}
      {featuredProjects.length > 0 && (
        <section className="cv-section cv-section--featured-projects">
          <h2 className="section-title">
            {locale === "sv" ? "Utvalda projekt" : "Featured projects"}
          </h2>
          <div className="featured-projects-container">
            {featuredProjects.map((project) => {
              const desc = getBilingualText(project.description, locale);
              const customerLocation = project.company ?? "";
              const roleTitle = project.roleTitle ?? "";
              return (
                <div key={project.id} className="featured-project-item">
                  {customerLocation ? (
                    <p className="featured-project-customer">
                      {customerLocation}
                    </p>
                  ) : null}
                  {roleTitle ? (
                    <p className="featured-project-role">{roleTitle}</p>
                  ) : null}
                  {desc ? (
                    <BasicMarkdownText
                      text={desc}
                      className="featured-project-desc"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

const COMPETENCE_CATEGORY_LABELS: Record<
  "medel" | "hog" | "mycket_hog",
  { sv: string; en: string }
> = {
  medel: { sv: "Medel", en: "Medium" },
  hog: { sv: "Hög", en: "High" },
  mycket_hog: { sv: "Mycket Hög", en: "Very high" },
};

function PrintSkillGroup({
  category,
  skillIds,
  cv,
  locale,
}: {
  category: "medel" | "hog" | "mycket_hog";
  skillIds: string[];
  cv: DomainCV;
  locale: Locale;
}) {
  const skills = skillIds
    .map((id) => cv.skills.find((s) => s.id === id))
    .filter((s): s is Skill => s != null)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  const labels = COMPETENCE_CATEGORY_LABELS[category];
  const categoryLabel = locale === "sv" ? labels.sv : labels.en;

  return (
    <div className="skill-group">
      <div className="skill-meta">
        <span className="skill-level-label">{categoryLabel}</span>
      </div>
      <span className="skill-list competence-skill-list">
        {skills.map((skill, idx) => (
          <span key={skill.id}>
            {idx > 0 && ", "}
            {skill.name}
          </span>
        ))}
      </span>
    </div>
  );
}

export interface BlockContentProps {
  block: ContentBlockSpec;
  cv: DomainCV;
  locale: Locale;
  /** Active RenderSpec, or null for default rendering. Controls skill grouping per role. */
  spec?: RenderSpec | null;
}

/**
 * Renders the content of a single block by kind. Used for measurement and for final print.
 */
export function BlockContent({
  block,
  cv,
  locale,
  spec = null,
}: BlockContentProps): React.ReactNode {
  switch (block.kind) {
    case "coverIntro":
      return (
        <CoverIntro
          payload={block.payload as CoverIntroPayload}
          locale={locale}
        />
      );
    case "experienceItem": {
      const p = block.payload as {
        roleId: string;
        mode?: "headerOnly" | "headerAndFirstParagraph";
        text?: string;
        showSkills?: boolean;
      };
      const role = cv.roles.find((r) => r.id === p.roleId);
      if (!role) return null;
      const resolvedSkills = resolveRoleSkills(role, cv, spec);
      if (p.mode === "headerOnly") {
        return <PrintRoleHeader role={role} locale={locale} resolvedSkills={resolvedSkills} />;
      }
      if (p.mode === "headerAndFirstParagraph" && p.text != null) {
        return (
          <PrintRoleHeaderWithFirstParagraph
            role={role}
            locale={locale}
            firstParagraphText={p.text}
            showSkills={p.showSkills}
            resolvedSkills={resolvedSkills}
          />
        );
      }
      return <PrintRole role={role} locale={locale} resolvedSkills={resolvedSkills} />;
    }
    case "experienceParagraph": {
      const p = block.payload as {
        roleId: string;
        paragraphIndex: number;
        text: string;
        isLastParagraph?: boolean;
      };
      const resolvedSkills = p.isLastParagraph
        ? resolveRoleSkills(cv.roles.find((r) => r.id === p.roleId)!, cv, spec)
        : undefined;
      return <PrintRoleParagraph text={p.text} resolvedSkills={resolvedSkills} />;
    }
    case "experienceListItem": {
      const p = block.payload as {
        roleId: string;
        paragraphIndex: number;
        itemIndex: number;
        itemText: string;
        isLastItem?: boolean;
      };
      const resolvedSkills = p.isLastItem
        ? resolveRoleSkills(cv.roles.find((r) => r.id === p.roleId)!, cv, spec)
        : undefined;
      return (
        <PrintRoleListItem
          itemText={p.itemText}
          resolvedSkills={resolvedSkills}
          isFirstItem={p.itemIndex === 0}
        />
      );
    }
    case "hobbyProjectItem": {
      const { projectId } = block.payload as { projectId: string };
      const project = (cv.hobbyProjects ?? []).find((p) => p.id === projectId);
      if (!project) return null;
      // HobbyProject has the same skills: RoleSkill[] shape as Role — cast is safe.
      const resolvedSkills = resolveRoleSkills(project as unknown as Role, cv, spec);
      return <PrintHobbyProject project={project} locale={locale} resolvedSkills={resolvedSkills} />;
    }
    case "educationItem": {
      const { educationId } = block.payload as { educationId: string };
      const education = cv.educations.find((e) => e.id === educationId);
      if (!education) return null;
      return <PrintEducation education={education} locale={locale} />;
    }
    case "courseItem": {
      const { trainingId } = block.payload as { trainingId: string };
      const training = cv.trainings.find((t) => t.id === trainingId);
      if (!training) return null;
      return <PrintTraining training={training} locale={locale} />;
    }
    case "commitmentItem": {
      const { commitmentId } = block.payload as { commitmentId: string };
      const commitment = cv.commitments.find((c) => c.id === commitmentId);
      if (!commitment) return null;
      return <PrintCommitment commitment={commitment} locale={locale} />;
    }
    case "competenceGroup": {
      const { category, skillIds } = block.payload as {
        category: "medel" | "hog" | "mycket_hog";
        skillIds: string[];
      };
      return (
        <PrintSkillGroup
          category={category}
          skillIds={skillIds}
          cv={cv}
          locale={locale}
        />
      );
    }
    case "custom":
    default:
      return null;
  }
}
