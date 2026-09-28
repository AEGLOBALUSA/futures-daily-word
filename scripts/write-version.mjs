#!/usr/bin/env node
// Runs after `vite build`. Writes dist/version.json so the post-deploy check
// can poll the live site until it has actually picked up the new commit.
// Netlify sets COMMIT_REF during its builds; GitHub Actions sets GITHUB_SHA.
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const commit = process.env.COMMIT_REF || process.env.GITHUB_SHA || 'local';
const version = {
  commit,
  builtAt: new Date().toISOString(),
};

writeFileSync(path.resolve('dist', 'version.json'), JSON.stringify(version, null, 2));
console.log(`Wrote dist/version.json (commit ${commit})`);
