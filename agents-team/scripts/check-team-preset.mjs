#!/usr/bin/env node
// Structural check for an agents-team preset: parses the composition, resolves every
// plugin name against a node_modules tree, and asserts the role-scoped delegation rows
// follow the contract the agents-team skill depends on.
//
//   node check-team-preset.mjs [--preset <dir>] [--modules <node_modules dir>]
//                              [--shipped <dir>] [--settings <file>]
//
// Defaults: --preset  $DSH_HOME/.agent-presets/team
//           --modules is required for module resolution (the checkout's node_modules)
//           --settings $DSH_HOME/settings.yaml
// Exit codes: 0 ok · 1 problems · 2 usage error.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh');
const presetDir = resolve(flag('--preset', join(dshHome, '.agent-presets', 'team')));
const modulesDir = flag('--modules', '');
const shippedDir = flag('--shipped', '');
const settingsPath = resolve(flag('--settings', join(dshHome, 'settings.yaml')));

const errors = [];
const warnings = [];
const ok = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

if (!modulesDir) {
  console.error('usage: check-team-preset.mjs --modules <node_modules dir> [--preset <dir>] [--shipped <dir>] [--settings <file>]');
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

// ── helpers ─────────────────────────────────────────────────────────────────

const KNOWN_CONFIG_KEYS = new Set([
  'provider', 'toolName', 'modelSelectionSettings', 'enableRunInBackground', 'backgroundMode',
  'agentOptions', 'persona', 'toolFilter', 'maxDepth',
]);
const KNOWN_TOOLS = new Set([
  'read', 'write', 'edit', 'grep', 'glob', 'pwsh', 'present', 'todo_write', 'skill',
  'ask_user_question', 'web_search', 'web_fetch', 'job_list', 'job_output', 'job_kill',
  'subagent', 'subagent_fork', 'subagent_scout', 'subagent_prober', 'subagent_critic',
  'send_message', 'list_agents', 'interrupt_agent', 'workflow', 'ralph',
]);

/** Every row in a preset composition, including rows nested in groups. */
function flatten(rows, path = []) {
  const out = [];
  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const here = [...path, row.id ?? '(no id)'];
    out.push({ row, path: here.join('/') });
    if (Array.isArray(row.config) && row.config.some((c) => c && typeof c === 'object' && 'name' in c && !('provider' in c))) {
      out.push(...flatten(row.config, here));
    }
  }
  return out;
}

/** Resolve a row's plugin name against the modules tree, subpath exports included. */
function resolveModule(name) {
  if (name.startsWith('cordis:')) return { ok: true, kind: 'builtin' };
  const parts = name.split('/');
  const pkg = name.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const subpath = name.startsWith('@') ? `./${parts.slice(2).join('/')}` : `./${parts.slice(1).join('/')}`;
  const dir = join(resolve(modulesDir), ...pkg.split('/'));
  if (!existsSync(dir)) return { ok: false, why: `package ${pkg} is not installed` };
  if (subpath === './') return { ok: true, kind: 'package' };
  try {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const exports = manifest.exports ?? {};
    const keys = Object.keys(exports);
    if (keys.some((k) => k === subpath || (k.endsWith('*') && subpath.startsWith(k.slice(0, -1))))) {
      return { ok: true, kind: 'subpath' };
    }
    if (existsSync(join(dir, subpath))) return { ok: true, kind: 'file' };
    return { ok: false, why: `${pkg} has no export "${subpath}"` };
  } catch (err) {
    return { ok: false, why: `cannot read ${pkg}/package.json: ${err.message}` };
  }
}

// ── preset.yml ──────────────────────────────────────────────────────────────

const metaPath = join(presetDir, 'preset.yml');
if (!existsSync(metaPath)) fail(`missing ${metaPath}`);
else {
  const meta = YAML.parse(readFileSync(metaPath, 'utf8')) ?? {};
  if (!meta.name) fail('preset.yml: "name" is required (the picker shows it)');
  if (!meta.description) warn('preset.yml: "description" is empty; the picker shows nothing');
  else ok.push(`preset metadata: ${meta.name}`);
}

// ── agent.cordis.yml ────────────────────────────────────────────────────────

const compositionPath = join(presetDir, 'agent.cordis.yml');
if (!existsSync(compositionPath)) {
  console.error(`missing ${compositionPath}`);
  process.exit(1);
}
let composition;
try {
  composition = YAML.parse(readFileSync(compositionPath, 'utf8'));
} catch (err) {
  console.error(`agent.cordis.yml does not parse: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(composition)) fail('agent.cordis.yml must be a YAML list of plugin rows');

const rows = flatten(composition);
ok.push(`composition: ${rows.length} rows`);

const seenIds = new Map();
for (const { row, path } of rows) {
  if (typeof row.name !== 'string' || row.name.length === 0) fail(`row ${path}: missing "name"`);
  if (row.id !== undefined) {
    if (seenIds.has(row.id)) fail(`duplicate row id "${row.id}" (${seenIds.get(row.id)} and ${path})`);
    seenIds.set(row.id, path);
  }
  if (typeof row.name === 'string') {
    const r = resolveModule(row.name);
    if (!r.ok) fail(`row ${path}: ${r.why}`);
  }
}

// ── delegation contract ─────────────────────────────────────────────────────

let modelSelectionOwners = [];
let roleRows = [];
for (const { row, path } of rows) {
  if (row.disabled === true) continue;
  const cfg = row.config && !Array.isArray(row.config) ? row.config : null;
  if (!cfg || typeof cfg.toolName !== 'string') continue;
  for (const key of Object.keys(cfg)) {
    if (!KNOWN_CONFIG_KEYS.has(key)) fail(`row ${path}: unknown config key "${key}"`);
  }
  if (cfg.modelSelectionSettings === true) modelSelectionOwners.push(path);
  if (cfg.toolName === 'subagent' || cfg.toolName === 'subagent_fork') {
    if (cfg.backgroundMode !== 'continuable') warn(`row ${path}: ${cfg.toolName} is not continuable; the team loop assumes background children`);
  }
  const isRole = ['subagent_scout', 'subagent_prober', 'subagent_critic'].includes(cfg.toolName);
  if (isRole) {
    roleRows.push(path);
    if (!cfg.persona) fail(`row ${path}: role tool needs a "persona" charter`);
    if (!cfg.toolFilter) fail(`row ${path}: role tool needs a "toolFilter"`);
    // maxDepth is the child's ABSOLUTE depth ceiling (resolveChildDepth refuses when
    // parentDepth + 1 exceeds it), so 0 can never start a child and 1 is the value that
    // means "this teammate may not recruit its own helpers".
    if (cfg.maxDepth === undefined) warn(`row ${path}: role tool leaves maxDepth unset; a teammate could go on to staff its own helpers`);
    else if (cfg.maxDepth === 0) fail(`row ${path}: maxDepth 0 refuses every call (a child is always parentDepth + 1); use 1`);
    else if (typeof cfg.maxDepth === 'number' && cfg.maxDepth > 1) warn(`row ${path}: maxDepth ${cfg.maxDepth} lets a role teammate delegate deeper than one level`);
    if (cfg.modelSelectionSettings === true) fail(`row ${path}: only one tool per scope may own model selection`);
    for (const tool of cfg.toolFilter?.deny ?? []) {
      if (!KNOWN_TOOLS.has(tool)) warn(`row ${path}: deny "${tool}" is not a tool this profile mounts`);
    }
    for (const tool of ['write', 'edit']) {
      if (!(cfg.toolFilter?.deny ?? []).includes(tool)) fail(`row ${path}: role tool must deny "${tool}" to be file-safe`);
    }
  }
  if (cfg.toolFilter && cfg.toolFilter.allow === undefined && cfg.toolFilter.deny === undefined) {
    fail(`row ${path}: toolFilter names neither allow nor deny`);
  }
}
if (modelSelectionOwners.length > 1) fail(`model selection owned by ${modelSelectionOwners.length} rows: ${modelSelectionOwners.join(', ')}`);
if (modelSelectionOwners.length === 1) ok.push(`model selection owner: ${modelSelectionOwners[0]}`);
if (roleRows.length === 0) fail('no role-scoped delegation rows found (subagent_scout / subagent_prober / subagent_critic)');
else ok.push(`role tools: ${roleRows.length} (${roleRows.join(', ')})`);

// ── diff against the shipped preset ─────────────────────────────────────────

if (shippedDir && existsSync(join(shippedDir, 'agent.cordis.yml'))) {
  const shipped = flatten(YAML.parse(readFileSync(join(shippedDir, 'agent.cordis.yml'), 'utf8')));
  const shippedIds = new Set(shipped.map((r) => r.row.id).filter(Boolean));
  const ours = new Set(seenIds.keys());
  for (const id of ours) if (!shippedIds.has(id)) ok.push(`added row: ${id}`);
  const removed = [...shippedIds].filter((id) => !ours.has(id));
  for (const id of removed) warn(`shipped row "${id}" is missing from this preset (drifted from the shipped preset)`);
}

// ── settings ────────────────────────────────────────────────────────────────

if (existsSync(settingsPath)) {
  let doc;
  try {
    doc = YAML.parse(readFileSync(settingsPath, 'utf8')) ?? {};
  } catch (err) {
    fail(`${settingsPath} does not parse: ${err.message}`);
    doc = {};
  }
  const s = doc['subagent-model-selection'];
  if (s === undefined) warn(`${settingsPath}: no "subagent-model-selection" section — per-call model choice stays off`);
  else {
    if (typeof s.enabled !== 'boolean') fail('subagent-model-selection.enabled must be a boolean');
    const routes = s.allowedModels ?? [];
    if (!Array.isArray(routes)) fail('subagent-model-selection.allowedModels must be a list');
    else {
      const keys = new Set();
      for (const r of routes) {
        if (!r || typeof r.provider !== 'string' || typeof r.model !== 'string' || !r.provider || !r.model) {
          fail(`allowedModels entry ${JSON.stringify(r)} needs non-empty provider and model`);
          continue;
        }
        const key = `${r.provider}\0${r.model}`;
        if (keys.has(key)) fail(`allowedModels repeats ${r.provider}/${r.model}`);
        keys.add(key);
      }
      if (s.enabled === true && keys.size === 0) fail('enabled model selection requires at least one allowed model');
      if (s.enabled === true) ok.push(`model selection enabled with ${keys.size} route(s)`);
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
const failed = errors.length > 0;
console.log(`${failed ? 'FAIL' : 'PASS'}  ${presetDir} — ${errors.length} error(s), ${warnings.length} warning(s)`);
if (!failed) for (const o of ok) console.log(`  - ${o}`);
process.exit(failed ? 1 : 0);
