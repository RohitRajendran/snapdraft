/**
 * Reads and writes CHANGELOG.md and the `## Changelog` section of a pull request.
 * The app and scripts/changelog/ both use this file, so it must stay free of imports and of
 * any syntax Node can't strip when it runs TypeScript directly.
 */

export const CHANGE_KINDS = ['New', 'Improved', 'Fixed'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export type Changes = Record<ChangeKind, string[]>;

export type Release = {
  /** Merge date as YYYY.MM.DD, with `.2`, `.3` and so on for later releases that day. */
  id: string;
  pr?: number;
  changes: Changes;
};

export type PrChangelog =
  | { status: 'none' }
  | { status: 'entries'; changes: Changes }
  | { status: 'invalid'; errors: string[] };

export const MAX_ITEM_LENGTH = 140;

const REPO_URL = 'https://github.com/RohitRajendran/snapdraft';
const RELEASE_ID = /^\d{4}\.\d{2}\.\d{2}(\.\d+)?$/;
const RELEASE_HEADING = /^## (\d{4}\.\d{2}\.\d{2}(?:\.\d+)?)(?: \(\[#(\d+)\]\([^)]*\)\))?\s*$/;
// Items show as plain text in the app, so markup would appear literally.
const MARKUP = /[`*_[\]<>]/;

function emptyChanges(): Changes {
  return { New: [], Improved: [], Fixed: [] };
}

function isChangeKind(value: string): value is ChangeKind {
  return (CHANGE_KINDS as readonly string[]).includes(value);
}

export function isReleaseId(value: string): boolean {
  return RELEASE_ID.test(value);
}

/** Negative when `a` is older than `b`. A later release on the same day sorts as newer. */
export function compareReleaseIds(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** Parses CHANGELOG.md, newest first. Bad lines are reported rather than thrown, so a bad edit can't stop the app. */
export function parseChangelog(markdown: string): { releases: Release[]; errors: string[] } {
  const releases: Release[] = [];
  const errors: string[] = [];
  let release: Release | undefined;
  let kind: ChangeKind | undefined;

  markdown.split(/\r?\n/).forEach((line, index) => {
    const where = `CHANGELOG.md line ${index + 1}`;
    if (line.startsWith('## ')) {
      const match = RELEASE_HEADING.exec(line);
      kind = undefined;
      release = undefined;
      if (!match) {
        errors.push(`${where}: expected "## YYYY.MM.DD" or "## YYYY.MM.DD ([#1](url))"`);
        return;
      }
      release = { id: match[1], changes: emptyChanges() };
      if (match[2]) release.pr = Number(match[2]);
      releases.push(release);
    } else if (line.startsWith('### ')) {
      const heading = line.slice(4).trim();
      kind = isChangeKind(heading) ? heading : undefined;
      if (!kind) errors.push(`${where}: "${heading}" should be ${CHANGE_KINDS.join(', ')}`);
    } else if (line.startsWith('- ')) {
      if (release && kind) release.changes[kind].push(line.slice(2).trim());
      else errors.push(`${where}: item is outside a release and kind`);
    }
  });

  return { releases, errors };
}

/** Reads the `## Changelog` section of a pull request description. */
export function parsePrChangelog(body: string): PrChangelog {
  const lines = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
  const start = lines.findIndex((line) => /^## changelog$/i.test(line.trim()));
  if (start === -1) {
    return {
      status: 'invalid',
      errors: ['Add a "## Changelog" section, or write "None" in one if users won\'t notice this.'],
    };
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const section = end === -1 ? rest : rest.slice(0, end);

  const firstText = section.find((line) => line.trim() !== '');
  if (firstText && /^none\b/i.test(firstText.trim())) return { status: 'none' };

  const changes = emptyChanges();
  const errors: string[] = [];
  let kind: ChangeKind | undefined;
  let lastItemOpen = false;

  for (const line of section) {
    const heading = /^###\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s*(.*)$/.exec(line);
    if (heading) {
      kind = isChangeKind(heading[1].trim()) ? (heading[1].trim() as ChangeKind) : undefined;
      if (!kind) errors.push(`"${heading[1].trim()}" should be ${CHANGE_KINDS.join(', ')}.`);
      lastItemOpen = false;
    } else if (bullet) {
      lastItemOpen = false;
      if (bullet[1] === '') continue;
      if (!kind) {
        errors.push(`"${bullet[1]}" needs to sit under ${CHANGE_KINDS.join(', ')}.`);
        continue;
      }
      changes[kind].push(bullet[1].trim());
      lastItemOpen = true;
    } else if (lastItemOpen && /^\s+\S/.test(line) && kind) {
      // A bullet wrapped onto an indented line.
      const items = changes[kind];
      items[items.length - 1] += ` ${line.trim()}`;
    } else {
      lastItemOpen = false;
    }
  }

  for (const item of CHANGE_KINDS.flatMap((name) => changes[name])) {
    if (item.length > MAX_ITEM_LENGTH) {
      errors.push(`"${item}" is over ${MAX_ITEM_LENGTH} characters.`);
    }
    if (MARKUP.test(item)) errors.push(`"${item}" should be plain text, with no markup.`);
  }

  if (errors.length > 0) return { status: 'invalid', errors };
  if (CHANGE_KINDS.every((name) => changes[name].length === 0)) {
    return {
      status: 'invalid',
      errors: ['The Changelog section is empty. Add an item, or write "None".'],
    };
  }
  return { status: 'entries', changes };
}

/** The ID for a release merged at `mergedAt`, using the UTC date. */
export function nextReleaseId(mergedAt: string, existingIds: string[]): string {
  const date = mergedAt.slice(0, 10).replaceAll('-', '.');
  const sameDay = existingIds.filter((id) => id === date || id.startsWith(`${date}.`));
  return sameDay.length === 0 ? date : `${date}.${sameDay.length + 1}`;
}

function renderChanges(changes: Changes): string {
  return CHANGE_KINDS.filter((kind) => changes[kind].length > 0)
    .map((kind) => `### ${kind}\n\n${changes[kind].map((item) => `- ${item}`).join('\n')}`)
    .join('\n\n');
}

/** Adds a release above the newest one, keeping the file's introduction at the top. */
export function insertRelease(markdown: string, release: Release): string {
  const link = release.pr ? ` ([#${release.pr}](${REPO_URL}/pull/${release.pr}))` : '';
  const entry = `## ${release.id}${link}\n\n${renderChanges(release.changes)}\n`;
  const firstRelease = markdown.search(/^## /m);
  if (firstRelease === -1) return `${markdown.trimEnd()}\n\n${entry}`;
  return `${markdown.slice(0, firstRelease)}${entry}\n${markdown.slice(firstRelease)}`;
}

/** The body of a GitHub Release. GitHub links `#19` by itself here. */
export function renderReleaseNotes(release: Release): string {
  const source = release.pr ? `\n\nFrom #${release.pr}.` : '';
  return `${renderChanges(release.changes)}${source}`;
}

/** "November 3, 2026". Built from the date's parts so no time zone can shift the day. */
export function formatReleaseDate(id: string): string {
  const [year, month, day] = id.split('.').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
