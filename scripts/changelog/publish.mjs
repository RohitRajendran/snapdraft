#!/usr/bin/env node
// Runs on every push to main. Adds the merged pull request's "## Changelog" section to
// CHANGELOG.md, then creates a GitHub Release for any entry that doesn't have one yet.
// Safe to re-run: neither step repeats work that's already done.
//
// main only accepts changes through a pull request, so the entry goes in through a small
// pull request that this script opens and merges itself.
//
// Needs GITHUB_REPOSITORY, TARGET_SHA and GH_TOKEN. TARGET_SHA is the merge commit to process.
// With --dry-run it only reads and prints.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  compareReleaseIds,
  formatReleaseDate,
  insertRelease,
  nextReleaseId,
  parseChangelog,
  parsePrChangelog,
  renderReleaseNotes,
} from '../../src/utils/changelog/changelog.ts';

const CHANGELOG = 'CHANGELOG.md';
// Older entries stay in CHANGELOG.md only, so the first run doesn't publish a burst of
// releases with today's date on them.
const FIRST_GITHUB_RELEASE = '2026.11.03';
// GitHub needs a moment to work out whether a new pull request can be merged.
const MERGE_ATTEMPTS = 6;
const MERGE_RETRY_MS = 5000;

const dryRun = process.argv.includes('--dry-run');
const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.TARGET_SHA;

const run = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();
const readReleases = () => parseChangelog(readFileSync(CHANGELOG, 'utf8')).releases;

function mergedPullRequest() {
  const pulls = JSON.parse(run('gh', ['api', `repos/${repo}/commits/${sha}/pulls`]));
  return pulls.find((pull) => pull.merged_at && pull.base.ref === 'main');
}

function returnToMain() {
  run('git', ['fetch', 'origin', 'main']);
  run('git', ['checkout', '--force', '-B', 'main', 'FETCH_HEAD']);
}

function openPullRequest(branch, number) {
  const open = JSON.parse(
    run('gh', ['pr', 'list', '--repo', repo, '--head', branch, '--state', 'open', '--json', 'number']),
  );
  if (open.length > 0) return open[0].number; // Left by an earlier run that failed to merge it.

  const url = run('gh', [
    'pr',
    'create',
    '--repo',
    repo,
    '--base',
    'main',
    '--head',
    branch,
    '--title',
    `Record changelog for #${number}`,
    '--body',
    `Adds the entry for #${number} to CHANGELOG.md.\n\n## Changelog\n\nNone\n`,
  ]);
  return Number(url.split('/').pop());
}

async function mergePullRequest(number) {
  for (let attempt = 1; ; attempt++) {
    try {
      run('gh', ['pr', 'merge', String(number), '--repo', repo, '--squash']);
      return;
    } catch (error) {
      if (attempt === MERGE_ATTEMPTS) throw error;
      await sleep(MERGE_RETRY_MS);
    }
  }
}

async function recordPullRequest(pull) {
  // Dependency bumps have no changelog section and need none.
  if (pull.user?.login === 'dependabot[bot]') return console.log(`#${pull.number}: Dependabot.`);

  const parsed = parsePrChangelog(pull.body ?? '');
  if (parsed.status === 'none') return console.log(`#${pull.number}: changelog says None.`);
  if (parsed.status === 'invalid') {
    // The pull request check already reported this. Don't block publishing anything else.
    return console.log(`::warning::#${pull.number} not recorded: ${parsed.errors.join(' ')}`);
  }

  const markdown = readFileSync(CHANGELOG, 'utf8');
  const { releases } = parseChangelog(markdown);
  if (releases.some((release) => release.pr === pull.number)) {
    return console.log(`#${pull.number}: already recorded.`);
  }

  const id = nextReleaseId(
    pull.merged_at,
    releases.map((release) => release.id),
  );
  const release = { id, pr: pull.number, changes: parsed.changes };
  if (dryRun) return console.log(`Would record ${id}:\n${renderReleaseNotes(release)}`);

  const branch = `changelog/pr-${pull.number}`;
  run('git', ['checkout', '-B', branch]);
  writeFileSync(CHANGELOG, insertRelease(markdown, release));
  run('git', ['add', CHANGELOG]);
  run('git', ['commit', '-m', `Record changelog for #${pull.number}`]);
  run('git', ['push', '--force', 'origin', `HEAD:refs/heads/${branch}`]);

  await mergePullRequest(openPullRequest(branch, pull.number));
  console.log(`#${pull.number}: recorded as ${id}.`);
  returnToMain();
}

function publishMissingReleases() {
  const existing = new Set(
    JSON.parse(run('gh', ['release', 'list', '--repo', repo, '--limit', '1000', '--json', 'tagName'])).map(
      (release) => release.tagName,
    ),
  );
  const releases = readReleases().filter(
    (release) => compareReleaseIds(release.id, FIRST_GITHUB_RELEASE) >= 0,
  );
  const newest = releases[0];
  const target = run('git', ['rev-parse', 'HEAD']);

  // Oldest first, so GitHub lists them in order.
  for (const release of [...releases].reverse()) {
    const tag = `v${release.id}`;
    if (existing.has(tag)) continue;
    if (dryRun) {
      console.log(`Would publish ${tag}:\n${renderReleaseNotes(release)}`);
      continue;
    }
    run('gh', [
      'release',
      'create',
      tag,
      '--repo',
      repo,
      '--target',
      target,
      '--title',
      formatReleaseDate(release.id),
      '--notes',
      renderReleaseNotes(release),
      `--latest=${release === newest}`,
    ]);
    console.log(`Published ${tag}.`);
  }
}

// A failed recording shouldn't hold back releases for entries already on main, and only
// entries that reached main may be published.
let recordError;
try {
  const pull = mergedPullRequest();
  if (pull) await recordPullRequest(pull);
  else console.log(`${sha}: not from a pull request, so there is nothing to record.`);
} catch (error) {
  recordError = error;
  if (!dryRun) returnToMain();
}

publishMissingReleases();
if (recordError) throw recordError;
