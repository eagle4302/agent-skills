#!/usr/bin/env node
// agents-team board helper — zero dependencies, Node >= 18.
//
//   node team.mjs init <slug> [--objective "..."] [--root <dir>]
//   node team.mjs baseline <team.json | team-dir>
//   node team.mjs validate <team.json | team-dir> [--strict]
//   node team.mjs status <team.json | team-dir>
//   node team.mjs batch <team.json | team-dir> [group]
//   node team.mjs log <team-dir> <from> <to> <kind> <summary...>
//
// Exit codes: 0 ok · 1 validation problems · 2 usage error.
// The lead is the only writer of team.json; this script only reads it, except for
// `init` (creates the files), `baseline` (rewrites team.json with the git baseline) and
// `log` (appends one line to inbox.log).

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
// Traffic between the lead and its teammates, then the lead's own record of why it acted.
// A real run writes far more of the second group than the first; both belong in the log.
const LOG_KINDS = [
  'brief', 'steer', 'block', 'report', 'verdict', 'human', 'commit',
  'note', 'finding', 'verified', 'decision', 'action',
];
// Vocabulary real boards already use. Normalised before anything reads a kind.
const LOG_ALIASES = {
  task: 'brief', request: 'brief', charter: 'note', ack: 'note', addendum: 'note',
  correction: 'note', question: 'human', ruling: 'decision', reopen: 'decision',
  measured: 'verified', status: 'report', 'blocker-adjacent': 'block', 問: 'human',
};
const normKind = (k) => {
  // Real logs glue the summary on with a colon ("task：implement t3"); keep the kind.
  const l = String(k ?? '').toLowerCase().split(/[:：]/)[0];
  return LOG_ALIASES[l] ?? l;
};
const COMMIT_MODES = ['per-territory', 'per-task', 'single', 'none'];
const VERIFIED_CLEAN = ['unknown', 'clean', 'known-failures'];
const SHA = /^[0-9a-f]{7,40}$/;
// Project convention files that spawn children never see unless the lead quotes them.
const HOUSE_FILES = ['CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md'];
// Kinds that must carry acceptance criteria, and the subset that must also carry a command.
const NEEDS_ACCEPTANCE = ['implementation', 'verification', 'review'];
const NEEDS_VERIFY = ['implementation', 'verification'];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// A workflow fan-out owns a task but has no member row — see references/workflow-stage.md.
const STAGE = /^stage:[a-z0-9]+(-[a-z0-9]+)*$/;
const usage = (msg) => {
  if (msg) console.error(`usage error: ${msg}`);
  console.error('usage: team.mjs init <slug> [--objective "..."] [--root <dir>]');
  console.error('       team.mjs baseline <team.json|team-dir>');
  console.error('       team.mjs validate <team.json|team-dir> [--strict]');
  console.error('       team.mjs status <team.json|team-dir>');
  console.error('       team.mjs batch <team.json|team-dir> [group]');
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

/** Walk up to the git repo root; null when the team lives outside a repo. */
function repoRoot(from) {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/** The project's convention files, relative to the repo root. */
function houseFiles(from) {
  const root = repoRoot(from);
  if (!root) return [];
  return HOUSE_FILES.filter((f) => existsSync(join(root, f)));
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
  console.log(`next: team.mjs baseline ${relative(process.cwd(), dir) || dir}`);
  console.log('then: objective, tasks (acceptance + verify + inScope + commitGroup), the human\'s');
  console.log('      one-time commit authorization in commitPolicy, validate, then staff the team');
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

/**
 * Group tasks by `commitGroup` and judge each batch. A batch is `ready` when every task in
 * it is settled and every implementation task in it has a verification task with a `pass`
 * verdict — that is the moment it may land as one commit.
 */
function commitGroups(doc) {
  const tasks = Array.isArray(doc.tasks) ? doc.tasks : [];
  const verifiedOk = (t) =>
    tasks.some((v) => v.kind === 'verification'
      && (v.reviewedTaskId === t.id || (v.dependencies ?? []).includes(t.id))
      && v.verdict === 'pass');
  const out = new Map();
  for (const t of tasks) {
    const g = String(t?.commitGroup ?? '').trim();
    if (!g) continue;
    if (!out.has(g)) {
      out.set(g, { group: g, tasks: [], owners: new Set(), inScope: new Set(), shas: new Set() });
    }
    const b = out.get(g);
    b.tasks.push(t);
    if (t.assignee) b.owners.add(t.assignee);
    for (const p of t.inScope ?? []) b.inScope.add(p);
    const sha = String(t.commitSha ?? '').trim();
    if (sha) b.shas.add(sha);
  }
  for (const b of out.values()) {
    b.blockers = [];
    for (const t of b.tasks) {
      if (!['done', 'canceled'].includes(t.status)) b.blockers.push(`${t.id}:${t.status}`);
      else if (t.kind === 'implementation' && t.status === 'done' && !verifiedOk(t)) {
        b.blockers.push(`${t.id}:unverified`);
      }
    }
    b.state = b.shas.size ? 'committed' : b.blockers.length ? 'blocked' : 'ready';
  }
  return [...out.values()];
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

  if (![1, 2].includes(doc.schema)) {
    err(`top-level "schema" must be 1 or 2, got ${JSON.stringify(doc.schema)}`);
  }
  const v2 = doc.schema === 2;
  if (doc.schema === 1) {
    warn('schema 1 board: baseline and commit batches are not checked — new teams are schema 2');
  }
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
    // `stage:<name>` is a workflow fan-out (see workflow-stage.md): short-lived children
    // with no durable id, so there is no member row to point at.
    const isStage = STAGE.test(String(t.assignee ?? ''));
    if (t.status !== 'backlog' && !memberByName.has(t.assignee) && !isStage) {
      err(at(`assignee "${t.assignee}" is not a member (only backlog tasks may be unassigned, or a "stage:<name>" workflow fan-out)`));
    }
    if (isStage && !['review', 'verification'].includes(t.kind)) {
      warn(at(`a "stage:" fan-out is a review or verification stage, not "${t.kind}" — nothing in a workflow can be steered or re-briefed`));
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

  // ── baseline and commit batches (schema 2 only) ───────────────────────────
  if (v2) {
    const bl = doc.baseline;
    if (!bl || typeof bl !== 'object' || Array.isArray(bl)) {
      err('schema 2 needs a "baseline" object — run `team.mjs baseline <team-dir>` before staffing');
    } else {
      const sha = String(bl.sha ?? '').trim();
      if (typeof bl.sha !== 'string') err('"baseline.sha" must be a string');
      else if (!sha && doc.phase !== 'chartering') {
        err(`"baseline.sha" is empty at phase "${doc.phase}" — nothing can say what this team changed`);
      } else if (sha && !SHA.test(sha)) {
        err(`"baseline.sha" is not a git sha: ${JSON.stringify(bl.sha)}`);
      }
      if (!Array.isArray(bl.dirtyPaths)) {
        err('"baseline.dirtyPaths" must be an array (use [] for a clean tree)');
      }

      // What was already broken. A prober must never be scored against it.
      const vc = bl.verifiedClean ?? 'unknown';
      if (!VERIFIED_CLEAN.includes(vc)) {
        err(`"baseline.verifiedClean" must be one of ${VERIFIED_CLEAN.join('|')}`);
      }
      if (!Array.isArray(bl.knownFailures)) {
        err('"baseline.knownFailures" must be an array (use [] when nothing was failing)');
      } else {
        bl.knownFailures.forEach((kf, i) => {
          if (!kf || typeof kf !== 'object' || Array.isArray(kf)) {
            err(`baseline.knownFailures[${i}] must be an object`);
            return;
          }
          for (const k of ['command', 'symptom']) {
            if (typeof kf[k] !== 'string' || !kf[k].trim()) {
              err(`baseline.knownFailures[${i}]: "${k}" is required`);
            }
          }
        });
        if (vc === 'known-failures' && bl.knownFailures.length === 0) {
          err('"baseline.verifiedClean" is "known-failures" but "knownFailures" is empty — write down what already fails');
        }
        if (vc === 'clean' && bl.knownFailures.length > 0) {
          err('"baseline.verifiedClean" is "clean" but "knownFailures" is not empty');
        }
      }
      if (vc === 'unknown' && !['chartering', 'staffing'].includes(doc.phase)) {
        warn('nobody ran the verify commands on the untouched tree ("baseline.verifiedClean": "unknown") — a failure that was already there will be scored as the team\'s');
      }
    }

    if (!Array.isArray(doc.houseRules)) {
      err('schema 2 needs a "houseRules" array (use [] when the project has no conventions)');
    } else if (doc.houseRules.length === 0 && doc.phase !== 'chartering') {
      const house = houseFiles(teamDir);
      if (house.length) {
        warn(`"houseRules" is empty but the project has ${house.join(', ')} — spawn children never read those files`);
      }
    }

    const cp = doc.commitPolicy;
    if (!cp || typeof cp !== 'object' || Array.isArray(cp)) {
      err('schema 2 needs a "commitPolicy" object — the human\'s answer on batching commits');
    } else {
      if (!COMMIT_MODES.includes(cp.mode)) {
        err(`"commitPolicy.mode" must be one of ${COMMIT_MODES.join('|')}`);
      }
      if (typeof cp.authorized !== 'boolean') err('"commitPolicy.authorized" must be true or false');
      if (cp.authorized === true && !String(cp.authorizedAt ?? '').trim()) {
        err('"commitPolicy.authorized" is true but "authorizedAt" is empty — record when the human said yes');
      }
      if (cp.authorized !== true && cp.mode !== 'none' && doc.phase !== 'chartering') {
        warn(`commits are unauthorized at phase "${doc.phase}" — ask the human once, at charter, not at the end`);
      }
    }

    const mode = cp?.mode;
    const authorized = cp?.authorized === true;
    for (const t of tasks) {
      const at = (m) => `task "${t?.id ?? '(unnamed)'}": ${m}`;
      const g = String(t?.commitGroup ?? '').trim();
      if (g && !KEBAB.test(g)) err(at(`"commitGroup" must be kebab-case, got "${g}"`));
      const sha = String(t?.commitSha ?? '').trim();
      if (sha) {
        if (!SHA.test(sha)) err(at(`"commitSha" is not a git sha: ${JSON.stringify(t.commitSha)}`));
        if (!authorized) err(at('has a "commitSha" but commitPolicy.authorized is false — a batch landed unauthorized'));
        if (!g) err(at('has a "commitSha" but no "commitGroup"'));
      }
      if (mode && mode !== 'none' && t.kind === 'implementation' && t.status === 'done' && !g) {
        warn(at('done implementation task with no "commitGroup" — its files land in someone else\'s batch'));
      }
    }

    const batches = commitGroups(doc);
    for (const b of batches) {
      if (b.shas.size > 1) {
        err(`batch "${b.group}": tasks carry different commitShas (${[...b.shas].join(', ')})`);
      }
      if (mode === 'per-territory' && b.owners.size > 1) {
        warn(`batch "${b.group}": owned by ${[...b.owners].join(', ')} — per-territory wants one owner per batch`);
      }
      if (mode === 'per-task' && b.tasks.length > 1) {
        warn(`batch "${b.group}": ${b.tasks.length} tasks share a batch in per-task mode`);
      }
      if (b.state === 'ready' && doc.phase !== 'closed') {
        warn(`batch "${b.group}" is ready to commit (${b.tasks.map((t) => t.id).join(',')}) — run \`team.mjs batch\``);
      }
      if (b.state === 'committed' && b.blockers.length) {
        warn(`batch "${b.group}" landed as ${[...b.shas][0]} but ${b.blockers.join(', ')}`);
      }
    }

    if (doc.phase === 'closed' && mode && mode !== 'none') {
      const stuck = batches.filter((b) => b.state !== 'committed');
      const homeless = tasks.filter(
        (t) => t.kind === 'implementation' && t.status === 'done' && !String(t.commitGroup ?? '').trim(),
      );
      if (stuck.length || homeless.length) {
        warn(`closed with work that never landed: ${stuck.length} uncommitted batch(es), ${homeless.length} task(s) with no batch`);
      }
    }
  }

  // ── inbox.log accounting ──────────────────────────────────────────────────
  // A closed board stops nagging; a live one is checked against its own log.
  const logFile = join(teamDir, 'inbox.log');
  if (doc.phase !== 'closed') {
    if (!existsSync(logFile)) {
      if (doc.phase !== 'chartering') {
        warn('no inbox.log — a fresh session has nothing to reconstruct this run from');
      }
    } else {
      // Split on CRLF too: a lone `\r` left on the line makes `(.*)$` fail to match,
      // which would silently drop every Windows-written line as unreadable.
      const raw = readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => l.trim());
      // The leading ISO date is what separates a real line from a wrapped summary.
      const shaped = raw
        .map((l) => l.match(/^(\d{4}-\d{2}-\d{2}T\S*)\s+(\S+)\s+->\s+(\S+)\s+(\S+)\s+(.*)$/))
        .filter(Boolean)
        .map((m) => ({ from: m[2], to: m[3], kind: normKind(m[4]), summary: m[5] }));
      const entries = shaped.filter((e) => LOG_KINDS.includes(e.kind));
      const logged = (kind, pick) => entries.some((e) => e.kind === kind && pick(e));

      // Two different problems, said separately — conflating them blames the wrong thing.
      const unshaped = raw.length - shaped.length;
      if (unshaped > raw.length / 5) {
        warn(`inbox.log: ${unshaped} of ${raw.length} lines are not "<ts> <from> -> <to> <kind> <summary>" — usually wrapped summaries, and they cannot be read back`);
      }
      const odd = [...new Set(shaped.filter((e) => !LOG_KINDS.includes(e.kind)).map((e) => e.kind))];
      if (odd.length) {
        warn(`inbox.log: ${odd.length} kind(s) outside the vocabulary are kept but invisible to the checks below: ${odd.slice(0, 8).join(', ')}`);
      }

      for (const m of members) {
        if (m.role === 'lead' || !String(m.agentId ?? '').trim()) continue;
        if (!logged('brief', (e) => e.to === m.name)) {
          warn(`member "${m.name}" was staffed but no "brief" line names it in inbox.log`);
        }
        // A prober's or critic's output arrives as a verdict; that counts as reporting.
        const spoke = ['report', 'verdict', 'finding', 'block']
          .some((k) => logged(k, (e) => e.from === m.name));
        if (tasks.some((t) => t.assignee === m.name && t.status === 'done') && !spoke) {
          warn(`member "${m.name}" has a done task but never reported in inbox.log`);
        }
      }
      for (const b of commitGroups(doc)) {
        for (const sha of b.shas) {
          if (!logged('commit', (e) => e.summary.includes(sha))) {
            warn(`batch "${b.group}" landed as ${sha} but no "commit" line records it in inbox.log`);
          }
        }
      }
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

  const batches = commitGroups(doc);
  if (batches.length) {
    const mode = doc.commitPolicy?.mode ?? '(unset)';
    const auth = doc.commitPolicy?.authorized === true ? '' : ', NOT authorized';
    console.log(`\nbatches (${mode}${auth}):`);
    for (const b of batches) {
      const tag = b.state === 'committed' ? [...b.shas][0].slice(0, 7)
        : b.state === 'ready' ? 'run: team.mjs batch'
        : b.blockers.join(',');
      console.log(`  ${b.group.padEnd(18)} ${b.state.padEnd(10)} ${tag}  (${b.tasks.map((t) => t.id).join(',')})`);
    }
  }
}

// ── baseline ────────────────────────────────────────────────────────────────

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function cmdBaseline(args) {
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) usage('baseline needs a team.json or team directory');
  const file = manifestPath(target);
  if (!existsSync(file)) {
    console.error(`cannot read ${file}`);
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const teamDir = dirname(file);

  let sha;
  let branch;
  let porcelain;
  try {
    sha = git(['rev-parse', 'HEAD'], teamDir);
    branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], teamDir);
    porcelain = git(['status', '--porcelain'], teamDir);
  } catch (e) {
    console.error(`git failed: ${String(e.stderr || e.message || '').trim()}`);
    console.error('not a git repo, or no commit yet — leave baseline.sha empty and say so in the human report');
    process.exit(1);
  }

  const all = porcelain.split('\n').map((s) => s.trim()).filter(Boolean);
  const dirtyPaths = all.slice(0, 100);
  if (all.length > dirtyPaths.length) dirtyPaths.push(`… ${all.length - dirtyPaths.length} more`);

  // Re-running `baseline` must not wipe the two fields a human fills in by hand.
  const prev = doc.baseline ?? {};
  doc.baseline = {
    sha,
    branch,
    dirtyPaths,
    verifiedClean: prev.verifiedClean ?? 'unknown',
    knownFailures: prev.knownFailures ?? [],
    capturedAt: iso(),
  };
  if (!Array.isArray(doc.houseRules)) doc.houseRules = [];
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  appendFileSync(
    join(teamDir, 'inbox.log'),
    `${iso()} lead -> lead commit baseline ${branch}@${sha.slice(0, 7)}, ${all.length} path(s) already dirty\n`,
  );

  console.log(`baseline: ${branch} @ ${sha.slice(0, 7)} · ${all.length} path(s) already dirty`);
  for (const p of dirtyPaths) console.log(`  ${p}`);
  if (all.length) console.log('^ NOT the team\'s changes — never sweep them in with `git add -A`');

  const house = houseFiles(teamDir);
  if (house.length) {
    console.log(`house rules: ${house.join(', ')} at the repo root`);
    console.log('  -> quote what every teammate must obey into "houseRules"; spawn children never read those files');
  }
  console.log('still owed, by hand:');
  console.log('  baseline.verifiedClean  run the verify commands on this untouched tree first:');
  console.log('                          "clean", or "known-failures" + what already fails');
  console.log('  houseRules              build flags, line endings, anything the project insists on');
  console.log('  commitPolicy            the human\'s one-time batch authorization');
}

// ── batch ───────────────────────────────────────────────────────────────────

function cmdBatch(args) {
  const positionals = args.filter((a) => !a.startsWith('--'));
  const [target, only] = positionals;
  if (!target) usage('batch needs a team.json or team directory');
  const file = manifestPath(target);
  if (!existsSync(file)) {
    console.error(`cannot read ${file}`);
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const mode = doc.commitPolicy?.mode ?? '(unset)';
  const authorized = doc.commitPolicy?.authorized === true;
  const prefix = doc.commitPolicy?.messagePrefix ?? '';
  const batches = commitGroups(doc).filter((b) => !only || b.group === only);

  console.log(`${doc.name} — mode: ${mode} · human authorized: ${authorized ? 'yes' : 'NO'}`);
  if (doc.baseline?.sha) {
    const dirty = (doc.baseline.dirtyPaths ?? []).length;
    console.log(`baseline: ${doc.baseline.branch ?? '?'} @ ${String(doc.baseline.sha).slice(0, 7)} · ${dirty} path(s) dirty before the team started`);
  }
  if (!batches.length) {
    console.log(only ? `no batch named "${only}"` : 'no task carries a commitGroup yet');
    return;
  }

  for (const b of batches) {
    const ids = b.tasks.map((t) => t.id).join(',');
    console.log('');
    if (b.state === 'committed') {
      console.log(`[landed]  ${b.group}  ${[...b.shas].join(' ')}  (${ids})`);
      continue;
    }
    if (b.state === 'blocked') {
      console.log(`[blocked] ${b.group}  (${ids}) — ${b.blockers.join(', ')}`);
      continue;
    }
    console.log(`[ready]   ${b.group}  (${ids})  owner: ${[...b.owners].join(', ') || '-'}`);
    const suspect = [...b.inScope].filter((p) => /[()\s]/.test(p));
    if (suspect.length) {
      console.log(`  ! not pathspecs — fix inScope or add these by hand: ${suspect.join(' | ')}`);
    }
    const globs = [...b.inScope].map((p) => `'${p.replace(/'/g, "'\\''")}'`).join(' ');
    console.log(`  git status --short -- ${globs}`);
    console.log(`  git add -- ${globs}`);
    console.log(`  git commit -m "${prefix}${b.group}: <what landed>"`);
    console.log(`  then: write the sha into commitSha on ${ids}, and`);
    console.log('        team.mjs log <team-dir> lead lead commit <group> <sha>');
  }

  console.log('');
  if (!authorized) {
    console.log('STOP: commitPolicy.authorized is false — ask the human before running any of the above.');
  }
  console.log('never `git add -A` / `git add .` / `git commit -a`: baseline.dirtyPaths was there first.');
}

// ── log ─────────────────────────────────────────────────────────────────────

function cmdLog(args) {
  const [dir, from, to, kind, ...rest] = args;
  if (!dir || !from || !to || !kind || rest.length === 0) {
    usage('log needs <team-dir> <from> <to> <kind> <summary...>');
  }
  const canonical = normKind(kind);
  if (!LOG_KINDS.includes(canonical)) {
    usage(`kind must be one of ${LOG_KINDS.join('|')} (aliases: ${Object.keys(LOG_ALIASES).join(', ')})`);
  }
  const summary = rest.join(' ').replace(/\s+/g, ' ').trim();
  const file = join(resolve(dir), 'inbox.log');
  appendFileSync(file, `${iso()} ${from} -> ${to} ${canonical} ${summary}\n`);
  console.log(`logged: ${canonical}${canonical === kind ? '' : ` (from "${kind}")`} ${from} -> ${to}`);
}

// ── dispatch ────────────────────────────────────────────────────────────────

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'init': cmdInit(rest); break;
  case 'baseline': cmdBaseline(rest); break;
  case 'validate': cmdValidate(rest); break;
  case 'status': cmdStatus(rest); break;
  case 'batch': cmdBatch(rest); break;
  case 'log': cmdLog(rest); break;
  default: usage(command ? `unknown command "${command}"` : 'no command given');
}
