"use client";

import type { DomainCV, Locale } from "@/domain/model/cv";
import { getBilingualText } from "@/lib/format";

interface CoverPageProps {
  cv: DomainCV;
  locale: Locale;
  themeClassName?: string;
}


export function CoverPage({ cv, locale, themeClassName }: CoverPageProps) {
  const contacts = cv.contacts ?? {
    email: null,
    phone: null,
    address: null,
    website: null,
  };
  const groups = cv.coverPageGroups ?? {
    roles: [],
    expertKnowledge: [],
    languages: [],
  };
  const featuredProjects = (cv.featuredProjects ?? []).filter((p) => p.visible);
  const hasContacts =
    contacts.email || contacts.phone || contacts.address || contacts.website;

  return (
    <div
      className={["block", "block--cover", "cover-page", themeClassName]
        .filter(Boolean)
        .join(" ")}
      data-cover-page
      data-block="cover"
    >
      <header className="block-header" aria-hidden="true" />
      <div className="cover-slot-photo">
        {cv.photoDataUrl ? (
          <div className="cover-photo-size-constrainer">
            <div className="cover-photo-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cv.photoDataUrl}
                alt={
                  `${cv.name.first ?? ""} ${cv.name.last ?? ""}`.trim() ||
                  "Profile photo"
                }
                className="cover-photo-img"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="cover-slot-contacts">
        {hasContacts ? (
          <>
            <h2 className="cover-slot-title">
              {locale === "sv" ? "Kontakt" : "Contact"}
            </h2>
            <ul className="cover-contacts-list">
            {contacts.email ? <li>{contacts.email}</li> : null}
            {contacts.phone ? <li>{contacts.phone}</li> : null}
            {contacts.address ? <li>{contacts.address}</li> : null}
            {contacts.website ? <li>{contacts.website}</li> : null}
          </ul>
          </>
        ) : null}
      </div>

      <div className="cover-slot-roles">
        {groups.roles.length > 0 ? (
          <>
            <h2 className="cover-slot-title">
              {locale === "sv" ? "Roller" : "Roles"}
            </h2>
            <ul className="cover-list">
            {groups.roles.map((role, idx) => (
              <li key={idx}>{role}</li>
            ))}
          </ul>
          </>
        ) : null}
      </div>

      <div className="cover-slot-expertKnowledge">
        {groups.expertKnowledge.length > 0 ? (
          <>
            <h2 className="cover-slot-title">
              {locale === "sv" ? "Expertkunskaper" : "Expert knowledge"}
            </h2>
            <ul className="cover-list">
            {groups.expertKnowledge.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          </>
        ) : null}
      </div>

      <div className="cover-slot-languages">
        {groups.languages.length > 0 ? (
          <>
            <h2 className="cover-slot-title">
              {locale === "sv" ? "Språk" : "Languages"}
            </h2>
            <ul className="cover-list">
            {groups.languages.map((lang, idx) => (
              <li key={idx}>{lang}</li>
            ))}
          </ul>
          </>
        ) : null}
      </div>

      <div className="cover-slot-featuredProjects">
        {featuredProjects.length > 0 ? (
          <ul className="cover-projects-list">
            {featuredProjects.map((project) => {
              const desc = getBilingualText(project.description, locale);
              return (
                <li key={project.id} className="cover-project-item">
                  {(project.roleTitle || project.company) && (
                    <span className="cover-project-title">
                      {[project.roleTitle, project.company]
                        .filter(Boolean)
                        .join(" – ")}
                    </span>
                  )}
                  {desc ? <p className="cover-project-desc">{desc}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <footer className="block-footer" aria-hidden="true" />

      <style jsx>{`
        /* Empty block header/footer (Phase 2) – themes can add content and override */
        .cover-page .block-header:empty,
        .cover-page .block-footer:empty {
          display: none;
        }

        /* Cover block: first block, separate design from other pages; max one A4 (Phase 1) */
        .cover-page {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-height: 0;
          padding: 1rem;
          font-family: "Georgia", "Times New Roman", serif;
          font-size: 11pt;
          line-height: 1.5;
          background: var(--cv-page-bg, #ffffff);
          color: var(--cv-text, #1a1a1a);
          break-after: page;
          overflow-y: auto;
        }

        @media print {
          .cover-page {
            max-height: 297mm;
            overflow: hidden;
          }
        }

        .cover-photo-img {
          width: 64pt;
          height: 64pt;
          object-fit: cover;
        }

        .cover-contacts-list,
        .cover-list {
          margin: 0;
          padding-left: 1.25rem;
        }

        .cover-contacts-list li,
        .cover-list li {
          margin: 0.25rem 0;
        }

        .cover-projects-list {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }

        .cover-project-item {
          margin: 0.5rem 0;
        }

        .cover-project-title {
          font-weight: 600;
          color: var(--cv-text, #1a1a1a);
        }

        .cover-project-desc {
          margin: 0.25rem 0 0 0;
          font-size: 10pt;
          color: var(--cv-muted, #555);
        }
      `}</style>
    </div>
  );
}
