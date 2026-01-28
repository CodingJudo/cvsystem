'use client';

import type { DomainCV, Locale, BilingualText, Skill, Role, Training, Education, Commitment } from '@/domain/model/cv';

interface PrintLayoutProps {
  cv: DomainCV;
  locale: Locale;
}

function getBilingualText(text: BilingualText, locale: Locale): string {
  const value = text[locale];
  if (value) return value;
  const fallback = locale === 'sv' ? text.en : text.sv;
  return fallback ?? '';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
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
      {role.skills.length > 0 && (
        <div className="role-skills">
          {role.skills.map((skill, idx) => (
            <span key={skill.id}>
              {idx > 0 && ' • '}
              {skill.name}
            </span>
          ))}
        </div>
      )}
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
      {description && <p className="education-description">{description}</p>}
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

function PrintCommitment({ commitment, locale }: { commitment: Commitment; locale: Locale }) {
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

export function PrintLayout({ cv, locale }: PrintLayoutProps) {
  const summary = getBilingualText(cv.summary, locale);
  const title = getBilingualText(cv.title, locale);

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

  return (
    <div className="print-cv">
      {/* Header */}
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
      </header>

      {/* Summary */}
      {summary && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Profil' : 'Profile'}
          </h2>
          <p className="summary-text">{summary}</p>
        </section>
      )}

      {/* Skills */}
      {cv.skills.length > 0 && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Kompetenser' : 'Skills'}
          </h2>
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
      )}

      {/* Work Experience - only show visible roles */}
      {cv.roles.filter(r => r.visible).length > 0 && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Erfarenhet' : 'Experience'}
          </h2>
          <div className="roles-container">
            {cv.roles.filter(r => r.visible).map((role) => (
              <PrintRole key={role.id} role={role} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Education - only show visible */}
      {cv.educations.filter(e => e.visible).length > 0 && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Utbildning' : 'Education'}
          </h2>
          <div className="education-container">
            {cv.educations.filter(e => e.visible).map((edu) => (
              <PrintEducation key={edu.id} education={edu} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Certifications - only show visible certifications */}
      {cv.trainings.filter(t => t.visible && t.trainingType === 1).length > 0 && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Certifieringar' : 'Certifications'}
          </h2>
          <div className="training-container">
            {cv.trainings.filter(t => t.visible && t.trainingType === 1).map((training) => (
              <PrintTraining key={training.id} training={training} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Courses - only show visible courses */}
      {cv.trainings.filter(t => t.visible && t.trainingType === 0).length > 0 && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Kurser' : 'Courses'}
          </h2>
          <div className="training-container">
            {cv.trainings.filter(t => t.visible && t.trainingType === 0).map((training) => (
              <PrintTraining key={training.id} training={training} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Presentations & Publications - only show visible */}
      {cv.commitments.filter(c => c.visible).length > 0 && (
        <section className="cv-section">
          <h2 className="section-title">
            {locale === 'sv' ? 'Presentationer & Publikationer' : 'Presentations & Publications'}
          </h2>
          <div className="commitment-container">
            {cv.commitments.filter(c => c.visible).map((commitment) => (
              <PrintCommitment key={commitment.id} commitment={commitment} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="cv-footer">
        <p>
          {locale === 'sv' ? 'Genererad' : 'Generated'}: {new Date().toLocaleDateString('sv-SE')}
        </p>
      </footer>

      {/* Print Styles */}
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
          border: 1pt solid var(--cv-border, #ccc);
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

        .roles-container {
          display: flex;
          flex-direction: column;
          gap: 16pt;
        }

        .print-role {
          break-inside: avoid;
        }

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

        @media print {
          .print-cv {
            padding: 0;
            max-width: none;
          }

          .cv-section {
            break-inside: avoid;
          }

          .print-role {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
