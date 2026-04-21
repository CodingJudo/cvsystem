# Contributing

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
git clone https://github.com/<org>/cvsystem.git
cd cvsystem
pnpm install
pnpm dev   # starts apps/demo at http://localhost:3000
```

## Workspace layout

```
packages/core/              @cvsystem/core — pure TS, no browser APIs
packages/adapters-browser/  @cvsystem/adapters-browser — browser storage adapters
packages/adapters-firebase/ @cvsystem/adapters-firebase — Firestore adapter
brands/geisli/              @geisli/brand — reference brand (private)
apps/demo/                  Next.js demo app
docs/                       Documentation
spec/                       Feature specs and planning
```

## Development workflow

```bash
pnpm dev                            # start demo app (runs predev scripts first)
pnpm --filter @cvsystem/core test   # test a specific package (watch mode)
pnpm test                           # run all workspace tests once
pnpm lint                           # ESLint across all packages
pnpm --filter demo exec tsc --noEmit   # type-check the demo app
```

## Before submitting a PR

1. `pnpm test` — all tests pass
2. `pnpm --filter demo exec tsc --noEmit` — no TypeScript errors
3. `pnpm lint` — no lint errors
4. `grep -r "geisli" packages/core packages/adapters-browser apps/demo/src` returns zero code hits (comments OK)

## Package boundaries

| From | Can import | Cannot import |
|---|---|---|
| `@cvsystem/core` | Nothing from this repo | Everything else |
| `@cvsystem/adapters-browser` | `@cvsystem/core` | `@geisli/brand`, `apps/demo` |
| `@cvsystem/adapters-firebase` | `@cvsystem/core` | `@geisli/brand`, `apps/demo` |
| `@geisli/brand` | `@cvsystem/core` | Adapters, `apps/demo` |
| `apps/demo` | Everything | — |

ESLint enforces these boundaries via import rules in `eslint.config.mjs`.

## Adding a storage adapter

See [`docs/storage-adapters.md`](docs/storage-adapters.md).

## Adding a brand or theme

See [`docs/brands.md`](docs/brands.md) and [`docs/theming.md`](docs/theming.md).

## Commit style

Conventional Commits: `type(scope): description`

```
feat(core): add RenderSpec per-group skill overrides
fix(adapters-browser): handle localStorage quota error gracefully
refactor(demo): remove Geisli-specific code from print-block-config
docs: add storage adapter implementation guide
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
