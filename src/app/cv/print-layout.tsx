'use client';

import type { DomainCV, Locale, BilingualText, Skill, Role } from '@/domain/model/cv';

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
          color: #1a1a1a;
          font-size: 11pt;
          line-height: 1.5;
        }

        .cv-header {
          text-align: center;
          margin-bottom: 24pt;
          border-bottom: 2pt solid #333;
          padding-bottom: 16pt;
        }

        .cv-name {
          font-size: 24pt;
          font-weight: bold;
          margin: 0 0 8pt 0;
          letter-spacing: 0.5pt;
        }

        .cv-title {
          font-size: 14pt;
          color: #444;
          margin: 0;
          font-style: italic;
        }

        .cv-section {
          margin-bottom: 20pt;
        }

        .section-title {
          font-size: 14pt;
          font-weight: bold;
          color: #333;
          margin: 0 0 10pt 0;
          border-bottom: 1pt solid #ccc;
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
          color: #555;
        }

        .skill-list {
          flex: 1;
        }

        .print-skill {
          display: inline;
        }

        .skill-level, .skill-years {
          color: #666;
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
          color: #444;
        }

        .role-location {
          font-size: 10pt;
          color: #666;
          font-style: italic;
        }

        .role-skills {
          font-size: 9pt;
          color: #555;
          margin: 4pt 0;
          font-style: italic;
        }

        .role-date {
          font-size: 10pt;
          color: #666;
          white-space: nowrap;
        }

        .role-description {
          margin: 6pt 0 0 0;
          text-align: justify;
          font-size: 10pt;
          color: #333;
        }

        .cv-footer {
          margin-top: 24pt;
          padding-top: 12pt;
          border-top: 1pt solid #ccc;
          text-align: center;
          font-size: 9pt;
          color: #888;
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
