# Contributing to SnapDraft

Thanks for helping out. Bug reports and ideas are welcome on [GitHub Issues](https://github.com/RohitRajendran/snapdraft/issues). For a larger change, open an issue first so we can agree on the approach before you build it.

SnapDraft is licensed under [GPL-3.0](LICENSE), and contributions are released under the same license.

## Setup

You need Node.js 24.15+ or 26+ (`.nvmrc` selects the Node.js 24 LTS line), Git 2.32+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). To run the end-to-end tests, install their browsers once with `npx playwright install chromium webkit`.

## Making a change

1. Create a branch from `main`.
2. Make the change, and add or update tests for it. Every code change needs tests.
3. Run the checks below.
4. Open a pull request, and fill in the template, including the [changelog section](#changelog).

Pull requests are squash merged, and merging to `main` deploys the site.

## Checks

CI runs all of these. A pre-commit hook also formats, lints and spell-checks the files you've staged.

```bash
npm run format:check
npm run lint
npm run spell:check
npm run type-check
npm run test
npm run test:e2e
```

Unit tests sit next to the files they cover under `src/`. End-to-end tests are in `e2e/` and start their own preview server.

## Changelog

Every pull request needs a `## Changelog` section in its description. When it merges, the section is published to [`CHANGELOG.md`](CHANGELOG.md), [GitHub Releases](https://github.com/RohitRajendran/snapdraft/releases) and the app's Help › Updates tab. You don't need to edit `CHANGELOG.md` yourself.

```markdown
## Changelog

### New
- Draw curved walls.

### Improved
- Box labels fit narrow boxes better.

### Fixed
- Undo restores a deleted door.
```

Delete the headings you don't need.

| Heading | Use it for | Who sees it |
|---|---|---|
| `New` | Something people can now do | Listed, and returning users are told about it when they next open the app |
| `Improved` | Something that already existed works better | Listed |
| `Fixed` | A bug users could have hit | Listed |

If users won't notice the change, write `None` instead of the headings. That covers tests, CI, refactors and most package updates. Nothing is published, and Dependabot pull requests don't need the section at all.

```markdown
## Changelog

None
```

Keep each item to one plain sentence of up to 140 characters, with no markup. Write it for someone using SnapDraft, not for a developer: "Undo restores a deleted door", not "Fix history reducer for openings".

Use `New` sparingly, because it interrupts people. A pull request check tells you if the section is missing or malformed.

## Code guidelines

- Read [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) before changing how anything looks.
- Group each component in its own folder, with its CSS module and tests.
- Keep saved geometry in feet, never pixels.
- Use `stage.getRelativePointerPosition()` for world-coordinate math.
- Prefer `data-testid` selectors in UI tests.
- Don't add a backend or remote storage. Plans stay on the person's device.

## Saved plans and shared links

People have plans saved in their browsers, exported files and share links already out in the world, and these all need to keep opening.

- Prefer changes that older plans and links can safely ignore.
- If a change breaks existing saved plans, bump the plan version and add a tested migration in `src/utils/storage/storage.ts`. Please open an issue first.

## Site pages

- `src/tests/marketingMockups.test.ts` fails when a UI component no longer matches its mockup in `public/home.html`. The component is the source of truth, so update the mockup.
- If a change affects what's collected or stored, update `public/privacy.html` in the same pull request.
