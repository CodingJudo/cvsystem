1. What “paragraph mode” should do
Goal for the new mode:

Don’t break text inside a paragraph.

Allow a long block of text (e.g. role description) to be split across pages between paragraphs.

Still keep important things together (e.g. heading + first paragraph).

Key idea:
In “paragraph mode”, the engine doesn’t need to know what a paragraph is. Instead:

The builder emits paragraph-level blocks.

The existing engine just paginates those blocks as usual.

keepWithNext and groupId still work the same way.

So the “mode” is really “build more fine-grained blocks”, not “teach the engine about paragraphs”.

2. New config / switch

Add a simple enum or flag that controls how content is split into blocks:

export type PaginationGranularity = 'block' | 'paragraph';

export interface PaginationConfig {
  granularity: PaginationGranularity;
}


You can:

Pass PaginationConfig into buildSectionsFromCv.

Or derive it from theme / user settings.

Example:

export function buildSectionsFromCv(
  cv: DomainCV,
  config: PaginationConfig = { granularity: 'block' },
): BuiltLayout {
  // inside, you branch when building experience/education/etc.
}

3. Extending ContentBlockKind for paragraphs

Add new kinds to ContentBlockKind:

export type ContentBlockKind =
  | 'coverIntro'
  | 'experienceItem'
  | 'experienceParagraph'
  | 'educationItem'
  | 'educationParagraph'
  | 'courseItem'
  | 'commitmentItem'
  | 'competenceGroup'
  | 'custom';


You don’t have to use all of them immediately; the important one is experienceParagraph (and similar if you want paragraphs in education, etc.).

4. Builder behavior in each mode
4.1. Current behavior (granularity: 'block')

You already do roughly:

// experience section
visibleRoles.map((role) => ({
  id: `role-${role.id}`,
  kind: 'experienceItem',
  sectionId,
  groupId: `role-${role.id}`,
  allowSplitAcrossPages: false,
  payload: { roleId: role.id },
}));


So each role is one atomic ContentBlockSpec. That’s the “block mode”.

4.2. New behavior (granularity: 'paragraph')

Change ONLY the experience builder when config.granularity === 'paragraph'.

Instead of 1 block per role, you do:

One block for the role header/meta, with keepWithNext: true.

One block per paragraph of the description, each individually paginated.

Pseudo-code:

function buildExperienceSection(
  cv: DomainCV,
  config: PaginationConfig,
): SectionSpec | null {
  const visibleRoles = cv.roles.filter((role) => role.visible);
  if (visibleRoles.length === 0) return null;

  const sectionId: SectionType = 'experience';
  const blocks: ContentBlockSpec[] = [];

  for (const role of visibleRoles) {
    const breakBefore = shouldForceBreakBeforeItem(
      'experience',
      role.id,
      cv.printBreakBefore ?? undefined,
    );

    if (config.granularity === 'block') {
      // existing behavior
      blocks.push({
        id: `role-${role.id}`,
        kind: 'experienceItem',
        sectionId,
        keepWithNext: false,
        groupId: `role-${role.id}`,
        allowSplitAcrossPages: false,
        forceBreakBefore: breakBefore,
        payload: { roleId: role.id },
      });
    } else {
      // granularity === 'paragraph'
      // 1) Header/meta block, kept with first paragraph
      blocks.push({
        id: `role-${role.id}-header`,
        kind: 'experienceItem',       // header-only variant, your renderer knows
        sectionId,
        keepWithNext: true,           // keeps header with first paragraph
        allowSplitAcrossPages: false,
        forceBreakBefore: breakBefore,
        payload: { roleId: role.id, mode: 'headerOnly' },
      });

      // 2) Paragraph blocks
      const paragraphs = splitRoleDescriptionIntoParagraphs(role); // you implement this
      paragraphs.forEach((paragraphText, index) => {
        blocks.push({
          id: `role-${role.id}-p${index}`,
          kind: 'experienceParagraph',
          sectionId,
          keepWithNext: false,
          allowSplitAcrossPages: false, // paragraph is atomic
          payload: {
            roleId: role.id,
            paragraphIndex: index,
            text: paragraphText,
          },
        });
      });
    }
  }

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 1,
    contentBlocks: blocks,
  };
}


Notes:

In paragraph mode, you do not use groupId for the whole role, because that would force all paragraphs to stay on one page again.

Instead, you:

Use keepWithNext on header to avoid orphaned headers.

Keep each paragraph as its own atomic block (not splittable internally).

You can do the same for education/training descriptions if you want.

5. Measurement and pagination changes

Measurement: no structural change needed.

PrintMeasurementRoot will now render more ContentBlockSpecs (paragraph-level blocks).

Each paragraph block is measured independently and stored in MeasurementsBySection[sectionId][blockId].

Pagination engine: also no structural change.

It still:

Groups via groupId and keepWithNext.

Treats a ContentBlockSpec as atomic for split decisions.

In paragraph mode, your “atomic unit” is a paragraph, so:

Paragraphs can move to the next page.

A paragraph is never split across pages.

This is exactly what you want.

6. Rendering paragraphs in React

Extend your BlockRenderer to understand the new kinds:

const BlockRenderer: React.FC<{ block: ContentBlockSpec }> = ({ block }) => {
  switch (block.kind) {
    case 'coverIntro':
      return <CoverPageFromPayload payload={block.payload} />;

    case 'experienceItem': {
      const p = block.payload as any;
      if (p.mode === 'headerOnly') {
        return <PrintRoleHeader roleId={p.roleId} />;
      }
      return <PrintRoleFull roleId={p.roleId} />; // used in block mode
    }

    case 'experienceParagraph': {
      const p = block.payload as any;
      return (
        <RoleParagraph
          roleId={p.roleId}
          paragraphIndex={p.paragraphIndex}
          text={p.text}
        />
      );
    }

    // ... other kinds as before ...

    default:
      return null;
  }
};


In your “block” mode, experienceItem renders the full role (header + all paragraphs).
In “paragraph” mode, experienceItem with mode: 'headerOnly' renders just header/meta, and each experienceParagraph renders a single <p>.

7. Configuring the mode

You can wire the mode from wherever makes sense:

const paginationConfig: PaginationConfig = {
  granularity: 'paragraph', // or 'block'
};

const { sections, blockIndex } = buildSectionsFromCv(cv, paginationConfig);
// Then feed sections into measurement + paginateCv as before.


Later, you can make this:

Theme-driven (e.g. “dense theme” uses paragraph mode).

User-configurable (“Optimize page usage” toggle).

8. Summary of spec changes to tell the agent

If you want a short “do this” list to pass to the agent:

Add a granularity config:

export type PaginationGranularity = 'block' | 'paragraph';

export interface PaginationConfig {
  granularity: PaginationGranularity;
}


Extend buildSectionsFromCv to accept PaginationConfig and branch on granularity when building experience (and optionally other sections):

In 'block' mode: keep existing behavior (1 block per role).

In 'paragraph' mode:

Emit one experienceItem block per role with mode: 'headerOnly' and keepWithNext: true.

Split role description into paragraphs and emit one experienceParagraph block per paragraph.

Extend ContentBlockKind and BlockRenderer:

Add experienceParagraph (and optionally educationParagraph).

Render header-only vs full role based on payload.mode.

Leave measurement and paginateCv unchanged:

They already handle finer-grained blocks; paragraph mode just gives them more, smaller blocks.