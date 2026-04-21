# cvsystem

A brand-neutral, open-sourceable CV engine built on TypeScript and React.

Import CV data from [Cinode](https://cinode.com/) JSON exports, edit it through a rich bilingual interface, define audience-specific render specs, and export to print-ready HTML or image.

## Packages

| Package | Description |
|---|---|
| [`@cvsystem/core`](packages/core/) | Pure TypeScript — domain model, Zod schemas, file formats, pagination engine, storage interface, brand config |
| [`@cvsystem/adapters-browser`](packages/adapters-browser/) | Browser adapters — `LocalStorageAdapter`, `JsonDownloadAdapter` |
| [`@cvsystem/adapters-firebase`](packages/adapters-firebase/) | Firestore adapter — `FirebaseAdapter` (peer dep: `firebase`) |
| `@geisli/brand` *(private, proprietary)* | Geisli Consulting AB brand — not open-source; see [`brands/geisli/LICENSE`](brands/geisli/LICENSE) |
| `apps/demo` *(private)* | Next.js 16 app — full editing UI using the packages above |

## Quick start (demo app)

```bash
pnpm install
pnpm dev         # starts apps/demo at http://localhost:3000
```

## Install (library use)

```bash
pnpm add @cvsystem/core
# optional adapters:
pnpm add @cvsystem/adapters-browser
pnpm add @cvsystem/adapters-firebase firebase
```

## Minimal wiring example

```ts
import { createMinimalCvFromSeed, LocalStorageAdapter } from '@cvsystem/core';
import { LocalStorageAdapter } from '@cvsystem/adapters-browser';

// 1. Create or load a CV
const adapter = new LocalStorageAdapter();
const file = await adapter.load();
const cv = file?.cv ?? createMinimalCvFromSeed({ firstName: 'Jane', lastName: 'Doe' });

// 2. Save after editing
await adapter.save(cv, {});
```

See [`packages/core/README.md`](packages/core/README.md) for the full API reference.  
See [`docs/storage-adapters.md`](docs/storage-adapters.md) to implement a custom adapter.  
See [`docs/brands.md`](docs/brands.md) to build a brand package.

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · pnpm workspaces

## Repository layout

```
packages/
  core/                  # @cvsystem/core
  adapters-browser/      # @cvsystem/adapters-browser
  adapters-firebase/     # @cvsystem/adapters-firebase
brands/
  geisli/                # @geisli/brand (private reference brand)
apps/
  demo/                  # Next.js demo app
docs/
  theming.md             # BrandConfig surface + how to register a theme
  storage-adapters.md    # CVStorageAdapter contract + how to implement
  brands.md              # How to build a brand package
spec/                    # Feature specifications and planning docs
```

## Workspace scripts

```bash
pnpm dev                                        # start demo app
pnpm build                                      # build demo app
pnpm test                                       # run all workspace tests
pnpm lint                                       # lint all packages
pnpm --filter @cvsystem/core test:run           # test one package
pnpm --filter demo exec tsc --noEmit            # type-check demo
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
