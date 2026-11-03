import { beforeEach, describe, expect, it } from 'vitest';
import type { Release } from './changelog';
import { RELEASES, markChangelogSeen, readUnseenHighlights, unseenHighlights } from './whatsNew';

const release = (id: string, changes: Partial<Release['changes']> = {}): Release => ({
  id,
  changes: { New: [], Improved: [], Fixed: [], ...changes },
});

const releases = [
  release('2026.11.03.2', { Fixed: ['A fix'] }),
  release('2026.11.03', { New: ['Corners'], Improved: ['Labels'] }),
  release('2026.10.14', { New: ['Colors'] }),
  release('2026.05.05', { New: ['Doors', 'Windows'] }),
];

describe('unseenHighlights', () => {
  it('returns new items from every release since the last one seen, newest first', () => {
    expect(unseenHighlights(releases, '2026.05.05')).toEqual(['Corners', 'Colors']);
  });

  it('returns nothing once the newest release has been seen', () => {
    expect(unseenHighlights(releases, '2026.11.03.2')).toEqual([]);
  });

  it('does not prompt for improvements or fixes alone', () => {
    expect(unseenHighlights(releases, '2026.11.03')).toEqual([]);
  });

  it('counts a later release on the same day as unseen', () => {
    const sameDay = [release('2026.11.03.2', { New: ['Later'] }), release('2026.11.03')];
    expect(unseenHighlights(sameDay, '2026.11.03')).toEqual(['Later']);
  });

  it('shows only the latest news to someone with no marker', () => {
    expect(unseenHighlights(releases, null)).toEqual(['Corners']);
  });

  it('treats a corrupt marker as no marker', () => {
    expect(unseenHighlights(releases, 'garbage')).toEqual(['Corners']);
  });

  it('copes with a marker for a release no longer listed', () => {
    expect(unseenHighlights(releases, '2026.11.01')).toEqual(['Corners']);
  });

  it('returns nothing when there are no releases', () => {
    expect(unseenHighlights([], null)).toEqual([]);
    expect(unseenHighlights([], '2026.11.03')).toEqual([]);
  });
});

describe('seen marker', () => {
  beforeEach(() => localStorage.clear());

  it('clears the highlights once marked as seen', () => {
    expect(readUnseenHighlights().length).toBeGreaterThan(0);
    markChangelogSeen();
    expect(readUnseenHighlights()).toEqual([]);
    expect(localStorage.getItem('snapdraft_changelog_seen')).toBe(RELEASES[0].id);
  });
});
