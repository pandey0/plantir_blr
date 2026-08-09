// Drift check, NOT a doc generator — see docs/architecture/TECH_STACK.md decision log for
// why this pivoted from the originally-planned full regeneration of
// docs/api/intelligence-engine.md. That doc has accumulated substantial hand-written value
// (known bugs, cross-references, auth caveats) a bare manifest-driven generator can't
// reproduce; overwriting it would be a regression. This only verifies every route in
// routes/manifest.ts has a documented "METHOD /path" heading somewhere in the doc, and fails
// loudly (non-zero exit) if one is missing — it does not check the reverse (a documented route
// that's been removed from the manifest would not be caught here; that's a much rarer mistake
// and would show up immediately as a 404 in normal use, unlike an undocumented new route).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { routeManifest } from '../src/routes/manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docPath = join(__dirname, '../../../docs/api/intelligence-engine.md');
const doc = readFileSync(docPath, 'utf8');

const missing = routeManifest
  .map((entry) => `${entry.method} ${entry.path}`)
  .filter((heading) => !doc.includes(heading));

if (missing.length > 0) {
  console.error('docs/api/intelligence-engine.md is missing documentation for:');
  for (const heading of missing) console.error(`  - ${heading}`);
  console.error('\nAdd a "### `METHOD /path`" section for each — see docs/README.md\'s ownership rule.');
  process.exit(1);
}

console.log(`docs/api/intelligence-engine.md covers all ${routeManifest.length} routes in routes/manifest.ts. OK.`);
process.exit(0);
