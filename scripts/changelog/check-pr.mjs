#!/usr/bin/env node
// Checks the "## Changelog" section of a pull request. The description arrives in PR_BODY.
import { parsePrChangelog } from '../../src/utils/changelog/changelog.ts';

const result = parsePrChangelog(process.env.PR_BODY ?? '');

if (result.status === 'invalid') {
  for (const error of result.errors) console.log(`::error title=Changelog::${error}`);
  process.exit(1);
}

console.log(
  result.status === 'none'
    ? 'Changelog: None, so nothing will be published.'
    : `Changelog entries to publish:\n${JSON.stringify(result.changes, null, 2)}`,
);
