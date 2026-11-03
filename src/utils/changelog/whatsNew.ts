import changelog from '../../../CHANGELOG.md?raw';
import { compareReleaseIds, isReleaseId, parseChangelog, type Release } from './changelog';

/** Bundled with the app, so it works offline and needs no network request. */
export const RELEASES: Release[] = parseChangelog(changelog).releases;

const SEEN_KEY = 'snapdraft_changelog_seen';

/**
 * The "New" items someone hasn't been told about, newest first. Improvements and fixes are
 * listed in the Updates tab but don't prompt anyone.
 *
 * People who used the app before the changelog existed have no marker. They get only the
 * latest news rather than the whole history.
 */
export function unseenHighlights(releases: Release[], seenId: string | null): string[] {
  if (seenId === null || !isReleaseId(seenId)) {
    return releases.find((release) => release.changes.New.length > 0)?.changes.New ?? [];
  }
  return releases
    .filter((release) => compareReleaseIds(release.id, seenId) > 0)
    .flatMap((release) => release.changes.New);
}

export function readUnseenHighlights(): string[] {
  return unseenHighlights(RELEASES, localStorage.getItem(SEEN_KEY));
}

export function markChangelogSeen(): void {
  if (RELEASES.length > 0) localStorage.setItem(SEEN_KEY, RELEASES[0].id);
}
