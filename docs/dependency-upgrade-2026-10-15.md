# Dependency upgrade review — 2026-10-15

Updated from `origin/main` at `1cbbef2`. Versions were checked against npm's
`latest` dist-tags and GitHub's latest stable releases. Prereleases are excluded.
Compatible transitive dependencies were refreshed with `npm update` as well.

## Package changes

| Package | Previous range | New range |
| --- | --- | --- |
| `konva` | `^10.2.3` | `^10.9.0` |
| `lucide-react` | `^1.11.0` | `^1.57.0` |
| `nanoid` | `^5.1.7` | `^6.0.2` |
| `react` | `^19.2.4` | `^19.3.1` |
| `react-dom` | `^19.2.4` | `^19.3.1` |
| `react-konva` | `^19.2.3` | `^19.3.2` |
| `zustand` | `^5.0.12` | `^5.0.15` |
| `@eslint/js` | `^9.39.4` | `^9.39.5` |
| `@playwright/test` | `^1.58.2` | `^1.64.1` |
| `@testing-library/dom` | `^10.4.1` | `^10.4.2` |
| `@testing-library/jest-dom` | `^6.9.1` | `^7.0.1` |
| `@testing-library/react` | `^16.3.2` | `^16.3.3` |
| `@testing-library/user-event` | `^14.6.1` | `^14.6.8` |
| `@types/node` | `^25.6.0` | `^26.6.5` |
| `@types/react` | `^19.2.14` | `^19.3.0` |
| `@types/react-dom` | `^19.2.3` | `^19.3.0` |
| `@vitejs/plugin-react` | `^6.0.0` | `^6.1.2` |
| `@vitest/ui` | `^4.1.0` | `^5.0.5` |
| `cspell` | `^10.0.0` | `^10.4.0` |
| `eslint` | `^9.39.4` | `^9.39.5` |
| `eslint-plugin-react-hooks` | `^7.0.1` | `^7.1.1` |
| `eslint-plugin-react-refresh` | `^0.5.2` | `^0.5.7` |
| `globals` | `^17.4.0` | `^17.13.0` |
| `jsdom` | `^29.0.0` | `^30.1.3` |
| `lint-staged` | `^16.4.0` | `^17.6.0` |
| `prettier` | `^3.8.1` | `^3.9.10` |
| `typescript-eslint` | `^8.56.1` | `^8.71.2` |
| `vite` | `^8.0.0` | `^8.3.4` |
| `vite-plugin-pwa` | `^1.2.0` | `^2.0.0` |
| `vitest` | `^4.1.0` | `^5.0.5` |

`lz-string`, `qrcode`, `@types/qrcode`, `eslint-config-prettier`,
`eslint-plugin-react`, and `husky` already have their latest stable versions.

## Compatibility limits

- ESLint and `@eslint/js` stay on 9.39.5. The latest
  [eslint-plugin-react manifest](https://github.com/jsx-eslint/eslint-plugin-react/blob/v7.37.5/package.json)
  only supports ESLint through 9. ESLint 10.12.0 / `@eslint/js` 10.0.1 cannot be
  installed with valid peers until the plugin supports them. ESLint 9 is now
  deprecated upstream; upgrading it requires a compatible React plugin release
  or a separate decision to replace the lint rules.
- TypeScript stays on 6.0.3. The latest
  [typescript-eslint release](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.71.2)
  declares TypeScript `>=4.8.4 <6.1.0`, excluding TypeScript 7.0.2.
- No forced installs, legacy peer resolution, or dependency overrides were used.

## Changelog findings and migrations

- [React Konva 19.3](https://github.com/konvajs/react-konva/releases/tag/v19.3.0)
  requires React and React DOM 19.3 together. All three were upgraded together.
  [Konva releases](https://github.com/konvajs/konva/releases) include pointer,
  dragging, bounds, rendering, and cleanup fixes; existing drawing, selection,
  undo, touch, and storage suites exercise those paths.
- [Vitest 5 migration](https://vitest.dev/guide/migration/) requires Node 22.12+
  and Vite 6.4+. Mock call history now clears between tests; existing tests
  pass with that default. No nested hoisted mocking calls, custom pools,
  inline projects, coverage configuration, or removed APIs needed migration.
  Changed the setup import to `@testing-library/jest-dom/vitest` so matchers
  augment Vitest's types; the generic entry point caused compilation errors.
- [jest-dom 7](https://github.com/testing-library/jest-dom/releases/tag/v7.0.0)
  requires Node 22+ and `@testing-library/dom` as a peer; both are satisfied.
- [jsdom 30](https://github.com/jsdom/jsdom/releases/tag/v30.0.0) requires
  Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Declared Node 24.15+ or 26+ in
  `engines` and README, retaining `.nvmrc`'s Node 24 LTS selection.
- [Nano ID 6](https://github.com/ai/nanoid/releases/tag/6.0.0) drops Node 18/20;
  the named `nanoid()` API used by plans and elements is unchanged.
- [lint-staged 17](https://github.com/lint-staged/lint-staged/releases/tag/v17.0.0)
  requires Node 22.22.1+ and Git 2.32+. YAML configuration now needs an optional
  package; this repository uses JSON in `package.json`, so no extra package is
  needed. Documented the Git requirement. Tasks still receive explicit file
  lists; no task runs formatting or lint fixes across the whole checkout.
- [PWA plugin 2](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v2.0.0)
  changes optional assets-generator peer support; this project does not use
  that generator. Version 1.3 also adds Vite 8 peer support. Retained the
  `/app` navigation fallback restriction and added an E2E test that draws a
  box, waits for service-worker activation, and reloads `/app` offline while
  checking the saved plan survives.
- [Playwright releases](https://playwright.dev/docs/release-notes) remove old
  APIs unused here and now forward device screen dimensions. Existing device
  emulation is retained and exercised on desktop Chromium and iPad WebKit.
  CI now installs both browsers required by its configured projects.
- Reviewed the [Vite](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md),
  [React plugin](https://github.com/vitejs/vite-plugin-react/releases),
  [Zustand](https://github.com/pmndrs/zustand/releases),
  [Lucide](https://github.com/lucide-icons/lucide/releases),
  [Testing Library](https://github.com/testing-library/react-testing-library/releases),
  [user-event](https://github.com/testing-library/user-event/releases),
  [Prettier](https://github.com/prettier/prettier/releases),
  [cspell](https://github.com/streetsidesoftware/cspell/releases), and lint plugin
  releases. No additional changes to the APIs or configuration used here were
  required. React Compiler options, SSR, and Zustand persistence middleware
  changes do not apply to this client-only app's current implementation.
- Fixed `type-check` to run `tsc -b --noEmit`: the root config only contains
  project references, so plain `tsc --noEmit` did not check their source files.

## GitHub Actions

| Action | Previous | Updated release | Review |
| --- | --- | --- | --- |
| checkout | v6 | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) | v7 restricts unsafe fork checkout on privileged triggers; CI uses push/pull_request. |
| setup-node | v6 | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0) | ESM migration and removed dummy auth token do not affect npm ci without registry auth. |
| cache | v5 | [v6.1.0](https://github.com/actions/cache/releases/tag/v6.1.0) | ESM migration; existing cache inputs remain valid. |
| upload-artifact | v7 | [v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | Retry and dependency fixes; report upload inputs remain valid. |

Actions use their exact latest release tags. The existing `ubuntu-latest`
hosted runners support their Node 24 action runtime.

## Verification

- `npm ci`: clean installation succeeds, including Husky setup; audit reports
  zero vulnerabilities.
- `npm outdated --json`: only the three documented holds (`eslint`,
  `@eslint/js`, and `typescript`) remain.
- `npm run test`: 432 tests pass across 19 files.
- `npm run test:e2e -- --workers=4 --reporter=line`: all 286 existing tests pass
  across Chromium and iPad WebKit.
- `npm run test:e2e -- e2e/pwa.spec.ts --workers=2 --reporter=line`: both new
  offline tests pass (288 browser tests verified in total).
- `npm run type-check`, `npm run build`, `npm run lint`,
  `npm run format:check`, and `npm run spell:check`: pass.
- Production build generates the manifest, service worker, and precache.
  Vite reports a 671.77 kB application chunk above the configured 600 kB
  warning threshold; this is a warning, not a build failure.
- Independent code review: no actionable findings.
