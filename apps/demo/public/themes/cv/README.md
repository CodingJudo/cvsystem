# CV Print Themes

CSS files in this folder are loaded on the CV print/preview and apply theme-specific styling. The app applies a theme class to the print container (e.g. `printTheme--light`, `printTheme--dark`). Scope all selectors with that class to avoid affecting the rest of the app.

## Cover block (first page)

The **cover page** is the first block of the CV and has a **separate design** from the rest of the document. Themes can target it via `.cover-page` or `.block--cover`. It is **limited to one A4** in height when printing: content that would exceed one page is clipped so the cover never flows to a second page. In screen preview, long cover content can scroll (`overflow-y: auto`). This is standard behaviour for all themes; see [spec/block-based-print-layout.md](../../../../../spec/block-based-print-layout.md).

## Printing with the browser

Themes that use background colors (e.g. Geisli’s dark sidebar) require **“Background graphics”** (or “Print backgrounds”) to be enabled in the browser’s print dialog; otherwise the sidebar will print white. In Chrome: **More settings** → **Background graphics**. In Firefox: **Print backgrounds**. In Safari: **Print backgrounds**.

## Cover page slots

The first page of the CV is a **cover page** built from six slots. Each slot has a stable class name so themes can reorder and style them.

| Slot class | Content |
|------------|--------|
| `cover-slot-photo` | Profile photo |
| `cover-slot-contacts` | Email, phone, address, website |
| `cover-slot-roles` | Roles list (from cover page groups) |
| `cover-slot-expertKnowledge` | Expert knowledge list |
| `cover-slot-languages` | Languages list |
| `cover-slot-featuredProjects` | Utvalda projekt (featured projects) |

The cover page container uses `display: flex; flex-direction: column`. To change the **order** of slots in your theme, set `order` on each slot:

```css
.printTheme--yourTheme .cover-slot-contacts { order: 1; }
.printTheme--yourTheme .cover-slot-photo { order: 2; }
/* ... etc */
```

You can also override layout, spacing, and typography for `.cover-page` and any `.cover-slot-*` class.

## Block structure (Phase 2+)

After the cover page, content is grouped into **blocks**. Each block has a stable class and optional header/footer so themes can style them independently.

| Block class | Content |
|-------------|--------|
| `.block--cover` | Cover page (same as `.cover-page`); first block only. |
| `.block--experience` | Work experience (roles). |
| `.block--education` | Education section. |
| `.block--courses-certification` | Courses and certifications (trainings). |
| `.block--commitments` | Presentations & publications. |
| `.block--competence` | Skills (Kompetenser). |

Each block container has:

- **`.block`** – base class on every block.
- **`.block-header`** – optional; often contains the block title (e.g. `<h2 class="section-title">`). Themes can target `.block--experience .block-header`, etc.
- **Main content** – e.g. `.cv-section`, `.roles-container`, `.skills-container`.
- **`.block-footer`** – optional; per-block footer. Default style: 200px min-height, gray background; themes can override. The last block (Competence) uses `.block-footer--last` and `.block-footer-text` for “Generated: date”.

Block order is fixed: Cover → Experience → Education → Courses & Certification → Commitments → Competence. See [spec/block-based-print-layout.md](../../../../../spec/block-based-print-layout.md).

### Block page breaks (Phase 3): “Start on new page”

A block can have a **“start on new page”** property so it always begins on a new page. The layout sets **`data-start-on-new-page="true"`** on the block wrapper when the theme config says that block starts on a new page. The break is applied via a **CSS `::before` pseudo-element** on that block (`break-before: page` in `@media print`), so there is no extra DOM element and no empty pages. Themes can override `.block[data-start-on-new-page="true"]::before` if needed.

Config in `src/lib/print-block-config.ts`: **`BLOCK_STARTS_NEW_PAGE_BY_THEME`** maps theme id → list of block types that start on a new page.

Example (Geisli): Cover → Experience (flows) → [new page] Education + Courses & certs → [new page] Competence. Geisli config: `['education', 'competence']`.

### Page breaks inside a block (Phase 4)

The user can mark specific items (e.g. a role, an education) to **start on a new page** when printing. The layout renders a **`.block-internal-break`** element before that item; in print it gets `break-before: page`. In preview (screen) it shows as a dotted red line. Data: `cv.printBreakBefore` (e.g. `experience: [roleId, ...]`). Footer style is customizable via `.block-footer`; default is 200px gray with optional `.block-footer-text`.

## Main CV

The main CV body uses classes such as `.print-cv`, `.print-cv-body`, `.cv-header`, `.cv-section`, `.section-title`, `.subsection-title`, and section-specific classes (e.g. `.print-role`, `.print-education`). Use CSS variables for colors so themes stay consistent:

- `--cv-page-bg`
- `--cv-text`
- `--cv-muted`
- `--cv-muted-2`
- `--cv-border`
- `--cv-border-strong`
