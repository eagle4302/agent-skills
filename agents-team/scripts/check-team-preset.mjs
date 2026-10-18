#!/usr/bin/env node
// Structural check for the agents-team DSH preset patch.
//
//   node check-team-preset.mjs --modules <node_modules dir> [--team <team.patch.yml>]
//                              [--shipped <standard.patch.yml>] [--install <cordis.patch.yml>]
//
// --modules  a node_modules tree that carries the `yaml` package (e.g. the DSH
//            profile's). Only the parser comes from here: the packaged DSH app
//            resolves its plugins from app.asar, which node cannot read as a
//            directory, so package resolution is not checked.
// --team     the patch this repo ships (default: ../preset/team.patch.yml)
// --shipped  the DSH `standard.patch.yml` to hold the lead against, for drift
//            (default: ../preset/reference/standard-0.2.1-rc.2.patch.yml, the
//            file the desktop app ships inside app.asar; refresh it on upgrade)
// --install  a profile's cordis.patch.yml that should already carry the rows
//
// Exit codes: 0 ok · 1 problems · 2 usage error.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const modulesDir = flag('--modules', '');
const teamPath = resolve(flag('--team', join(scriptDir, '..', 'preset', 'team.patch.yml')));
const shippedPath = resolve(flag('--shipped', join(scriptDir, '..', 'preset', 'reference', 'standard-0.2.1-rc.2.patch.yml')));
const installPath = flag('--install', '');

if (!modulesDir) {
  console.error('usage: check-team-preset.mjs --modules <node_modules dir> [--team <file>] [--shipped <file>] [--install <file>]');
  process.exit(2);
}

const require = createRequire(join(resolve(modulesDir), 'noop.js'));
let YAML;
try {
  YAML = require('yaml');
} catch (err) {
  console.error(`cannot load the "yaml" package from ${modulesDir}: ${err.message}`);
  process.exit(2);
}

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// `!!js` is a Loader tag this parser does not resolve; the expression itself is
// irrelevant to structure, so drop the tag and keep the scalar.
const parse = (path) => YAML.parse(readFileSync(path, 'utf8').replace(/!!js\s/g, ''));

// Flatten a plugin entry list into `{ id, name }` rows, descending into groups.
const flatten = (plugins, out = []) => {
  for (const row of plugins ?? []) {
    if (row === null || typeof row !== 'object') continue;
    if (row.id !== undefined || row.name !== undefined) out.push({ id: row.id, name: row.name });
    if (Array.isArray(row.config)) flatten(row.config, out);
  }
  return out;
};

const ROLES = ['team-scout', 'team-builder', 'team-prober', 'team-critic', 'team-scribe'];
const READ_ONLY = new Set(['team-scout', 'team-prober', 'team-critic']);
const NO_SHELL = new Set(['team-critic']);
const SHELL_NAMES = new Set(['@deepseek-ai/dsh-tool-bash', '@deepseek-ai/dsh-tool-pwsh']);
// Shipped rows a preset may reasonably omit: both ship disabled.
const SHIPPED_OMISSIONS = new Set(['tool-plugin-manager', 'tool-plugin-market']);

// ── parse ───────────────────────────────────────────────────────────────────

if (!existsSync(teamPath) || !statSync(teamPath).isFile()) {
  console.error(`--team does not exist: ${teamPath}`);
  process.exit(2);
}

let doc;
try {
  doc = parse(teamPath);
} catch (err) {
  console.error(`team patch does not parse: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(doc)) fail('the patch must be a YAML list of loader patch entries');
const insert = doc.find?.((entry) => Array.isArray(entry?.insert))?.insert;
if (!Array.isArray(insert)) {
  fail('no `insert:` list found');
  report();
}

const rows = insert.filter((row) => typeof row === 'object' && row !== null);
const presets = rows.filter((row) => row.name === '@deepseek-ai/dsh-agent-preset');
if (presets.length !== ROLES.length + 1) fail(`expected ${ROLES.length + 1} preset rows (5 roles + lead), found ${presets.length}`);
if (rows.length !== presets.length) fail(`every inserted row must be a @deepseek-ai/dsh-agent-preset; found ${rows.length - presets.length} other row(s)`);

// ── each preset: identity, plugin names, module resolution ───────────────────

const declared = new Map();
for (const row of presets) {
  const cfg = row.config ?? {};
  if (typeof cfg.id !== 'string' || cfg.id === '') fail(`${row.id}: config.id is required`);
  if (typeof cfg.name !== 'string' || cfg.name === '') warn(`${row.id}: config.name is empty; the picker shows nothing`);
  if (!Number.isInteger(cfg.order)) warn(`${row.id}: config.order is not an integer`);
  if (!Array.isArray(cfg.plugins)) {
    fail(`${row.id}: config.plugins must be a list`);
    continue;
  }
  declared.set(cfg.id, row.id);

  for (const plugin of cfg.plugins) {
    const name = plugin?.name;
    if (typeof name !== 'string') {
      fail(`${row.id}: a plugin row has no name`);
      continue;
    }
    if (name === 'cordis:group') continue;
    if (!name.startsWith('@deepseek-ai/')) fail(`${row.id}: unexpected plugin ${name}`);
  }
}

const duplicates = [...declared.entries()].filter(([id], i, all) => all.findIndex(([other]) => other === id) !== i);
for (const [id] of duplicates) fail(`duplicate preset id: ${id}`);

for (const role of ROLES) if (!declared.has(role)) fail(`missing role preset: ${role}`);
if (!declared.has('team')) fail('missing lead preset id `team`');

// ── role invariants ─────────────────────────────────────────────────────────

for (const row of presets) {
  const cfg = row.config ?? {};
  if (!ROLES.includes(cfg.id)) continue;
  const plugins = cfg.plugins ?? [];
  const names = new Set(plugins.map((p) => p?.name).filter(Boolean));

  if (names.has('@deepseek-ai/dsh-tool-subagent')) fail(`${cfg.id}: a role must not mount delegation`);
  if (!names.has('@deepseek-ai/dsh-persona')) fail(`${cfg.id}: no persona row`);
  if (!names.has('@deepseek-ai/dsh-agent-instructions')) warn(`${cfg.id}: no agent-instructions row; the child will not be told the project rules it can read`);

  const fsRow = plugins.find((p) => p?.name === '@deepseek-ai/dsh-tool-fs');
  if (READ_ONLY.has(cfg.id)) {
    if (!fsRow) fail(`${cfg.id}: read-only role must mount dsh-tool-fs`);
    else if (fsRow.config?.write !== false || fsRow.config?.edit !== false) {
      fail(`${cfg.id}: dsh-tool-fs must set write: false and edit: false (found ${JSON.stringify(fsRow.config ?? {})})`);
    }
  }
  if (NO_SHELL.has(cfg.id)) {
    for (const name of SHELL_NAMES) if (names.has(name)) fail(`${cfg.id}: must not mount ${name}`);
  }
  if (names.has('@deepseek-ai/dsh-tool-pwsh') && READ_ONLY.has(cfg.id)) {
    warn(`${cfg.id}: shell can still write; "read-only" here means no file tools, and the lead's diff check stays the backstop`);
  }
}

// ── lead invariants ─────────────────────────────────────────────────────────

const lead = presets.find((row) => row.config?.id === 'team');
if (lead) {
  const plugins = lead.config.plugins ?? [];
  const delegation = plugins.find((p) => p?.id === 'delegation');
  if (!delegation || !Array.isArray(delegation.config)) fail('lead: no `delegation` group');
  else {
    const spawn = delegation.config.find((p) => p?.id === 'tool-subagent');
    if (!spawn) fail('lead: delegation group has no tool-subagent row');
    else {
      const cfg = spawn.config ?? {};
      if (cfg.provider !== 'spawn') fail('lead: tool-subagent must use provider: spawn (preset selection needs in-process spawn)');
      if (cfg.toolName !== 'subagent') fail(`lead: tool-subagent toolName is ${cfg.toolName}; the skill briefs call it \`subagent\``);
      if (cfg.maxDepth !== 1) fail(`lead: maxDepth must be 1 so a teammate cannot recruit its own helpers (found ${cfg.maxDepth})`);
      const allowed = cfg.allowedAgentPresets;
      if (!Array.isArray(allowed)) fail('lead: allowedAgentPresets is missing');
      else {
        const missing = ROLES.filter((id) => !allowed.includes(id));
        const extra = allowed.filter((id) => !ROLES.includes(id));
        if (missing.length) fail(`lead: allowedAgentPresets omits ${missing.join(', ')}`);
        if (extra.length) fail(`lead: allowedAgentPresets names undeclared presets: ${extra.join(', ')}`);
        if (allowed.length !== new Set(allowed).size) fail('lead: allowedAgentPresets has duplicates');
      }
      if (cfg.persona !== undefined || cfg.toolFilter !== undefined) {
        fail('lead: persona/toolFilter on the subagent tool is rejected by DSH 0.1.5-rc.2');
      }
    }
    const fork = delegation.config.find((p) => p?.id === 'tool-subagent-fork');
    if (!fork) warn('lead: no tool-subagent-fork row; forked children are unavailable');
    else if (fork.config?.allowedAgentPresets || fork.config?.agentPreset) {
      fail('lead: fork rejects preset selection; remove it from tool-subagent-fork');
    }
  }
  if (!flatten(plugins).some((row) => row.name === '@deepseek-ai/dsh-tool-workflow')) warn('lead: no tool-workflow row; stage fan-out is unavailable');
}

// ── drift against a shipped standard preset ─────────────────────────────────

if (shippedPath) {
  if (!existsSync(shippedPath)) {
    fail(`--shipped does not exist: ${shippedPath}`);
  } else {
    let shippedDoc;
    try {
      shippedDoc = parse(shippedPath);
    } catch (err) {
      fail(`shipped preset does not parse: ${err.message}`);
    }
    const shippedRows = shippedDoc?.find?.((entry) => Array.isArray(entry?.insert))?.insert ?? [];
    const standard = shippedRows.find((row) => row.config?.id === 'standard');
    const shipped = flatten(standard?.config?.plugins ?? []);
    const team = flatten(lead?.config?.plugins ?? []);
    const teamIds = new Set(team.map((row) => row.id).filter(Boolean));
    const missing = shipped.filter((row) => row.id && !teamIds.has(row.id) && !SHIPPED_OMISSIONS.has(row.id));
    const extra = team.filter((row) => row.id && !shipped.some((s) => s.id === row.id));
    for (const row of missing) fail(`drift: shipped standard row \`${row.id}\` (${row.name}) is missing from the lead`);
    for (const row of extra) warn(`lead adds row \`${row.id}\` (${row.name}) beyond standard`);
    if (missing.length === 0) console.log(`drift: lead covers all ${shipped.length} shipped standard rows`);
  }
}

// ── an installed profile should already carry the rows ──────────────────────

if (installPath) {
  if (!existsSync(installPath)) fail(`--install does not exist: ${installPath}`);
  else {
    const text = readFileSync(installPath, 'utf8');
    for (const id of ['preset-team', ...ROLES.map((role) => `preset-${role}`)]) {
      if (!text.includes(`id: ${id}`)) fail(`--install: ${installPath} does not contain ${id}`);
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────

function report() {
  for (const message of warnings) console.log(`warn  ${message}`);
  for (const message of errors) console.log(`FAIL  ${message}`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }
  console.log(`\nOK  ${presets.length} preset(s) · ${warnings.length} warning(s)`);
  process.exit(0);
}

report();
