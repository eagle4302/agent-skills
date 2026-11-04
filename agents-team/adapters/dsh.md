# Adapter: DSH

DSH 0.2.1-rc.5 (desktop app, 2026-11-04). The rows below were measured on rc.3; the wait and
settlement surface was re-read against the rc.5 package. Two dispatch surfaces exist; this
adapter treats the **built-in Agent Teams** toolset as canonical and the plain `subagent` family
as the off-team fallback. The repo's preset compositions (`../preset/`) are the legacy path —
optional, never mounted live.

A teammate is a continuable `subagent` child: its turn end is pushed to the Lead as the same
settlement notice a plain `subagent` sends. Waiting is therefore event-driven — read the notice,
do not poll (`## Waiting: the notice is the receipt`).

Verified on 2026-10-29 from the tool schemas and a two-teammate smoke run, then re-measured on
2026-11-03 with a four-teammate probe: two spawned in parallel, one interrupted mid-turn, one
forked. Rows that are inferred rather than measured are marked `(assumed)` or `(inferred)` and
listed under "Verified / not verified".

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `spawn_teammate({ name, description, prompt, context })` — Lead only |
| `identity` | the teammate `name` is its address; `list_agents` returns target, role, status, description, provider, context and model. The teammate's own context names it: *"You are teammate `<name>`. Your Team Lead is named `lead`."* (measured 2026-11-03) |
| `parallel-spawn` | several `spawn_teammate` calls in one assistant message — measured 2026-11-03, two pairs started together |
| `status` | `list_agents`. `inactive` means no turn is executing, **not** that the task is done: a teammate whose shell jobs or subagents are still running is also `inactive`, so record it as `holding` in the board. A turn end arrives by itself as a settlement notice; `wait_agent` is a bounded blocking fallback, not the way to learn status (see "Waiting") |
| `steer` | `send_message` — lands at the target's nearest step boundary, starts an inactive target, and returns `{"sent":true}` (delivery, never a reply) |
| `stop` | `interrupt_agent` — measured 2026-11-03: returns `{ previousStatus: "running" }`, and the run's notice reads *"was stopped before it finished. It left no closing message."* Lead only |
| `gate` | **absent.** No host-run command decides acceptance |
| `raise` | `send_message` to `lead` — measured: the lead receives it as `Team message from <name>:<text>`. Siblings are not targets |
| `fresh-context` | `context: "fresh"` (default). Measured: no Lead turns, but the child does receive the team identity block and the global `~/.dsh/AGENTS.md`. `"fork"` copies the Lead's **completed** turns only — a fork quoted the previous human turn and not the in-flight one |
| `fan-out` | `workflow` — only when the human explicitly asks for a workflow or a large fan-out |
| `isolate` | **absent.** Teammates share the working tree; a task's `prepare` command is how a builder gets its own tree |

## Waiting: the notice is the receipt

A teammate is a continuable `subagent` child, so when its turn ends the harness publishes a
settlement notice to the Lead — the same `Background subagent <session-id> finished` message a
plain `subagent` produces, carrying the closing report. An idle Lead is woken by it; a busy Lead
receives it at its next step. The notice is the receipt; `wait_agent` is not.

1. **Dispatch is not a wait.** After briefing a teammate, do the Lead's queued work in the same
   turn. When there is none, end the turn — the settlement notice resumes it.
2. **`wait_agent` is a last resort inside one turn**, for the case where that turn cannot move
   without the next change (for example a batch that cannot land until one named teammate's
   report arrives). Give it 10–120 s (the tool rejects anything outside 10 s–1 h), make at most
   one call per pending need, and on `timedOut` or `noProgress` stop waiting: continue with other
   work or end the turn.
3. **`noProgress` means there is nothing to wait for** — no required member is running or
   provisioning. Re-list, finish anything the board still owns, and close the turn.
4. **Ending the turn is not skipping the wait.** The session policy's "The Lead must wait for
   required teammates before giving the final answer" is satisfied when the final answer comes
   only after their settlement notices have been read. Holding the turn open with `wait_agent`
   is the expensive way to obey the same rule, and it also hides `holding`: a teammate whose
   shell jobs are still running is `inactive` with no notice until its turn ends.

## Role dispatch

Agent Teams has **no role presets**. A role is a name plus a brief prefix, and nothing enforces it:
a teammate receives the session's tools. Treat the prefix as instruction and let the Lead's own
`verify` run and diff review be the backstop.

| Role | Dispatch | Enforced by | Still only the brief |
| --- | --- | --- | --- |
| scout | `spawn_teammate` with `name: "<team>-scout"`, prompt opening `ROLE: scout — read-only reconnaissance. Do not write or edit files.` | nothing at the harness level | what counts as in-scope |
| builder | `name: "<team>-builder"`, prompt opening `ROLE: builder — one territory.` | its `write_scopes` on the shared board, its `prepare` tree, and the Lead's diff review | its territory |
| prober | `name: "<team>-prober"`, prompt opening `ROLE: prober — do not edit. Re-run the task's verify command and report raw output.` | nothing; the Lead re-runs `verify` too | that it did not write the code |
| critic | `name: "<team>-critic"`, prompt opening `ROLE: critic — read-only. Report findings only.` | nothing | a dynamic claim it makes is unverified by construction |
| scribe | `name: "<team>-scribe"`, prompt opening `ROLE: scribe — write only the files the Lead names.` | the Lead's file list | what it writes |

Two consequences:

- **Verification independence is procedural.** The prober must be a different member from the
  builder, and the Lead re-runs every acceptance command before a batch lands (see Gate). Do not
  present a teammate's report as host-enforced evidence. The identity block does let a report say
  who it came from, which is what makes the independence auditable after a context loss.
- **The shared board can carry the plan.** `team_task_create` / `team_task_list` /
  `team_task_update` take `blocked_by` edges and `write_scopes`; it is durable and the human can
  see it. Readiness never starts an owner — the Lead still sends the next turn. Keep `team.json`
  and `board.md` as the skill's own state because `team.mjs` validates them, and mirror into the
  built-in board when the human or a teammate needs to watch progress.

## Gate

The harness has no gate. A brief that says "read-only" is not enforcement: a teammate gets the
session's tools. So the prober re-runs the acceptance commands and reports raw output, and **the
Lead re-runs the task's `verify` commands itself** before the batch lands. Say in the human report
which checks the Lead ran and that none were harness-enforced.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| `spawn_teammate` and `interrupt_agent` are Lead-only (stated on the tools); `team_task_*` and `wait_agent` are the Lead's orchestration tools in this session's guidance `(assumed: teammate access not measured)`. | Teammates that need another pair of eyes or a decision ask the Lead; the Lead decides. |
| `send_message` reaches the Lead from a teammate and a teammate from the Lead; the peer message arrives prefixed `Team message from <name>:` (measured 2026-11-03). Sibling messaging is not a target `(assumed)`. | Hub-and-spoke: the Lead is the only message bus. |
| `send_message` returns `{"sent":true}` — delivery confirmation, never a reply. | One-way traffic; the teammate answers in its own next turn. Never block on an ack. |
| `wait_agent` blocks the Lead's turn for the timeout the Lead passes (default 30 s, 10 s–1 h) and returns on the next team change — never on "all done". It never wakes an inactive member and returns `noProgress` when no other member is running. | Use it only for a bounded in-turn block (≤120 s, one call per pending need). Never as a progress bar: end the turn and let the settlement notice wake you. |
| `list_agents` returns description, provider, context and model per member. | A settlement notice's session id can be matched to a member by its description, or by the teammate naming itself in its report. |
| A settlement notice carries only a session id, not the teammate's name; it does carry the closing message. A stopped run's notice says it was stopped and has no closing message (measured 2026-11-03). | Match the notice to the task you sent, or read the report for the name. Do not treat the session id as the teammate target. |
| A teammate's turn end is delivered to the Lead as the same `Background subagent <session-id> finished` settlement notice a plain `subagent` sends; an idle Lead is woken into a new turn, a busy Lead gets it at its next step. | This is the default receipt path: dispatch, do the Lead's own work, end the turn. Polling duplicates a notice that arrives anyway. |
| A teammate's own context names it and its Lead, and includes the global `~/.dsh/AGENTS.md` (measured 2026-11-03). Project-level `AGENTS.md` / `CLAUDE.md` still `(assumed)` unverified. | Workspace rules may reach a teammate, but never rely on it: quote the project rules into the brief. |
| A teammate's tool list includes `subagent` and `subagent_fork`, but both report `remaining levels 0` at depth 1 (measured 2026-11-03). | Delegation depth is 1: a teammate cannot spawn helpers. |
| `context: "fork"` copies the Lead's completed turns, not the in-flight one (measured 2026-11-03: the fork quoted the previous human turn). | A fork is for context-rich analysis, not a substitute for the self-contained brief. |
| Teammates are durable. | A settled teammate can take more work; reuse a builder instead of respawning one per ticket. |
| There is no worktree isolation. | One writer per territory; give a builder its own tree with the task's `prepare` command, and check `git status --short` between batches. |
| The human can open and stop any teammate from the session header. | The Lead is not the only brake; say so when the work is long or risky. |
| A plain `subagent` child is expected to be absent from `list_agents` `(inferred: the description lists only the Lead and durable teammates; not measured)`. | Use `spawn_teammate` when the Lead needs an addressable, durable member. |
| `workflow` is for fan-out, not for teammates. Harness guidance: only when the human asks for a workflow or a large orchestration. | Do not wrap a two-teammate team in a workflow script. |
| A teammate runs on the session's model; `spawn_teammate` has no model field. | Per-run model routing exists only inside `workflow` (`agent(..., { provider, model })`). |

## Verified / not verified

Verified on 0.2.1-rc.3 from this session's tool schemas:

- tool names and argument shapes for `spawn_teammate`, `send_message`, `list_agents`,
  `wait_agent`, `interrupt_agent`, `team_task_create` / `get` / `list` / `update`, and `workflow`;
- the Lead-only restriction stated on `spawn_teammate`, `interrupt_agent` and `team_task_*`;
- `spawn_teammate` `context: "fresh" | "fork"`;
- the version the rows were read on: 0.2.1-rc.3 (uninstall registry); 0.2.1-rc.5 was installed on
  2026-11-04.

Measured on 2026-10-29 (two-teammate smoke run, read-only task, clean `git status` afterwards):

- two `spawn_teammate` calls in one message started both teammates; `member.target` was the name;
- `list_agents` listed lead plus both, and `inactive` meant the turn had ended;
- `send_message` reached a running teammate and woke an inactive one;
- `wait_agent` returned on teammate changes and `noProgress` once none was active;
- `team_task_create` + `blocked_by` kept the blocked task `ready:false` until its blocker completed;
- a teammate report arrived as a settlement notice carrying a session id, not the teammate name.

Measured on 2026-11-03 (four-teammate probe):

- the teammate's context names it and its Lead, and carries the global `~/.dsh/AGENTS.md` — a
  fresh child quoted the first line of the rules file and called itself `p2-prober-b`;
- a teammate's `send_message` to `lead` arrived as `Team message from p2-scout-a:…`, and returned
  `{"sent":true}`;
- `interrupt_agent` on a running teammate returned `{ previousStatus: "running" }`; the notice
  read "was stopped before it finished. It left no closing message." and `list_agents` showed it
  `inactive`;
- `context: "fork"` inherited the previous human turn ("commit，繼續下一輪") and not the
  in-flight one;
- a teammate's `subagent` / `subagent_fork` report `remaining levels 0`: depth 1.

Assumed, not measured:

- sibling messaging is not a target (only Lead↔teammate was exercised);
- project-level `AGENTS.md` / `CLAUDE.md` reaching a teammate the way the global one does;
- a plain `subagent` child being absent from `list_agents`;
- whether a teammate can call `team_task_*` or `wait_agent` (the session guidance calls them the
  Lead's tools, but that was not exercised from a teammate).

Re-read on 2026-11-04 against the installed 0.2.1-rc.5 package (source, not a live run):

- a teammate is spawned through `startActivation({ delivery: "parent" })`, so its turn end
  publishes the same settlement notice as a plain `subagent` (`dsh-experimental-agent-team`
  `spawnAdmitted`; `dsh-subagent` `notifySettlement`);
- the notice reaches an idle parent as a queued message that starts a new parent turn, and a busy
  parent at its next step; only a parent already draining gets it injected;
- `wait_agent` returns on the next team change, its default timeout is 30 s, and its accepted
  range is 10 s–1 h (`dsh-experimental-tool-agent-team` `wait_agent`);
- the DSH team policy text pushes blocking: "Before wait_agent, use list_agents …" and "The Lead
  must wait for required teammates before giving the final answer" (`teamPolicy()`).

Measured on 2026-11-04 from local session logs (`~/.dsh/sessions`, multi-frame
`session.v4.jsonl.zstd` read with `zstd -dc`):

- agents-team runs made 26–36 `wait_agent` calls each, with 3–20 min timeouts and single calls up
  to 15 min; those sessions also carry the settlement notices, so the polling was redundant;
- a plain-subagent skill run (`implement-spec`) made 11 `subagent` calls and 0 `wait_agent` calls;
- a human stop during a wait surfaces as `wait_agent aborted: { kind: 'user' }`.

Not exercised after this guidance: a live team run that dispatches, ends its turn, and is woken
only by settlement notices. That path is read from the runtime source, not measured end to end.

## Legacy: preset compositions (rc.2)

`../preset/` documents the earlier route: five role presets selected through
`subagent(agent_preset: …)`, with composition-enforced read-only roles. It was verified against
0.2.1-rc.2 and never mounted by a live session; in this rc.3 session the `subagent` schema has no
`agent_preset` field, and the reference composition was not re-extracted for rc.3. Treat it as an
optional strict-role path, not the DSH default; read `../preset/README.md` before installing it.
