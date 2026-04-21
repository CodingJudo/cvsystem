'use client';

import { Fragment } from 'react';
import type { DomainCV, Locale, BilingualText, Skill, Role, Training, Education, Commitment } from '@/domain/model/cv';
import { getBilingualText, formatDate } from '@/lib/format';
import { getOrderedSkills } from '@/lib/role-helpers';
import { blockStartsNewPage, showHeaderOnCover, showFooterOnCover } from '@/lib/print-block-config';

interface PrintLayoutProps {
  cv: DomainCV;
  locale: Locale;
  /** Theme id (e.g. 'print-light') – used to apply theme-specific block page breaks */
  themeId?: string;
}


function PrintSkill({ skill }: { skill: Skill }) {
  return (
    <span className="print-skill">
      {skill.name}
      {skill.level && <span className="skill-level"> ({skill.level}/5)</span>}
      {skill.years && skill.years > 0 && <span className="skill-years"> • {skill.years}y</span>}
    </span>
  );
}

function PrintRole({ role, locale }: { role: Role; locale: Locale }) {
  const dateRange = [
    formatDate(role.start),
    role.isCurrent ? (locale === 'sv' ? 'Pågående' : 'Present') : formatDate(role.end),
  ].filter(Boolean).join(' – ');

  const description = getBilingualText(role.description, locale);

  return (
    <div className="print-role">
      <div className="role-header">
        <div className="role-title-company">
          <h3 className="role-title">{role.title || 'Untitled Role'}</h3>
          {role.company && <span className="role-company">{role.company}</span>}
          {role.location && <span className="role-location">{role.location}</span>}
        </div>
        {dateRange && <span className="role-date">{dateRange}</span>}
      </div>
      {(() => {
        const orderedSkills = getOrderedSkills(role);
        const visibleSkills = orderedSkills.filter((s) => s.visible !== false);
        return visibleSkills.length > 0 ? (
          <div className="role-skills">
            {visibleSkills.map((skill, idx) => (
              <span key={skill.id}>
                {idx > 0 && ' • '}
                {skill.name}
              </span>
            ))}
          </div>
        ) : null;
      })()}
      {description && (
        <p className="role-description">{description}</p>
      )}
    </div>
  );
}

function PrintEducation({ education, locale }: { education: Education; locale: Locale }) {
  const dateRange = [
    education.startDate ? new Date(education.startDate).getFullYear().toString() : '',
    education.ongoing 
      ? (locale === 'sv' ? 'Pågående' : 'Ongoing') 
      : education.endDate ? new Date(education.endDate).getFullYear().toString() : '',
  ].filter(Boolean).join(' – ');

  const description = getBilingualText(education.description, locale);

  return (
    <div className="print-education">
      <div className="education-header">
        <div className="education-info">
          <h3 className="education-program">
            {education.degree && `${education.degree} `}
            {education.programName || education.schoolName}
          </h3>
          {education.programName && (
            <span className="education-school">{education.schoolName}</span>
          )}
        </div>
        {dateRange && <span className="education-date">{dateRange}</span>}
      </div>
      {description && !education.hideDescription && <p className="education-description">{description}</p>}
    </div>
  );
}

function PrintTraining({ training, locale }: { training: Training; locale: Locale }) {
  const typeLabel = training.trainingType === 1 
    ? (locale === 'sv' ? 'Certifiering' : 'Certification')
    : '';
  
  return (
    <div className="print-training">
      <span className="training-title">{training.title}</span>
      {training.issuer && <span className="training-issuer"> – {training.issuer}</span>}
      {training.year && <span className="training-year"> ({training.year})</span>}
      {typeLabel && <span className="training-type"> [{typeLabel}]</span>}
    </div>
  );
}

function PrintCommitment({ commitment }: { commitment: Commitment; locale: Locale }) {
  const typeIcon = commitment.commitmentType === 'presentation' ? '🎤 ' :
                   commitment.commitmentType === 'publication' ? '📄 ' : '';
  
  return (
    <div className="print-commitment">
      <span className="commitment-title">{typeIcon}{commitment.title}</span>
      {commitment.venue && <span className="commitment-venue"> – {commitment.venue}</span>}
      {commitment.date && <span className="commitment-date"> ({commitment.date})</span>}
    </div>
  );
}

export function PrintLayout({ cv, locale, themeId }: PrintLayoutProps) {
  const summary = getBilingualText(cv.summary, locale);
  const title = getBilingualText(cv.title, locale);
  const contacts = cv.contacts ?? { email: null, phone: null, address: null, website: null };

  // Group skills by level for better presentation
  const skillsByLevel = cv.skills.reduce((acc, skill) => {
    const level = skill.level ?? 0;
    if (!acc[level]) acc[level] = [];
    acc[level].push(skill);
    return acc;
  }, {} as Record<number, Skill[]>);

  // Sort levels descending (highest first)
  const sortedLevels = Object.keys(skillsByLevel)
    .map(Number)
    .sort((a, b) => b - a);

  const featuredProjects = (cv.featuredProjects ?? []).filter((p) => p.visible);
  const breakBefore = cv.printBreakBefore ?? {};
  const experienceBreakIds = new Set(breakBefore.experience ?? []);
  const educationBreakIds = new Set(breakBefore.education ?? []);
  const coursesBreakIds = new Set(breakBefore['courses-certification'] ?? []);
  const commitmentsBreakIds = new Set(breakBefore.commitments ?? []);
  const addHeaderOnCover = showHeaderOnCover(themeId);
  const addFooterOnCover = showFooterOnCover(themeId);

  return (
    <>
      {/* Cover */}
      <div className={`print-cv cv-cover-main-wrapper${addFooterOnCover ? ' has-cover-footer' : ''}`}>
        {addHeaderOnCover && (
          <header className="block-header block-header--cover" aria-label="Page header">
            <span className="block-header-text">Header</span>
          </header>
        )}
        <div className="cv-cover-main">
          <header className="cv-header">
            {cv.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cv.photoDataUrl}
                alt={`${cv.name.first ?? ''} ${cv.name.last ?? ''}`.trim() || 'Profile photo'}
                className="cv-photo"
              />
            ) : null}
            <h1 className="cv-name">
              {cv.name.first} {cv.name.last}
            </h1>
            {title && <p className="cv-title">{title}</p>}

            {(contacts.email || contacts.phone || contacts.address || contacts.website) ? (
              <div className="cv-contacts">
                {contacts.email ? <span className="cv-contactItem">{contacts.email}</span> : null}
                {contacts.phone ? <span className="cv-contactItem">{contacts.phone}</span> : null}
                {contacts.address ? <span className="cv-contactItem">{contacts.address}</span> : null}
                {contacts.website ? <span className="cv-contactItem">{contacts.website}</span> : null}
              </div>
            ) : null}
          </header>

          {summary && (
            <section className="cv-section">
              <h2 className="section-title">
                {locale === 'sv' ? 'Profil' : 'Profile'}
              </h2>
              <p className="summary-text">{summary}</p>
            </section>
          )}

          {featuredProjects.length > 0 && (
            <section className="cv-section cv-section--featured-projects">
              <h2 className="section-title">
                {locale === 'sv' ? 'Utvalda projekt' : 'Featured projects'}
              </h2>
              <div className="featured-projects-container">
                {featuredProjects.map((project) => {
                  const desc = getBilingualText(project.description, locale);
                  return (
                    <div key={project.id} className="featured-project-item">
                      {(project.roleTitle || project.company) && (
                        <p className="featured-project-title">
                          {[project.roleTitle, project.company].filter(Boolean).join(' – ')}
                        </p>
                      )}
                      {desc ? <p className="featured-project-desc">{desc}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        {addFooterOnCover && (
          <footer className="block-footer block-footer--cover" aria-label="Page footer">
            <span className="block-footer-text">Footer</span>
          </footer>
        )}
      </div>

      {/* Body: page header (adds margin-top), blocks (each with section header + footer), page footer (adds margin-bottom) */}
      <div className="print-cv print-cv-body">
        <header className="print-page-header" aria-label="Page header">
          <span className="print-page-header-text">Header</span>
        </header>
        <footer className="print-page-footer" aria-label="Page footer">
          <p className="print-page-footer-text">
            {locale === 'sv' ? 'Genererad' : 'Generated'}: {new Date().toLocaleDateString('sv-SE')}
          </p>
        </footer>
        <div className="print-cv-body-inner">
        {/* Block: Experience */}
        {cv.roles.filter(r => r.visible).length > 0 && (
          <div
            className="block block--experience"
            {...(blockStartsNewPage(themeId, 'experience') ? { 'data-start-on-new-page': 'true' } : {})}
          >
            <header className="block-header">
              <h2 className="section-title">
                {locale === 'sv' ? 'Erfarenhet' : 'Experience'}
              </h2>
            </header>
            <section className="cv-section">
              <div className="roles-container">
                {cv.roles
                  .filter(r => r.visible)
                  .sort((a, b) => {
                    // Sort by start date (newest first), then by end date if start dates are equal
                    const dateA = a.start ? new Date(a.start).getTime() : 0;
                    const dateB = b.start ? new Date(b.start).getTime() : 0;
                    if (dateA === dateB) {
                      if (a.isCurrent && !b.isCurrent) return -1;
                      if (!a.isCurrent && b.isCurrent) return 1;
                      const endA = a.end ? new Date(a.end).getTime() : 0;
                      const endB = b.end ? new Date(b.end).getTime() : 0;
                      return endB - endA;
                    }
                    return dateB - dateA; // Descending order (newest first)
                  })
                  .map((role) => (
                    <Fragment key={role.id}>
                      {experienceBreakIds.has(role.id) && (
                        <span className="block-internal-break" aria-hidden="true" />
                      )}
                      <PrintRole role={role} locale={locale} />
                    </Fragment>
                  ))}
              </div>
            </section>
            <footer className="block-footer" />
          </div>
        )}

        {/* Block: Education */}
        {cv.educations.filter(e => e.visible).length > 0 && (
          <div
            className="block block--education"
            {...(blockStartsNewPage(themeId, 'education') ? { 'data-start-on-new-page': 'true' } : {})}
          >
            <header className="block-header">
              <h2 className="section-title">
                {locale === 'sv' ? 'Utbildning' : 'Education'}
              </h2>
            </header>
            <section className="cv-section">
              <div className="education-container">
                {cv.educations.filter(e => e.visible).map((edu) => (
                  <Fragment key={edu.id}>
                    {educationBreakIds.has(edu.id) && (
                      <span className="block-internal-break" aria-hidden="true" />
                    )}
                    <PrintEducation education={edu} locale={locale} />
                  </Fragment>
                ))}
              </div>
            </section>
            <footer className="block-footer" />
          </div>
        )}

        {/* Block: Courses & Certification (certifications + courses) */}
        {(cv.trainings.filter(t => t.visible && t.trainingType === 1).length > 0 ||
          cv.trainings.filter(t => t.visible && t.trainingType === 0).length > 0) && (
          <div
            className="block block--courses-certification"
            {...(blockStartsNewPage(themeId, 'courses-certification') ? { 'data-start-on-new-page': 'true' } : {})}
          >
            <header className="block-header">
              <h2 className="section-title">
                {locale === 'sv' ? 'Kurser & certifieringar' : 'Courses & certifications'}
              </h2>
            </header>
            <section className="cv-section">
              {cv.trainings.filter(t => t.visible && t.trainingType === 1).length > 0 && (
                <>
                  <h3 className="subsection-title">
                    {locale === 'sv' ? 'Certifieringar' : 'Certifications'}
                  </h3>
                  <div className="training-container">
                    {cv.trainings.filter(t => t.visible && t.trainingType === 1).map((training) => (
                      <Fragment key={training.id}>
                        {coursesBreakIds.has(training.id) && (
                          <span className="block-internal-break" aria-hidden="true" />
                        )}
                        <PrintTraining training={training} locale={locale} />
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
              {cv.trainings.filter(t => t.visible && t.trainingType === 0).length > 0 && (
                <>
                  <h3 className="subsection-title">
                    {locale === 'sv' ? 'Kurser' : 'Courses'}
                  </h3>
                  <div className="training-container">
                    {cv.trainings.filter(t => t.visible && t.trainingType === 0).map((training) => (
                      <Fragment key={training.id}>
                        {coursesBreakIds.has(training.id) && (
                          <span className="block-internal-break" aria-hidden="true" />
                        )}
                        <PrintTraining training={training} locale={locale} />
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </section>
            <footer className="block-footer" />
          </div>
        )}

        {/* Block: Commitments (presentations & publications) */}
        {cv.commitments.filter(c => c.visible).length > 0 && (
          <div
            className="block block--commitments"
            {...(blockStartsNewPage(themeId, 'commitments') ? { 'data-start-on-new-page': 'true' } : {})}
          >
            <header className="block-header">
              <h2 className="section-title">
                {locale === 'sv' ? 'Presentationer & Publikationer' : 'Presentations & Publications'}
              </h2>
            </header>
            <section className="cv-section">
              <div className="commitment-container">
                {cv.commitments.filter(c => c.visible).map((commitment) => (
                  <Fragment key={commitment.id}>
                    {commitmentsBreakIds.has(commitment.id) && (
                      <span className="block-internal-break" aria-hidden="true" />
                    )}
                    <PrintCommitment commitment={commitment} locale={locale} />
                  </Fragment>
                ))}
              </div>
            </section>
            <footer className="block-footer" />
          </div>
        )}

        {/* Block: Competence (skills; last block – footer contains "Generated") */}
        {cv.skills.length > 0 && (
          <div
            className="block block--competence"
            {...(blockStartsNewPage(themeId, 'competence') ? { 'data-start-on-new-page': 'true' } : {})}
          >
            <header className="block-header">
              <h2 className="section-title">
                {locale === 'sv' ? 'Kompetenser' : 'Skills'}
              </h2>
            </header>
            <section className="cv-section cv-section--competence">
              <div className="skills-container">
                {sortedLevels.map((level) => (
                  <div key={level} className="skill-group">
                    {level > 0 && (
                      <span className="skill-level-label">
                        {level === 5 ? (locale === 'sv' ? 'Expert' : 'Expert') :
                         level === 4 ? (locale === 'sv' ? 'Avancerad' : 'Advanced') :
                         level === 3 ? (locale === 'sv' ? 'Medel' : 'Intermediate') :
                         level === 2 ? (locale === 'sv' ? 'Grundläggande' : 'Basic') :
                         (locale === 'sv' ? 'Nybörjare' : 'Beginner')}:
                      </span>
                    )}
                    <span className="skill-list">
                      {skillsByLevel[level].map((skill, idx) => (
                        <span key={skill.id}>
                          {idx > 0 && ', '}
                          <PrintSkill skill={skill} />
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <footer className="block-footer block-footer--last">
              <p className="block-footer-text">
                {locale === 'sv' ? 'Genererad' : 'Generated'}: {new Date().toLocaleDateString('sv-SE')}
              </p>
            </footer>
          </div>
        )}

        </div>
      </div>

      {/* Print Styles (scoped to .print-cv) */}
      <style jsx>{`
        .print-cv {
          font-family: 'Georgia', 'Times New Roman', serif;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: var(--cv-page-bg, #ffffff);
          color: var(--cv-text, #1a1a1a);
          font-size: 11pt;
          line-height: 1.5;
        }

        /* Header/footer definitions: sizes used for section header, block footer, and page header/footer */
        .print-cv-body {
          --block-header-height: 50px;
          --block-footer-height: 200px;
          --print-page-header-height: 50px;
          --print-page-footer-height: 200px;
          --print-page-header-bg: #e5e5e5;
          --print-page-footer-bg: #e5e5e5;
          --print-page-header-text-color: #666;
          --print-page-footer-text-color: #666;
        }
        .cv-cover-main-wrapper {
          --block-header-height: 50px;
          --block-footer-height: 200px;
        }
        /* Section header: 50px gray box at top of sections with headers */
        .block-header {
          --block-header-bg: #e5e5e5;
          --block-header-text-color: #666;
          min-height: var(--block-header-height);
          height: var(--block-header-height);
          background: var(--block-header-bg);
          color: var(--block-header-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 0 1rem 0;
          padding: 0 1rem;
          box-sizing: border-box;
        }
        .block-header--cover {
          margin: -20mm -20mm 1rem -20mm;
          padding: 0 20mm;
        }
        .block-header .section-title {
          margin: 0;
          border: none;
          padding: 0;
        }
        .block-header-text {
          font-size: 0.9rem;
        }
        /* Cover with optional footer: reserve margin-bottom from footer definition */
        .cv-cover-main-wrapper.has-cover-footer {
          margin-bottom: var(--block-footer-height);
        }
        .print-page-header {
          height: var(--print-page-header-height);
          min-height: var(--print-page-header-height);
          background: var(--print-page-header-bg);
          color: var(--print-page-header-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: -20mm -20mm 1rem -20mm;
          padding: 0 20mm;
          box-sizing: border-box;
        }
        .print-page-footer {
          min-height: var(--print-page-footer-height);
          background: var(--print-page-footer-bg);
          color: var(--print-page-footer-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1rem -20mm -20mm -20mm;
          padding: 1rem 20mm;
          box-sizing: border-box;
        }
        .print-page-header-text,
        .print-page-footer-text {
          margin: 0;
          font-size: 0.9rem;
        }
        .print-cv-body-inner {
          /* In print, padding = page header/footer height so content doesn't run under fixed bar */
        }
        /* Block with footer gets margin-bottom from footer definition */
        .block {
          margin-bottom: var(--block-footer-height);
        }

        /* break-after removed: pagination is JS-controlled (Phase 4) */
        .cv-header {
          text-align: center;
          margin-bottom: 24pt;
          border-bottom: 2pt solid var(--cv-border-strong, #333);
          padding-bottom: 16pt;
          position: relative;
        }

        .cv-photo {
          width: 64pt;
          height: 64pt;
          object-fit: cover;
          border-radius: 10pt;
          outline: 15px solid var(--cv-border, #ccc);
          outline-offset: 0;
          margin: 0 auto 10pt auto;
          display: block;
        }

        .cv-name {
          font-size: 24pt;
          font-weight: bold;
          margin: 0 0 8pt 0;
          letter-spacing: 0.5pt;
        }

        .cv-title {
          font-size: 14pt;
          color: var(--cv-muted, #444);
          margin: 0;
          font-style: italic;
        }

        .cv-contacts {
          margin-top: 8pt;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6pt 12pt;
          font-size: 9.5pt;
          color: var(--cv-muted-2, #666);
        }

        .cv-contactItem {
          white-space: nowrap;
        }

        .cv-section {
          margin-bottom: 20pt;
        }

        .section-title {
          font-size: 14pt;
          font-weight: bold;
          color: var(--cv-text, #333);
          margin: 0 0 10pt 0;
          border-bottom: 1pt solid var(--cv-border, #ccc);
          padding-bottom: 4pt;
          text-transform: uppercase;
          letter-spacing: 1pt;
        }

        .subsection-title {
          font-size: 12pt;
          font-weight: 600;
          color: var(--cv-text, #333);
          margin: 12pt 0 6pt 0;
        }

        .summary-text {
          margin: 0;
          text-align: justify;
        }

        .skills-container {
          display: flex;
          flex-direction: column;
          gap: 6pt;
        }

        .skill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 4pt;
        }

        .skill-level-label {
          font-weight: bold;
          min-width: 100pt;
          color: var(--cv-muted, #555);
        }

        .skill-list {
          flex: 1;
        }

        .print-skill {
          display: inline;
        }

        .skill-level, .skill-years {
          color: var(--cv-muted-2, #666);
          font-size: 9pt;
        }

        /* Block footer: 200px gray block; size in footer definition; block has margin-bottom of same size */
        .block-footer {
          --block-footer-bg: #e5e5e5;
          --block-footer-text-color: #666;
          min-height: var(--block-footer-height);
          height: var(--block-footer-height);
          background: var(--block-footer-bg);
          color: var(--block-footer-text-color);
          margin-top: 1.5rem;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .block-footer-text {
          margin: 0;
          font-size: 0.9rem;
          color: var(--block-footer-text-color);
        }
        .block-footer:not(.block-footer--last) .block-footer-text {
          display: none;
        }

        .roles-container {
          display: flex;
          flex-direction: column;
          gap: 16pt;
        }

        /* .print-role break-inside removed: pagination is JS-controlled (Phase 4) */
        .role-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4pt;
        }

        .role-title-company {
          display: flex;
          flex-direction: column;
        }

        .role-title {
          font-size: 12pt;
          font-weight: bold;
          margin: 0;
        }

        .role-company {
          font-size: 11pt;
          color: var(--cv-muted, #444);
        }

        .role-location {
          font-size: 10pt;
          color: var(--cv-muted-2, #666);
          font-style: italic;
        }

        .role-skills {
          font-size: 9pt;
          color: var(--cv-muted, #555);
          margin: 4pt 0;
          font-style: italic;
        }

        .role-date {
          font-size: 10pt;
          color: var(--cv-muted-2, #666);
          white-space: nowrap;
        }

        .role-description {
          margin: 6pt 0 0 0;
          text-align: justify;
          font-size: 10pt;
          color: var(--cv-text, #333);
        }

        .featured-projects-container {
          display: flex;
          flex-direction: column;
          gap: 12pt;
        }

        /* .featured-project-item break-inside removed: pagination is JS-controlled (Phase 4) */
        .featured-project-title {
          font-size: 11pt;
          font-weight: 600;
          margin: 0 0 4pt 0;
          color: var(--cv-text, #333);
        }

        .featured-project-desc {
          margin: 0;
          font-size: 10pt;
          line-height: 1.5;
          color: var(--cv-text, #333);
          text-align: justify;
        }

        .cv-footer {
          margin-top: 24pt;
          padding-top: 12pt;
          border-top: 1pt solid var(--cv-border, #ccc);
          text-align: center;
          font-size: 9pt;
          color: var(--cv-muted-2, #888);
        }

        /* Education styles */
        .education-container {
          display: flex;
          flex-direction: column;
          gap: 12pt;
        }

        .print-education {
          break-inside: avoid;
        }

        .education-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .education-info {
          display: flex;
          flex-direction: column;
        }

        .education-program {
          font-size: 11pt;
          font-weight: bold;
          margin: 0;
        }

        .education-school {
          font-size: 10pt;
          color: var(--cv-muted, #444);
        }

        .education-date {
          font-size: 10pt;
          color: var(--cv-muted-2, #666);
          white-space: nowrap;
        }

        .education-description {
          margin: 4pt 0 0 0;
          font-size: 10pt;
          color: var(--cv-muted, #555);
        }

        /* Training styles */
        .training-container {
          display: flex;
          flex-direction: column;
          gap: 6pt;
        }

        .print-training {
          font-size: 10pt;
        }

        .training-title {
          font-weight: 500;
        }

        .training-issuer {
          color: var(--cv-muted, #555);
        }

        .training-year {
          color: var(--cv-muted-2, #666);
        }

        .training-type {
          font-size: 9pt;
          color: var(--cv-muted-2, #888);
          font-style: italic;
        }

        /* Commitment styles */
        .commitment-container {
          display: flex;
          flex-direction: column;
          gap: 6pt;
        }

        .print-commitment {
          font-size: 10pt;
        }

        .commitment-title {
          font-weight: 500;
        }

        .commitment-venue {
          color: var(--cv-muted, #555);
        }

        .commitment-date {
          color: var(--cv-muted-2, #666);
        }

        /* Preview only: dotted red lines – never apply in print */
        @media screen {
          .print-cv-body::before {
            content: '';
            display: block;
            border-top: 2px dotted #c00;
            margin-bottom: 1rem;
            height: 0;
          }
          .block[data-start-on-new-page="true"]::before {
            content: '';
            display: block;
            border-top: 2px dotted #c00;
            margin: 1rem 0;
            height: 0;
          }
          /* Internal break (Phase 4): dotted line in preview */
          .block-internal-break {
            display: block;
            border-top: 2px dotted #c00;
            margin: 1rem 0;
            height: 0;
          }
        }

        @media print {
          .print-cv-body::before {
            display: none;
          }
          /* Page header/footer: fixed at top and bottom of every printed page */
          .print-page-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: var(--print-page-header-height);
            margin: 0;
            padding: 0 20mm;
            z-index: 1;
          }
          .print-page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--print-page-footer-height);
            min-height: unset;
            margin: 0;
            padding: 0 20mm;
            z-index: 1;
          }
          /* Page header adds margin-top: reserve space so content doesn't run under fixed page header */
          .print-cv-body-inner {
            padding-top: var(--print-page-header-height);
            padding-bottom: var(--print-page-footer-height);
          }
          /* Break rules removed: pagination is JS-controlled (Phase 4). Use PaginatedPrintLayout for preview/print. */
          .block[data-start-on-new-page="true"]::before {
            content: none;
            display: none;
            margin: 0;
            padding: 0;
            height: 0;
            border: none;
          }
          .print-cv {
            padding: 0;
            max-width: none;
          }
        }
      `}</style>
    </>
  );
}
