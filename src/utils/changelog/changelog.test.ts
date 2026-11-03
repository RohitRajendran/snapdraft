import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  MAX_ITEM_LENGTH,
  compareReleaseIds,
  formatReleaseDate,
  insertRelease,
  nextReleaseId,
  parseChangelog,
  parsePrChangelog,
  renderReleaseNotes,
  type Release,
} from './changelog';

const release = (id: string, changes: Partial<Release['changes']> = {}, pr?: number): Release => ({
  id,
  ...(pr ? { pr } : {}),
  changes: { New: [], Improved: [], Fixed: [], ...changes },
});

describe('CHANGELOG.md', () => {
  const markdown = readFileSync('CHANGELOG.md', 'utf8');
  const { releases, errors } = parseChangelog(markdown);

  it('parses without errors', () => {
    expect(errors).toEqual([]);
    expect(releases.length).toBeGreaterThan(0);
  });

  it('lists releases newest first, with no repeated IDs', () => {
    const ids = releases.map((r) => r.id);
    expect(ids).toEqual([...ids].sort((a, b) => compareReleaseIds(b, a)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every item short and in plain text', () => {
    const items = releases.flatMap((r) => Object.values(r.changes).flat());
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.length).toBeLessThanOrEqual(MAX_ITEM_LENGTH);
      expect(item).not.toMatch(/[`*_[\]<>]/);
    }
  });
});

describe('compareReleaseIds', () => {
  it('orders by date', () => {
    expect(compareReleaseIds('2026.03.20', '2026.11.03')).toBeLessThan(0);
    expect(compareReleaseIds('2027.01.01', '2026.12.31')).toBeGreaterThan(0);
  });

  it('treats later releases on the same day as newer', () => {
    expect(compareReleaseIds('2026.11.03.2', '2026.11.03')).toBeGreaterThan(0);
    expect(compareReleaseIds('2026.11.03.10', '2026.11.03.2')).toBeGreaterThan(0);
    expect(compareReleaseIds('2026.11.03', '2026.11.03')).toBe(0);
  });
});

describe('parseChangelog', () => {
  it('reads IDs, pull request numbers and items', () => {
    const { releases, errors } = parseChangelog(
      [
        '# Changelog',
        '',
        '## 2026.11.03.2 ([#20](https://example.com/pull/20))',
        '',
        '### New',
        '',
        '- One',
        '- Two',
        '',
        '### Fixed',
        '',
        '- Three',
        '',
        '## 2026.11.03',
        '',
        '### Improved',
        '',
        '- Four',
      ].join('\n'),
    );
    expect(errors).toEqual([]);
    expect(releases).toEqual([
      release('2026.11.03.2', { New: ['One', 'Two'], Fixed: ['Three'] }, 20),
      release('2026.11.03', { Improved: ['Four'] }),
    ]);
  });

  it('reports bad lines and keeps the good ones', () => {
    const { releases, errors } = parseChangelog(
      [
        '## Soon',
        '- stray',
        '## 2026.11.03',
        '### Removed',
        '- also stray',
        '### New',
        '- Kept',
      ].join('\n'),
    );
    expect(releases).toEqual([release('2026.11.03', { New: ['Kept'] })]);
    expect(errors).toHaveLength(4);
  });

  it('returns nothing for an empty file', () => {
    expect(parseChangelog('')).toEqual({ releases: [], errors: [] });
  });
});

describe('parsePrChangelog', () => {
  const entries = (body: string) => {
    const result = parsePrChangelog(body);
    if (result.status !== 'entries') throw new Error(JSON.stringify(result));
    return result.changes;
  };

  it('reads items by kind and stops at the next section', () => {
    expect(
      entries(
        [
          '## What changed',
          '- Internal detail',
          '## Changelog',
          '### New',
          '- Draw curves',
          '### Fixed',
          '- Undo works',
          '## Testing',
          '- Ran tests',
        ].join('\n'),
      ),
    ).toEqual({ New: ['Draw curves'], Improved: [], Fixed: ['Undo works'] });
  });

  it('handles the Windows line endings GitHub stores in descriptions', () => {
    expect(entries('## Changelog\r\n### New\r\n- Draw curves\r\n').New).toEqual(['Draw curves']);
  });

  it('ignores template comments, empty bullets and text after the list', () => {
    expect(
      entries(
        [
          '## Changelog',
          '<!-- Write for people who use SnapDraft.',
          '- not an item',
          '-->',
          '### New',
          '- Draw curves',
          '### Improved',
          '- ',
          '### Fixed',
          '-',
          '',
          'https://example.com/trailing-link',
        ].join('\n'),
      ),
    ).toEqual({ New: ['Draw curves'], Improved: [], Fixed: [] });
  });

  it('removes a comment that only forms once another is removed', () => {
    expect(
      entries('## Changelog\n<!<!-- a -->-- - hidden -->\n### New\n- Draw curves').New,
    ).toEqual(['Draw curves']);
  });

  it('rejects markup that only forms once a comment is removed', () => {
    expect(parsePrChangelog('## Changelog\n### New\n- <<!-- a -->b>Bold</b>').status).toBe(
      'invalid',
    );
  });

  it('rejects an unclosed comment left in an item', () => {
    expect(parsePrChangelog('## Changelog\n### New\n- Draw <!-- curves').status).toBe('invalid');
  });

  it('joins a bullet wrapped onto an indented line', () => {
    expect(entries('## Changelog\n### New\n- Draw\n  curves').New).toEqual(['Draw curves']);
  });

  it.each(['None', 'none', 'None: only tests changed', '<!-- hi -->\nNone'])(
    'accepts "%s"',
    (text) => {
      expect(parsePrChangelog(`## Changelog\n${text}\n`)).toEqual({ status: 'none' });
    },
  );

  it.each([
    ['no section', 'Just a description'],
    ['an empty section', '## Changelog\n\n## Testing\n- Ran tests'],
    ['an untouched template', '## Changelog\n### New\n- \n### Improved\n- \n### Fixed\n- '],
    ['an unknown kind', '## Changelog\n### Removed\n- Old thing'],
    ['an item with no kind', '## Changelog\n- Draw curves'],
    ['markup', '## Changelog\n### New\n- Press `D` for a door'],
    ['a link', '## Changelog\n### New\n- See [the docs](https://example.com)'],
    ['a long item', `## Changelog\n### New\n- ${'x'.repeat(MAX_ITEM_LENGTH + 1)}`],
  ])('rejects %s', (_name, body) => {
    expect(parsePrChangelog(body).status).toBe('invalid');
  });

  it('allows feet and inches and other everyday punctuation', () => {
    const item = `Type lengths like 5'6" or #3 & more (even 50%), then press Enter.`;
    expect(entries(`## Changelog\n### New\n- ${item}`).New).toEqual([item]);
  });
});

describe('nextReleaseId', () => {
  const mergedAt = '2026-11-03T21:15:00Z';

  it('uses the merge date', () => {
    expect(nextReleaseId(mergedAt, ['2026.10.14'])).toBe('2026.11.03');
  });

  it('numbers later releases on the same day', () => {
    expect(nextReleaseId(mergedAt, ['2026.11.03'])).toBe('2026.11.03.2');
    expect(nextReleaseId(mergedAt, ['2026.11.03.2', '2026.11.03'])).toBe('2026.11.03.3');
  });
});

describe('insertRelease', () => {
  const intro = '# Changelog\n\nIntro text.\n\n';

  it('goes above the newest release and can be read back', () => {
    const before = `${intro}## 2026.10.14\n\n### New\n\n- Colors\n`;
    const after = insertRelease(before, release('2026.11.03', { Fixed: ['Undo works'] }, 19));
    expect(after.startsWith(intro)).toBe(true);
    expect(parseChangelog(after)).toEqual({
      releases: [
        release('2026.11.03', { Fixed: ['Undo works'] }, 19),
        release('2026.10.14', { New: ['Colors'] }),
      ],
      errors: [],
    });
  });

  it('works on a file with no releases yet', () => {
    const after = insertRelease(intro, release('2026.11.03', { New: ['First'] }));
    expect(parseChangelog(after).releases).toEqual([release('2026.11.03', { New: ['First'] })]);
  });
});

describe('renderReleaseNotes', () => {
  it('lists only kinds with items, then the pull request', () => {
    expect(renderReleaseNotes(release('2026.11.03', { New: ['One'], Fixed: ['Two'] }, 19))).toBe(
      '### New\n\n- One\n\n### Fixed\n\n- Two\n\nFrom #19.',
    );
  });

  it('leaves out the source when there is no pull request', () => {
    expect(renderReleaseNotes(release('2026.11.03', { New: ['One'] }))).toBe('### New\n\n- One');
  });
});

describe('formatReleaseDate', () => {
  it('writes the date out, ignoring the same-day number', () => {
    expect(formatReleaseDate('2026.11.03')).toBe('November 3, 2026');
    expect(formatReleaseDate('2026.11.03.2')).toBe('November 3, 2026');
    expect(formatReleaseDate('2026.01.01')).toBe('January 1, 2026');
  });
});
