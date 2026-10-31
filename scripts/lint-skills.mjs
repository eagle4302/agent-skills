#!/usr/bin/env node
// Structural lint for this skills repo. See README.md, "Linting".
//
//   node scripts/lint-skills.mjs            # errors fail the run, warnings are reported
//   node scripts/lint-skills.mjs --strict   # warnings fail too (CI / before a sync)
//   node scripts/lint-skills.mjs --json     # machine-readable result
//
// Exit codes: 0 clean, 1 problems, 2 usage error.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const allowed = new Set(['--strict', '--json']);
for (const arg of argv) {
  if (!allowed.has(arg)) {
    console.error('usage: node scripts/lint-skills.mjs [--strict] [--json]');
    process.exit(2);
  }
}
const strict = argv.includes('--strict');
const jsonMode = argv.includes('--json');

const errors = [];
const warnings = [];
const infos = [];
const err = (check, msg) => errors.push({ check, msg });
const warn = (check, msg) => warnings.push({ check, msg });
const info = (check, msg) => infos.push({ check, msg });

const SKIP_DIRS = new Set(['.git', 'synced', 'node_modules']);
const ALLOWED_STATES = new Set(['verbatim', 'modified', 'divergent', 'local-only', 'hold']);
const MAX_DESCRIPTION = 1024;
// Frontmatter fields and common lookalikes that are never skill names.
const NON_SKILL_NAMES = new Set(['disable-model-invocation', 'argument-hint', 'allowed-tools']);

const read = (path) => readFileSync(path, 'utf8').replace(/^\uFEFF/, '');

// ---------------------------------------------------------------- frontmatter

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const out = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const found = lines[i].match(/^([A-Za-z_][\w.-]*):(.*)$/);
    if (!found) continue;
    const key = found[1];
    let value = found[2].trim();
    if (['>', '>-', '>+', '|', '|-', '|+'].includes(value)) {
      const block = [];
      while (i + 1 < lines.length && (lines[i + 1].trim() === '' || /^\s/.test(lines[i + 1]))) {
        i += 1;
        block.push(lines[i].trim());
      }
      value = block.filter(Boolean).join(value.startsWith('|') ? '\n' : ' ');
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, predicate, out);
    else if (predicate(entry.name)) out.push(path);
  }
  return out;
}

// ---------------------------------------------------------------- skills

const skillDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(ROOT, name, 'SKILL.md')))
  .sort();
const installed = new Set(skillDirs);
const frontmatters = new Map();
let userInvoked = 0;

for (const dir of skillDirs) {
  const fm = parseFrontmatter(read(join(ROOT, dir, 'SKILL.md')));
  if (!fm) {
    err('frontmatter', `${dir}/SKILL.md: no frontmatter block`);
    continue;
  }
  frontmatters.set(dir, fm);
  if (fm.name !== dir) err('frontmatter', `${dir}: name "${fm.name ?? ''}" does not match the directory`);
  if (!fm.description) {
    err('frontmatter', `${dir}: missing description; the skill is silently skipped`);
  } else if (fm.description.length > MAX_DESCRIPTION) {
    err('frontmatter', `${dir}: description is ${fm.description.length} chars (limit ${MAX_DESCRIPTION})`);
  }
  if (fm['disable-model-invocation'] === 'true') userInvoked += 1;
}

// ---------------------------------------------------------------- layout

for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
  const skillRoot = join(ROOT, entry.name);
  for (const path of walk(skillRoot, (name) => name === 'SKILL.md')) {
    if (dirname(path) !== skillRoot) {
      err('layout', `nested SKILL.md: ${relative(ROOT, path).replace(/\\/g, '/')}`);
    }
  }
}

// ---------------------------------------------------------------- invocation

for (const dir of skillDirs) {
  const fm = frontmatters.get(dir);
  if (!fm) continue;
  const dmi = fm['disable-model-invocation'] === 'true';
  const yamlPath = join(ROOT, dir, 'agents', 'openai.yaml');
  const hasYaml = existsSync(yamlPath);
  const implicitFalse = hasYaml && /allow_implicit_invocation:\s*false/.test(read(yamlPath));
  if (dmi && !hasYaml) {
    warn('invocation', `${dir}: disable-model-invocation is true but there is no agents/openai.yaml; Codex may still auto-invoke it`);
  }
  if (dmi && hasYaml && !implicitFalse) {
    err('invocation', `${dir}: disable-model-invocation is true but agents/openai.yaml does not set allow_implicit_invocation: false`);
  }
  if (!dmi && implicitFalse) {
    err('invocation', `${dir}: agents/openai.yaml says user-invoked but the frontmatter has no disable-model-invocation: true`);
  }
}

// ---------------------------------------------------------------- manifest

const manifestRows = [];
const manifestPath = join(ROOT, 'scripts', 'skill-sources.tsv');
if (!existsSync(manifestPath)) {
  err('manifest', 'scripts/skill-sources.tsv is missing');
} else {
  for (const line of read(manifestPath).split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const columns = line.split('\t');
    if (columns.length < 6) {
      err('manifest', `malformed row: ${line.slice(0, 60)}`);
      continue;
    }
    manifestRows.push({
      dir: columns[0],
      source: columns[1],
      upstream: columns[2],
      sha: columns[3],
      state: columns[4],
      note: columns.slice(5).join('\t'),
    });
  }
}

const seenRows = new Set();
const stateCounts = {};
for (const row of manifestRows) {
  stateCounts[row.state] = (stateCounts[row.state] ?? 0) + 1;
  if (seenRows.has(row.dir)) err('manifest', `duplicate row: ${row.dir}`);
  seenRows.add(row.dir);
  if (!ALLOWED_STATES.has(row.state)) err('manifest', `${row.dir}: unknown local_state "${row.state}"`);
  if (!installed.has(row.dir)) err('manifest', `${row.dir}: manifest row has no skill directory`);
  if (row.state === 'local-only') {
    if (row.source !== '-') err('manifest', `${row.dir}: local-only rows need "-" in the source column`);
  } else {
    if (row.source === '-') err('manifest', `${row.dir}: state ${row.state} needs an upstream source`);
    if (!/^[0-9a-f]{40}$/.test(row.sha)) err('manifest', `${row.dir}: pinned_sha is not a 40-char commit sha`);
  }
}
for (const dir of skillDirs) {
  if (!seenRows.has(dir)) err('manifest', `${dir}: skill directory has no manifest row`);
}

// ---------------------------------------------------------------- README counts

const readme = read(join(ROOT, 'README.md'));
const localOnly = stateCounts['local-only'] ?? 0;
const readmeClaims = [
  ['holds (\\d+) skills', skillDirs.length, 'skill count'],
  ['local-only skills[^|]*\\| — \\| (\\d+)', localOnly, 'local-only count'],
  ['(\\d+) of the skills here carry', userInvoked, 'disable-model-invocation count'],
];
for (const [pattern, actual, label] of readmeClaims) {
  const match = readme.match(new RegExp(pattern));
  if (!match) {
    warn('readme', `cannot find the ${label} claim in README.md`);
  } else if (Number(match[1]) !== actual) {
    err('readme', `README.md says ${label} is ${match[1]}, the tree has ${actual}`);
  }
}

// ---------------------------------------------------------------- local edits

const needsSentinel = manifestRows
  .filter((row) => row.state === 'modified' || row.state === 'divergent')
  .map((row) => row.dir);
const editsPath = join(ROOT, 'scripts', 'local-edits.json');
let editSkills = {};
if (!existsSync(editsPath)) {
  err('local-edits', 'scripts/local-edits.json is missing');
} else {
  try {
    editSkills = JSON.parse(read(editsPath)).skills ?? {};
  } catch (parseError) {
    err('local-edits', `scripts/local-edits.json is not valid JSON: ${parseError.message}`);
  }
}
for (const dir of needsSentinel) {
  const entry = editSkills[dir];
  if (!entry) {
    err('local-edits', `${dir}: manifest state is modified/divergent but local-edits.json has no entry`);
    continue;
  }
  if (entry.skip) {
    if (!entry.reason) warn('local-edits', `${dir}: skipped entry has no reason`);
    continue;
  }
  const checks = Array.isArray(entry.checks) ? entry.checks : [];
  if (checks.length === 0) {
    err('local-edits', `${dir}: entry has no checks`);
    continue;
  }
  for (const check of checks) {
    const rel = check.file ?? check.path;
    if (!rel) {
      err('local-edits', `${dir}: check without file/path`);
      continue;
    }
    const path = join(ROOT, dir, rel);
    if (check.path) {
      if (check.exists && !existsSync(path)) err('local-edits', `${dir}: missing ${rel}`);
      if (check.absent && existsSync(path)) err('local-edits', `${dir}: ${rel} should have been deleted`);
      continue;
    }
    if (!existsSync(path)) {
      err('local-edits', `${dir}: missing ${rel}`);
      continue;
    }
    const body = read(path);
    if (check.contains && !body.includes(check.contains)) {
      err('local-edits', `${dir}/${rel}: local edit missing ("${check.contains}")`);
    }
    if (check.notContains && body.includes(check.notContains)) {
      err('local-edits', `${dir}/${rel}: "${check.notContains}" should not be present`);
    }
  }
}
for (const key of Object.keys(editSkills)) {
  if (!needsSentinel.includes(key)) {
    err('local-edits', `${key}: stale entry (manifest does not mark it modified/divergent)`);
  }
}

// ---------------------------------------------------------------- patches

const patchesDir = join(ROOT, 'patches');
const skippedEdits = new Set(
  Object.entries(editSkills)
    .filter(([, entry]) => entry.skip)
    .map(([name]) => name),
);
const expectedPatches = manifestRows
  .filter((row) => row.state === 'modified' && !skippedEdits.has(row.dir))
  .map((row) => `${row.dir}.patch`);
if (expectedPatches.length > 0 && !existsSync(patchesDir)) {
  err('patches', 'patches/ is missing; run node scripts/make-patches.mjs');
} else if (existsSync(patchesDir)) {
  for (const name of expectedPatches) {
    const patchPath = join(patchesDir, name);
    if (!existsSync(patchPath)) {
      err('patches', `missing patches/${name} (run node scripts/make-patches.mjs)`);
      continue;
    }
    const check = spawnSync('git', ['apply', '-R', '--check', patchPath], { cwd: ROOT, encoding: 'utf8' });
    if (check.status !== 0) {
      err('patches', `patches/${name} does not match the tree (regenerate with node scripts/make-patches.mjs)`);
    }
  }
  for (const name of readdirSync(patchesDir).filter((file) => file.endsWith('.patch'))) {
    if (!expectedPatches.includes(name)) warn('patches', `patches/${name} has no matching modified skill`);
  }
}

// ---------------------------------------------------------------- dangling references

const allowPath = join(ROOT, 'scripts', 'known-absent-refs.txt');
const allow = new Set();
if (existsSync(allowPath)) {
  for (const line of read(allowPath).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    allow.add(trimmed.split(/\s+/)[0].replace(/^@/, ''));
  }
}
const allowUsed = new Set();
const unknownRefs = new Map();
const mdFiles = [];
for (const dir of skillDirs) walk(join(ROOT, dir), (name) => name.toLowerCase().endsWith('.md'), mdFiles);

const atPattern = /@([a-z][a-z0-9]+(?:-[a-z0-9]+)+)(?![a-z0-9/_-])/g;
const tickPattern = /`([a-z][a-z0-9]+(?:-[a-z0-9]+)+)`/g;
for (const file of mdFiles) {
  let inFence = false;
  let section = '';
  for (const line of read(file).split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s/.test(line)) section = line;
    const skillContext = /skill/i.test(line) || /skill/i.test(section);
    if (!skillContext) continue;
    const candidates = [];
    for (const match of line.matchAll(atPattern)) {
      if (line[match.index + match[0].length] === '(') continue;
      candidates.push(match[1]);
    }
    for (const match of line.matchAll(tickPattern)) candidates.push(match[1]);
    for (const name of candidates) {
      if (installed.has(name) || NON_SKILL_NAMES.has(name)) continue;
      if (allow.has(name)) {
        allowUsed.add(name);
        continue;
      }
      if (!unknownRefs.has(name)) unknownRefs.set(name, []);
      unknownRefs.get(name).push(`${relative(ROOT, file).replace(/\\/g, '/')}: ${line.trim().slice(0, 90)}`);
    }
  }
}
for (const [name, locations] of unknownRefs) {
  warn('references', `${name} is not an installed skill — ${locations[0]}${locations.length > 1 ? ` (+${locations.length - 1} more)` : ''}`);
}
for (const name of allow) {
  if (!allowUsed.has(name)) warn('references', `known-absent-refs.txt lists ${name}, but nothing references it any more`);
}

// ---------------------------------------------------------------- description triggers (info only)

for (const dir of skillDirs) {
  const fm = frontmatters.get(dir);
  if (!fm?.description || fm['disable-model-invocation'] === 'true') continue;
  if (!/(use|when|user|用|問|適用)/i.test(fm.description)) {
    info('description', `${dir}: description may lack a trigger ("${fm.description.slice(0, 80)}")`);
  }
}

// ---------------------------------------------------------------- output

const summary = {
  skills: skillDirs.length,
  modelInvoked: skillDirs.length - userInvoked,
  userInvoked,
  manifestRows: manifestRows.length,
  states: stateCounts,
};
const failed = errors.length > 0 || (strict && warnings.length > 0);

if (jsonMode) {
  console.log(JSON.stringify({ summary, errors, warnings, infos, failed }, null, 2));
} else {
  console.log(`Skills lint — ${ROOT}`);
  console.log(`skills: ${summary.skills} (${summary.modelInvoked} model-invoked, ${summary.userInvoked} user-invoked)`);
  console.log(`manifest: ${summary.manifestRows} rows (${Object.entries(stateCounts).map(([key, value]) => `${key} ${value}`).join(', ')})`);
  for (const entry of infos) console.log(`INFO  ${entry.msg}`);
  for (const entry of warnings) console.log(`WARN  ${entry.msg}`);
  for (const entry of errors) console.log(`ERROR ${entry.msg}`);
  console.log(failed ? `\nFAIL: ${errors.length} error(s), ${warnings.length} warning(s)` : '\nOK');
}

process.exit(failed ? 1 : 0);
