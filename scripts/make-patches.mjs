#!/usr/bin/env node
// Generate the local-edit patches under patches/ from the pinned upstream trees.
//
//   node scripts/make-patches.mjs           # regenerate patches/<skill>.patch
//   node scripts/make-patches.mjs --check   # compare, write nothing; exit 1 on drift
//
// Only manifest rows with local_state `modified` get a patch. `divergent` skills are rewritten
// bodies (README: treat upstream as a source of ideas), `hold` skills are deliberately pinned, and
// rows whose local-edits entry has `skip: true` have no hand edit to re-apply.
//
// Upstream trees come from the clones scripts/check-skill-updates.sh caches under
// $HOME/.cache/pi-skill-updates (override with PI_SKILLS_CACHE). Run that script online at least
// once before the first generation.

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.PI_SKILLS_CACHE || join(homedir(), '.cache', 'pi-skill-updates');
const CHECK_ONLY = process.argv.includes('--check');
const SKIP_FILES = /(^|\/)(\.rea\.backup|node_modules|\.git)$/;

const failures = [];
const written = [];
const skipped = [];

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options });
}

function git(cacheDir, args, options = {}) {
  return run('git', ['-C', cacheDir, ...args], options);
}

function readManifest() {
  const rows = [];
  for (const line of readFileSync(join(ROOT, 'scripts', 'skill-sources.tsv'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const columns = line.split('\t');
    if (columns.length < 6) continue;
    rows.push({ dir: columns[0], source: columns[1], upstream: columns[2], sha: columns[3], state: columns[4] });
  }
  return rows;
}

function loadSkipSet() {
  const file = join(ROOT, 'scripts', 'local-edits.json');
  if (!existsSync(file)) return new Set();
  const edits = JSON.parse(readFileSync(file, 'utf8')).skills ?? {};
  return new Set(Object.entries(edits).filter(([, entry]) => entry.skip).map(([name]) => name));
}

function walkFiles(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const rel = relative(base, path).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (SKIP_FILES.test(rel)) continue;
      walkFiles(path, base, out);
    } else if (!SKIP_FILES.test(rel)) {
      out.push({ path, rel });
    }
  }
  return out;
}

function normalizedBuffer(path) {
  const buffer = readFileSync(path);
  if (buffer.includes(0)) return buffer; // binary: leave untouched, diff uses --binary
  return Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function main() {
  const rows = readManifest().filter((row) => row.state === 'modified');
  const skip = loadSkipSet();
  mkdirSync(join(ROOT, 'patches'), { recursive: true });

  for (const row of rows) {
    if (skip.has(row.dir)) {
      skipped.push(`${row.dir} (no local edit to re-apply)`);
      continue;
    }
    const cacheDir = join(CACHE, row.source.replace('/', '__'));
    if (!existsSync(join(cacheDir, '.git'))) {
      failures.push(`${row.dir}: no upstream clone at ${cacheDir}; run scripts/check-skill-updates.sh online once`);
      continue;
    }
    if (git(cacheDir, ['rev-parse', '--verify', '--quiet', `${row.sha}^{commit}`]).status !== 0) {
      failures.push(`${row.dir}: pinned ${row.sha.slice(0, 7)} is not in ${cacheDir}`);
      continue;
    }
    const listing = git(cacheDir, ['ls-tree', '-r', '--name-only', row.sha, row.upstream]);
    if (listing.status !== 0) {
      failures.push(`${row.dir}: ${row.upstream} does not exist at ${row.sha.slice(0, 7)}`);
      continue;
    }
    const upstreamFiles = listing.stdout.split(/\r?\n/).filter(Boolean);
    if (upstreamFiles.length === 0) {
      failures.push(`${row.dir}: pinned tree is empty`);
      continue;
    }

    const work = mkdtempSync(join(tmpdir(), 'skill-patch-'));
    try {
      const aDir = join(work, 'a', row.dir);
      const bDir = join(work, 'b', row.dir);
      mkdirSync(aDir, { recursive: true });
      mkdirSync(bDir, { recursive: true });
      for (const file of upstreamFiles) {
        const rel = file.slice(row.upstream.length + 1);
        if (!rel) continue;
        const blob = git(cacheDir, ['show', `${row.sha}:${file}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
        if (blob.status !== 0) {
          failures.push(`${row.dir}: cannot read ${file} at ${row.sha.slice(0, 7)}`);
          continue;
        }
        const target = join(aDir, rel);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, blob.stdout);
      }
      for (const file of walkFiles(join(ROOT, row.dir))) {
        const target = join(bDir, file.rel);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, normalizedBuffer(file.path));
      }

      const diff = run(
        'git',
        ['-C', work, 'diff', '--no-index', '--binary', '--src-prefix=', '--dst-prefix=', '--', `a/${row.dir}`, `b/${row.dir}`],
        { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
      );
      if (diff.status === 0) {
        failures.push(`${row.dir}: marked modified but the tree matches upstream`);
        continue;
      }
      if (diff.status !== 1) {
        failures.push(`${row.dir}: git diff failed: ${String(diff.stderr ?? '').slice(0, 200)}`);
        continue;
      }
      const patch = Buffer.from(diff.stdout).toString('utf8').replace(/\r\n/g, '\n');
      const patchPath = join(ROOT, 'patches', `${row.dir}.patch`);
      if (CHECK_ONLY) {
        const current = existsSync(patchPath) ? readFileSync(patchPath, 'utf8').replace(/\r\n/g, '\n') : null;
        if (current !== patch) failures.push(`${row.dir}: patches/${row.dir}.patch is stale`);
      } else {
        writeFileSync(patchPath, patch);
        written.push(row.dir);
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }

  const stale = readdirSync(join(ROOT, 'patches')).filter((name) => name.endsWith('.patch'));
  const expected = new Set(rows.filter((row) => !skip.has(row.dir)).map((row) => `${row.dir}.patch`));
  for (const name of stale) {
    if (!expected.has(name)) failures.push(`patches/${name}: no matching modified skill`);
  }

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} problem(s)`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(CHECK_ONLY ? `OK: ${expected.size} patch(es) up to date` : `wrote ${written.length} patch(es)`);
  for (const name of skipped) console.log(`skipped ${name}`);
}

main();
