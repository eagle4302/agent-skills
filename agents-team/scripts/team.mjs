#!/usr/bin/env node
// agents-team board helper — zero dependencies, Node >= 18.
//
//   node team.mjs init <slug> [--objective "..."] [--root <dir>]
//   node team.mjs validate <team.json | team-dir> [--strict]
//   node team.mjs status <team.json | team-dir>
//   node team.mjs log <team-dir> <from> <to> <kind> <summary...>
//
// Exit codes: 0 ok · 1 validation problems · 2 usage error.
// The lead is the only writer of team.json; this script only reads it, except for
// `init` (creates the files) and `log` (appends one line to inbox.log).

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');

const PHASES = ['chartering', 'staffing', 'running', 'verifying', 'integrating', 'closed'];
const ROLES = ['lead', 'scout', 'builder', 'prober', 'critic', 'scribe', 'ops'];
const MEMBER_STATUS = ['running', 'idle', 'ready', 'retired'];
const KINDS = ['recon', 'implementation', 'verification', 'review', 'docs'];
const TASK_STATUS = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked', 'canceled'];
const VERDICTS = [null, 'pass', 'needs_revision', 'reject'];
const LOG_KINDS = ['brief', 'steer', 'block', 'report', 'verdict', 'human'];
// Kinds that must carry acceptance criteria, and the subset that must also carry a command.
const NEEDS_ACCEPTANCE = ['implementation', 'verification', 'review'];
const NEEDS_VERIFY = ['implementation', 'verification'];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const usage = (msg) => {
  if (msg) console.error(`usage error: ${msg}`);
  console.error('usage: team.mjs init <slug> [--objective "..."] [--root <dir>]');
  console.error('       team.mjs validate <team.json|team-dir> [--strict]');
  console.error('       team.mjs status <team.json|team-dir>');
  console.error('       team.mjs log <team-dir> <from> <to> <kind> <summary...>');
  process.exit(2);
};

const iso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const render = (template, vars) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), template);

/** Resolve a team.json path from either the file or its directory. */
function manifestPath(arg) {
  const p = resolve(arg);
  if (!existsSync(p)) return p;
  return statSync(p).isDirectory() ? join(p, 'team.json') : p;
}

// ── init ────────────────────────────────────────────────────────────────────

function cmdInit(args) {
  const positionals = [];
  let objective = 'REPLACE: one line stating what this team is for.';
  let root = process.cwd();
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--objective') objective = args[++i] ?? objective;
    else if (args[i] === '--root') root = resolve(args[++i] ?? root);
    else positionals.push(args[i]);
  }
  const slug = positionals[0];
  if (!slug) usage('init needs a slug');
  if (!KEBAB.test(slug)) usage(`slug must be kebab-case, got "${slug}"`);

  const dir = join(root, '.agent-teams', slug);
  if (existsSync(join(dir, 'team.json'))) {
    usage(`team already exists: ${join(dir, 'team.json')}`);
  }
  mkdirSync(join(dir, 'reports'), { recursive: true });
  mkdirSync(join(dir, 'notes'), { recursive: true });

  const vars = { SLUG: slug, OBJECTIVE: objective, ISO: iso() };
  writeFileSync(
    join(dir, 'team.json'),
    render(readFileSync(join(ASSETS, 'team.json.template'), 'utf8'), vars),
  );
  writeFileSync(
    join(dir, 'board.md'),
    render(readFileSync(join(ASSETS, 'board.md.template'), 'utf8'), vars),
  );
  appendFileSync(join(dir, 'inbox.log'), `${iso()} lead -> lead charter team ${slug} created\n`);

  console.log(`created ${relative(process.cwd(), dir) || dir}`);
  console.log('next: fill in objective, tasks (acceptance + verify + inScope), then staff the team');
}

// ── validate ────────────────────────────────────────────────────────────────

function findCycle(tasks, byId) {
  const colour = new Map(); // 0 unvisited, 1 on stack, 2 done
  const path = [];
  const visit = (id) => {
    const state = colour.get(id) ?? 0;
    if (state === 2) return null;
    if (state === 1) return [...path.slice(path.indexOf(id)), id];
    colour.set(id, 1);
    path.push(id);
    for (const dep of byId.get(id)?.dependencies ?? []) {
      if (!byId.has(dep)) continue;
      const found = visit(dep);
      if (found) return found;
    }
    path.pop();
    colour.set(id, 2);
    return null;
  };
  for (const t of tasks) {
    const cycle = visit(t.id);
    if (cycle) return cycle;
  }
  return null;
}

/** Glob-ish overlap: equal, or one path is a prefix of the other once '*' is trimmed. */
function globOverlap(a, b) {
  const norm = (s) => s.replace(/\\/g, '/').replace(/\*+$/, '').replace(/\/+$/, '');
  const x = norm(a);
  const y = norm(b);
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

function cmdValidate(args) {
  const strict = args.includes('--strict');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) usage('validate needs a team.json or team directory');

  const file = manifestPath(target);
  const errors = [];
  const warnings = [];
  if (!existsSync(file)) {
    console.error(`ERROR cannot read ${file}`);
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`ERROR ${file} is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  const teamDir = dirname(file);
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (doc.schema !== 1) err(`top-level "schema" must be 1, got ${JSON.stringify(doc.schema)}`);
  for (const key of ['name', 'objective', 'createdAt']) {
    if (typeof doc[key] !== 'string' || !doc[key].trim()) err(`top-level "${key}" is required`);
  }
  if (doc.name && !KEBAB.test(doc.name)) err(`"name" must be kebab-case, got "${doc.name}"`);
  if (!PHASES.includes(doc.phase)) err(`"phase" must be one of ${PHASES.join('|')}, got ${JSON.stringify(doc.phase)}`);
  if (!Array.isArray(doc.humanGates) || doc.humanGates.length === 0) {
    warn('"humanGates" is empty — list what the team may never do on its own');
  }

  const members = Array.isArray(doc.members) ? doc.members : [];
  if (members.length === 0) err('"members" must contain at least the lead');
  const memberByName = new Map();
  for (const m of members) {
    const who = m?.name ?? '(unnamed)';
    if (!m?.name || !KEBAB.test(m.name)) err(`member "${who}": name must be kebab-case`);
    if (memberByName.has(m.name)) err(`member "${m.name}": duplicate name`);
    memberByName.set(m.name, m);
    if (!ROLES.includes(m.role)) err(`member "${who}": role must be one of ${ROLES.join('|')}`);
    if (!MEMBER_STATUS.includes(m.status)) {
      err(`member "${who}": status must be one of ${MEMBER_STATUS.join('|')}`);
    }
    const needsId = m.role !== 'lead' && m.status !== 'retired';
    if (needsId && (typeof m.agentId !== 'string' || m.agentId.trim() === '')) {
      err(`member "${who}": "agentId" is required for a live teammate (the id the subagent tool returned)`);
    }
    if (!Array.isArray(m.territory) || m.territory.length === 0) {
      warn(`member "${who}": no "territory" — nothing stops two teammates writing the same file`);
    }
  }
  if (!members.some((m) => m.role === 'lead')) err('no member has role "lead"');

  const tasks = Array.isArray(doc.tasks) ? doc.tasks : [];
  const byId = new Map();
  for (const t of tasks) {
    const id = t?.id ?? '(unnamed)';
    if (!t?.id) err('task without an "id"');
    else if (byId.has(t.id)) err(`task "${t.id}": duplicate id`);
    byId.set(t?.id, t);
  }
  for (const t of tasks) {
    const id = t?.id ?? '(unnamed)';
    const at = (m) => `task "${id}": ${m}`;
    if (!KINDS.includes(t.kind)) err(at(`kind must be one of ${KINDS.join('|')}`));
    if (!TASK_STATUS.includes(t.status)) err(at(`status must be one of ${TASK_STATUS.join('|')}`));
    if (!VERDICTS.includes(t.verdict ?? null)) err(at(`verdict must be null|pass|needs_revision|reject`));
    if (typeof t.subject !== 'string' || !t.subject.trim()) err(at('"subject" is required'));
    if (t.status !== 'backlog' && !memberByName.has(t.assignee)) {
      err(at(`assignee "${t.assignee}" is not a member (only backlog tasks may be unassigned)`));
    }
    if (!Array.isArray(t.dependencies)) err(at('"dependencies" must be an array (use [] when there are none)'));
    for (const dep of t.dependencies ?? []) {
      if (!byId.has(dep)) err(at(`dependency "${dep}" does not exist`));
      if (dep === t.id) err(at('depends on itself'));
    }
    if (!Number.isInteger(t.attempt) || t.attempt < 0) err(at('"attempt" must be a non-negative integer'));
    if (NEEDS_ACCEPTANCE.includes(t.kind) && (!Array.isArray(t.acceptance) || t.acceptance.length === 0)) {
      err(at(`kind "${t.kind}" needs at least one "acceptance" line`));
    }
    if (NEEDS_VERIFY.includes(t.kind) && (!Array.isArray(t.verify) || t.verify.length === 0)) {
      err(at(`kind "${t.kind}" needs at least one paste-ready command in "verify"`));
    }
    if (t.kind === 'implementation' && (!Array.isArray(t.inScope) || t.inScope.length === 0)) {
      err(at('implementation task needs "inScope" path globs'));
    }
    if (t.kind === 'review') {
      if (!t.reviewedTaskId) err(at('review tasks must set "reviewedTaskId"'));
      else if (!byId.has(t.reviewedTaskId)) err(at(`reviewedTaskId "${t.reviewedTaskId}" does not exist`));
    }
    if (t.status === 'done') {
      if (typeof t.evidence !== 'string' || !t.evidence.trim()) {
        err(at('a done task must point at "evidence"'));
      } else if (t.kind !== 'recon') {
        const p = isAbsolute(t.evidence) ? t.evidence : join(teamDir, t.evidence);
        if (!existsSync(p)) err(at(`evidence file does not exist: ${t.evidence}`));
      }
    }
    if (t.attempt >= 2 && !['done', 'canceled'].includes(t.status) && doc.phase !== 'closed') {
      warn(at(`attempt ${t.attempt} reached the escalation trigger — reassign or ask the human`));
    }
  }

  const cycle = findCycle(tasks, byId);
  if (cycle) err(`dependency cycle: ${cycle.join(' -> ')}`);

  const builders = members.filter((m) => m.role === 'builder' && ['running', 'idle'].includes(m.status));
  for (let i = 0; i < builders.length; i += 1) {
    for (let j = i + 1; j < builders.length; j += 1) {
      for (const a of builders[i].territory ?? []) {
        for (const b of builders[j].territory ?? []) {
          if (globOverlap(a, b)) {
            warn(`territory overlap: ${builders[i].name} (${a}) and ${builders[j].name} (${b})`);
          }
        }
      }
    }
  }

  const doneImpl = tasks.filter((t) => t.kind === 'implementation' && t.status === 'done');
  for (const t of doneImpl) {
    const verified = tasks.some((v) => v.kind === 'verification' && v.reviewedTaskId === t.id)
      || tasks.some((v) => v.kind === 'verification' && (v.dependencies ?? []).includes(t.id));
    if (!verified) warn(`task "${t.id}" is done with no verification task pointing at it`);
  }

  const open = tasks.filter((t) => !['done', 'canceled'].includes(t.status));
  if (doc.phase !== 'closed') {
    for (const m of members) {
      if (['running', 'idle'].includes(m.status) && !open.some((t) => t.assignee === m.name)) {
        warn(`member "${m.name}" is ${m.status} but owns no open task`);
      }
    }
  }

  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  const failed = errors.length > 0 || (strict && warnings.length > 0);
  console.log(
    `${failed ? 'FAIL' : 'PASS'}  ${relative(process.cwd(), file)} — ${errors.length} error(s), ${warnings.length} warning(s)`,
  );
  process.exit(failed ? 1 : 0);
}

// ── status ──────────────────────────────────────────────────────────────────

function cmdStatus(args) {
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) usage('status needs a team.json or team directory');
  const file = manifestPath(target);
  if (!existsSync(file)) {
    console.error(`cannot read ${file}`);
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const rows = (doc.tasks ?? []).map((t) => [
    t.id,
    (t.subject ?? '').slice(0, 48),
    t.assignee ?? '-',
    t.status,
    (t.dependencies ?? []).join(',') || '-',
    t.evidence ? t.evidence.replace(/^.*[\\/]/, '') : '-',
  ]);
  const head = ['id', 'task', 'owner', 'status', 'deps', 'evidence'];
  const width = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length), 4));
  const line = (cells) => cells.map((c, i) => String(c ?? '').padEnd(width[i])).join('  ');
  console.log(`${doc.name} — ${doc.objective}`);
  console.log(`phase: ${doc.phase} · members: ${(doc.members ?? []).length} · tasks: ${rows.length}`);
  console.log(line(head));
  console.log(line(width.map((w) => '-'.repeat(w))));
  for (const r of rows) console.log(line(r));
  const open = (doc.tasks ?? []).filter((t) => !['done', 'canceled'].includes(t.status));
  console.log(`\nopen: ${open.length}${open.length ? ` (${open.map((t) => `${t.id}:${t.status}`).join(' ')})` : ''}`);
}

// ── log ─────────────────────────────────────────────────────────────────────

function cmdLog(args) {
  const [dir, from, to, kind, ...rest] = args;
  if (!dir || !from || !to || !kind || rest.length === 0) {
    usage('log needs <team-dir> <from> <to> <kind> <summary...>');
  }
  if (!LOG_KINDS.includes(kind)) usage(`kind must be one of ${LOG_KINDS.join('|')}`);
  const summary = rest.join(' ').replace(/\s+/g, ' ').trim();
  const file = join(resolve(dir), 'inbox.log');
  appendFileSync(file, `${iso()} ${from} -> ${to} ${kind} ${summary}\n`);
  console.log(`logged: ${kind} ${from} -> ${to}`);
}

// ── dispatch ────────────────────────────────────────────────────────────────

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'init': cmdInit(rest); break;
  case 'validate': cmdValidate(rest); break;
  case 'status': cmdStatus(rest); break;
  case 'log': cmdLog(rest); break;
  default: usage(command ? `unknown command "${command}"` : 'no command given');
}
