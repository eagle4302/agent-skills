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

`scripts/check-team-preset.mjs` re-checks the role-tool preset after a DSH upgrade (row ids,
plugin resolution, one model-selection owner, role personas and filters, `maxDepth` semantics);
run it with `--modules <checkout>/node_modules`.

## `team.json` schema v1

| Block | Fields |
| --- | --- |
| top | `schema` (1), `name`, `objective`, `createdAt`, `phase`, `humanGates[]` |
| `members[]` | `name`, `role`, `agentId`, `status`, `territory[]`, `model` |
| `tasks[]` | `id`, `kind`, `subject`, `status`, `assignee`, `dependencies[]`, `attempt`, `objective`, `acceptance[]`, `verify[]`, `inScope[]`, `outOfScope[]`, `evidence`, `reviewedTaskId`, `verdict` |

Enumerations — keep them exact, the script validates them:

| Field | Values |
| --- | --- |
| `phase` | `chartering`, `staffing`, `running`, `verifying`, `integrating`, `closed` |
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
- `evidence` points at `reports/<task-id>-<role>.md`. A `done` task without evidence is a lie
  in JSON form.
- `attempt` counts verification failures, not edits. `2` is the escalation trigger.
- Status vocabulary is deliberately the same seven states the DSH Taskboard uses, so a team
  mirrored onto a Taskboard project needs no translation. This skill never writes to the
  Taskboard: agents cannot create tasks there, so the board stays the human's to open.

Secrets never go in these files — they are plain text and often land in a repo.

## `board.md`

One table, newest state, plus a short header. Keep it skimmable by a human who has not read
`team.json`:

```markdown
# <slug> — <objective>

phase: running · updated: 2026-09-17T04:30Z

| id | task | owner | status | deps | evidence |
| --- | --- | --- | --- | --- | --- |
| t1 | implement slugify | builder-a | done | — | reports/t1-builder-a.md |
| t2 | implement truncate | builder-b | in_review | — | reports/t2-builder-b.md |
| t3 | verify t1+t2 against acceptance | prober-a | in_progress | t1,t2 | — |
```

The lead is the only writer of `board.md` and `team.json`. Update both on every status
transition, in the same step that the transition happens — a board that lags the run is
worse than no board, because it is believed.

## Resuming after a context loss

**First decide which kind it is — the two have different first moves:**

| Situation | `list_agents` | What to do |
| --- | --- | --- |
| The context was compacted inside the same session | `running` / `idle` teammates still resolve | Steps 1–4 below: re-attach |
| **The human opened a new conversation** | **empty** | **Do not spend a turn on `send_message`** — old agent ids are unreachable from a new session. Read the team directory and spawn fresh teammates from `reports/` |

1. Read `team.json`, `board.md`, `inbox.log`, then the `reports/` files the open tasks point at.
2. Run `list_agents` with `descendants` and match ids against `members[].agentId`.
3. Re-attach with `send_message` to whoever is still `running` or `idle`; re-spawn anyone
   whose id no longer resolves (`send_message` says the message was not delivered) with a
   brief rebuilt from the reports.
4. Continue from the first task that is not `done`, and say plainly in the human report which
   part of the run predates the context loss.

### When the human is about to change conversations: write `HANDOFF.md`

The moment the human says anything like "give me a prompt to continue in a new conversation",
"we'll pick this up in a new chat", or "write the handoff", the lead writes
`<team dir>/HANDOFF.md`. It is the **first thing the next session reads**, and it is written
for an agent that has none of this conversation.

It must contain:

- **The objective in one sentence, and what is actually blocking it right now.**
- **The real state of the tree**: `git log -1`, `git status`, which ticket each uncommitted
  file belongs to, and their hashes — verified in this run, not remembered.
- **"No agent id is reachable from a new session."** Without that line, the next agent burns
  a turn on `send_message` before discovering it.
- Decisions already made that must not be re-litigated.
- The remaining steps **in order**, each with how to measure its acceptance.
- The lessons and landmines from this run (the ones that cost real time).
- External channels: remote hosts, how to reach them, and their gotchas.

Keep it current: update it when the state changes, not only at the end. A stale handoff is
worse than none, because it is believed.
