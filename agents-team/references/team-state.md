# Team state on disk

Sessions end, contexts compact, and subagent ids evaporate. The board is the team's memory.

## Layout

```
.agent-teams/<slug>/
  team.json            machine truth: members, tasks, dependencies, ids, evidence paths
  board.md             the human's view: one table, regenerated from team.json
  inbox.log            append-only message log (format in protocol.md)
  reports/<task-id>-<role>.md   raw teammate output, verbatim
  notes/               shared findings other teammates need (facts, constraints, gotchas)
```

`<slug>` is kebab-case and describes the work, not the date. Put the directory at the
project's working root; if `.agent-teams/` is not in `.gitignore`, say so once to the human
instead of committing it. When the team closes, move the whole directory to
`.agent-teams/archive/<slug>/` so the live list stays short and the history stays readable.

`scripts/team.mjs` (in this skill) scaffolds, validates and renders the board; the templates
its `init` copies live in `assets/`. Run it as
`node "<skill base dir>/scripts/team.mjs" <command>`. The script is a convenience, not a
dependency: if it is missing, hand-edit the JSON and keep going.

| Command | Does |
| --- | --- |
| `init <slug>` | creates `.agent-teams/<slug>/` from the templates |
| `baseline <team-dir>` | records the git sha, branch and already-dirty paths into `team.json` |
| `validate <team-dir> [--strict]` | checks the whole board; exit 0 means it is staffable |
| `status <team-dir>` | prints the task table plus each commit batch's state |
| `batch <team-dir> [group]` | per batch: ready/blocked/landed, and the paste-ready `git add` |
| `log <team-dir> <from> <to> <kind> <summary>` | appends one `inbox.log` line |

`init`, `baseline` and `log` write; the rest only read.

`scripts/check-team-preset.mjs` re-checks the role-tool preset after a DSH upgrade (row ids,
plugin resolution, one model-selection owner, role personas and filters, `maxDepth` semantics);
run it with `--modules <checkout>/node_modules`.

## `team.json` schema v2

| Block | Fields |
| --- | --- |
| top | `schema` (2), `name`, `objective`, `createdAt`, `phase`, `humanGates[]`, `houseRules[]`, `baseline`, `commitPolicy` |
| `baseline` | `sha`, `branch`, `dirtyPaths[]`, `verifiedClean`, `knownFailures[]`, `capturedAt` |
| `baseline.knownFailures[]` | `command`, `symptom`, `why` |
| `commitPolicy` | `mode`, `authorized`, `authorizedAt`, `messagePrefix` |
| `members[]` | `name`, `role`, `agentId`, `status`, `territory[]`, `model` |
| `tasks[]` | `id`, `kind`, `subject`, `status`, `assignee`, `dependencies[]`, `attempt`, `objective`, `acceptance[]`, `verify[]`, `inScope[]`, `outOfScope[]`, `commitGroup`, `commitSha`, `evidence`, `reviewedTaskId`, `verdict` |

Schema 1 boards (no `baseline`, no `commitPolicy`) still validate; the script skips the batch
checks on them and says so once. Do not retrofit an archived board — leave it at 1.

Enumerations — keep them exact, the script validates them:

| Field | Values |
| --- | --- |
| `phase` | `chartering`, `staffing`, `running`, `verifying`, `integrating`, `closed` |
| `commitPolicy.mode` | `per-territory`, `per-task`, `single`, `none` |
| `baseline.verifiedClean` | `unknown`, `clean`, `known-failures` |
| `members[].role` | `lead`, `scout`, `builder`, `prober`, `critic`, `scribe`, `ops` |
| `members[].status` | `running`, `idle`, `ready`, `retired` |
| `tasks[].kind` | `recon`, `implementation`, `verification`, `review`, `docs` |
| `tasks[].status` | `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `canceled` |
| `tasks[].verdict` | `null`, `pass`, `needs_revision`, `reject` |

Field notes:

- `agentId` is the durable id the `subagent` tool returned (`started subagent <id>`). It is
  the only way back to a teammate after a context loss. Leave it empty for the lead.
- `model` records the route the member actually ran on: `inherited`, or `provider/model` when the
  delegation named one. Write it when you staff, not at the end.
- `territory` (on a member) and `inScope` (on a task) are path globs. Two teammates writing
  the same glob is a lead bug, not a teammate bug.
- `verify` holds commands that a prober can paste and run unchanged. If you cannot write one,
  the task is not ready to be staffed.
- `baseline` is written once by `team.mjs baseline`, before the tasks are filled in. Without it
  no one can say which changes are the team's: `dirtyPaths` is what the human already had in the
  tree, and it is the reason a batch is added by pathspec and never with `git add -A`. It is
  also the only thing that makes "did a teammate write outside its territory?" answerable —
  `git status --short` against `baseline.sha` is the lead's scope check.
- `commitGroup` decides what lands together; `commitSha` records that it did. Under the default
  `per-territory` mode one group means one builder's territory, so the group is normally named
  after that member (`builder-recipe`). A task that changes no tracked file leaves it empty.
- `baseline.verifiedClean` is the answer to "did anyone run the verify commands **before** the
  team touched anything?". `unknown` is the default and the dangerous one: it means a failure
  that was already there will be read as the team's. Run them at charter, then set `clean`, or
  set `known-failures` and list each one.
- `baseline.knownFailures[]` is `command` (what fails), `symptom` (how it fails, verbatim enough
  to match) and `why` (so the next session does not re-investigate). Every prober's brief carries
  this list; reproducing one of them is not a FAIL and never increments `attempt`.
- `houseRules[]` is what the project insists on — build command and its flags, line endings,
  formatting, naming. It exists because a spawn child never reads `CLAUDE.md` or `AGENTS.md`:
  whatever is not quoted into the brief does not reach the teammate. `validate` warns when the
  repo has one of those files and `houseRules` is still empty.
- `evidence` points at `reports/<task-id>-<role>.md`. A `done` task without evidence is a lie
  in JSON form.
- `attempt` counts verification failures, not edits. `2` is the escalation trigger.
- Status vocabulary is deliberately the same seven states the DSH Taskboard uses, so a team
  mirrored onto a Taskboard project needs no translation. This skill never writes to the
  Taskboard: agents cannot create tasks there, so the board stays the human's to open.

Secrets never go in these files — they are plain text and often land in a repo.

## Commit batches

A team that commits nothing until Close hands the human one unreviewable blob. Batching is
how the work lands while it is still verifiable, and `commitGroup` is the unit.

| Mode | One commit per | Reach for it when |
| --- | --- | --- |
| `per-territory` | builder territory (the default) | the normal case: disjoint territories, each landing on its own |
| `per-task` | implementation task | few, large, independently meaningful tasks |
| `single` | the whole run, at Close | a change that is meaningless in pieces — say why in the report |
| `none` | nothing; the human commits | the human wants the tree handed over untouched |

The cycle, once per batch:

1. Its prober returns `pass` on every implementation task in the group.
2. `team.mjs batch <team-dir>` prints the group's state and, for a ready one, the exact
   `git status --short` / `git add` / `git commit` lines built from the tasks' `inScope`.
3. Show the human the `git status --short` output; they asked for batching at charter, not
   for surprises.
4. Commit **by pathspec only**. `git add -A`, `git add .` and `git commit -a` would sweep in
   `baseline.dirtyPaths` — work the team never touched.
5. Write the sha into every task's `commitSha`, add one `commit` line to `inbox.log`, update
   `board.md`.

`validate` enforces the honest parts of that: a `commitSha` without `commitPolicy.authorized`
is an error, a ready batch that has not landed is a warning, and closing with an uncommitted
batch is a warning naming how many.

If `inScope` holds prose rather than pathspecs (`Core/Config/* (recipe section only)`),
`batch` flags it instead of emitting a wrong `git add` — fix the glob, or add that one by hand.

## `board.md`

One table, newest state, plus a short header. Keep it skimmable by a human who has not read
`team.json`:

```markdown
# <slug> — <objective>

phase: running · updated: 2026-09-17T04:30Z

| id | task | owner | status | deps | batch | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| t1 | implement slugify | builder-a | done | — | builder-a `a1b2c3d` | reports/t1-builder-a.md |
| t2 | implement truncate | builder-b | in_review | — | builder-b | reports/t2-builder-b.md |
| t3 | verify t1+t2 against acceptance | prober-a | in_progress | t1,t2 | — | — |
```

Keep the batch table under it in step with `team.mjs status`: which groups landed, which are
ready, which are blocked and on what.

The lead is the only writer of `board.md` and `team.json`. Update both on every status
transition, in the same step that the transition happens — a board that lags the run is
worse than no board, because it is believed.

## Resuming after a context loss

1. Read `team.json`, `board.md`, `inbox.log`, then the `reports/` files the open tasks point at.
2. Run `list_agents` with `descendants` and match ids against `members[].agentId`.
3. Re-attach with `send_message` to whoever is still `running` or `idle`; re-spawn anyone
   whose id no longer resolves (`send_message` says the message was not delivered) with a
   brief rebuilt from the reports.
4. Continue from the first task that is not `done`, and say plainly in the human report which
   part of the run predates the context loss.
