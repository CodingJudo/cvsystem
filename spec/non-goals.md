- Authentication or multi-user support
- Database persistence
- Full Cinode schema coverage
- PDF export
- WYSIWYG editing
- Committing personal data to the repository (reference data, fixtures with real CVs must not be pushed to git; see "Repository and personal data" below)

## Repository and personal data

Do **not** push personal data to git. The following are treated as personal data and must not be committed:

- **Reference data** (`referencedata/`): example CVs, screenshots, HTML/CSS examples containing real names, contact details, or other identifiable information.
- **Fixtures** (`public/fixtures/`, `fixtures/`): Cinode JSON exports or other CV data used for import/testing. Treat these as personal data even if used only locally.

These paths are listed in `.gitignore`. Keep the repository free of real CV content so it can be shared or made public without exposing personal information.
