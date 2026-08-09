#!/usr/bin/env node
// Non-blocking pre-commit reminder: if staged files touch app/package source code
// but no doc file is staged in the same commit, print a warning (exit 0 regardless —
// this is a reminder, not a gate; see docs/README.md's ownership rule and
// docs/architecture/TESTING.md for why pre-commit checks stay non-blocking when they
// can't be certain, and CLAUDE.md's "doc-precedes/accompanies-code" rule this enforces).

import { execSync } from 'node:child_process';

const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const isCodeFile = (f) =>
  /^(apps|packages)\/[^/]+\/src\//.test(f) &&
  !f.endsWith('.test.ts') &&
  !f.includes('/generated/');

const isDocFile = (f) =>
  f.startsWith('docs/') ||
  f.endsWith('README.md') ||
  f.endsWith('CLAUDE.md') ||
  f.endsWith('.proto');

const codeFiles = staged.filter(isCodeFile);
const docFiles = staged.filter(isDocFile);

if (codeFiles.length > 0 && docFiles.length === 0) {
  console.warn('\n⚠️  Reminder: source changed, no doc/README/CLAUDE.md staged in this commit.');
  console.warn('   Changed:');
  for (const f of codeFiles) console.warn(`     ${f}`);
  console.warn('   If this commit changes documented behavior, update the relevant doc now —');
  console.warn('   see docs/README.md\'s ownership rule. If it genuinely doesn\'t (refactor,');
  console.warn('   typo fix, test-only change), ignore this.\n');
}

// Always exits 0 — this is a reminder, not a gate. See file header.
process.exit(0);
