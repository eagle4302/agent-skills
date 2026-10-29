# Adapter: DSH

DSH 0.2.1-rc.3 (desktop app). Two dispatch surfaces exist; this adapter treats the **built-in
Agent Teams** toolset as canonical and the plain `subagent` family as the off-team fallback.
The repo's preset compositions (`../preset/`) are the legacy path — optional, never mounted live.

Verified on 2026-10-29 against this session's own tool schemas plus one plain-subagent probe. Rows
that are inferred rather than read are marked `(assumed)` or `(inferred)` here and listed under
"Verified / not verified".

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `spawn_teammate({ name, description, prompt, context })` — Lead only |
| `identity` | the teammate `name` is its address; `list_agents` lists every target |
| `parallel-spawn` | several `spawn_teammate` calls in one assistant message `(assumed: not measured, but the subagent family documents the one-message pattern)` |
| `status` | `list_agents` — `inactive` means no turn is executing, **not** that the task is done; `wait_agent` waits for the next status, message, or shared-task change |
| `steer` | `send_message` — lands at the target's nearest step boundary and starts an inactive target |
| `stop` | `interrupt_agent` — ends the current turn, keeps the pending inbox; Lead only |
| `gate` | **absent.** No host-run command decides acceptance |
| `raise` | `send_message` from a teammate to `lead`; the Lead sees the sender's name first `(assumed)` |
| `fresh-context` | `context: "fresh"` (default) or `"fork"` (inherits the Lead's completed turns) |
| `fan-out` | `workflow` — only when the human explicitly asks for a workflow or a large fan-out |
| `isolate` | **absent.** Teammates share the working tree; disjointness is the brief plus `write_scopes` on the shared board |

## Role dispatch

Agent Teams has **no role presets**. A role is a name plus a brief prefix, and nothing enforces it:
a teammate receives the session's tools. Treat the prefix as instruction and let the Lead's own
`verify` run and diff review be the backstop.

| Role | Dispatch | Enforced by | Still only the brief |
| --- | --- | --- | --- |
| scout | `spawn_teammate` with `name: "<team>-scout"`, prompt opening `ROLE: scout — read-only reconnaissance. Do not write or edit files.` | nothing at the harness level | what counts as in-scope |
| builder | `name: "<team>-builder"`, prompt opening `ROLE: builder — one territory.` | its `write_scopes` on the shared board, and the Lead's diff review | its territory |
| prober | `name: "<team>-prober"`, prompt opening `ROLE: prober — do not edit. Re-run the task's verify command and report raw output.` | nothing; the Lead re-runs `verify` too | that it did not write the code |
| critic | `name: "<team>-critic"`, prompt opening `ROLE: critic — read-only. Report findings only.` | nothing | a dynamic claim it makes is unverified by construction |
| scribe | `name: "<team>-scribe"`, prompt opening `ROLE: scribe — write only the files the Lead names.` | the Lead's file list | what it writes |

Two consequences:

- **Verification independence is procedural.** The prober must be a different member from the
  builder, and the Lead re-runs every acceptance command before a batch lands (see Gate). Do not
  present a teammate's report as host-enforced evidence.
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
| `send_message` reaches the Lead from a teammate and a teammate from the Lead; siblings are not targets. `(assumed)` | Hub-and-spoke: the Lead is the only message bus. |
| `send_message` returns delivery confirmation, never a reply. | One-way traffic; the teammate answers in its own next turn. Never block on an ack. |
| `wait_agent` observes only changes after the call starts; it never wakes an inactive member and returns `noProgress` when no other member is running. | Re-list after a wakeup or timeout instead of polling. |
| `list_agents` `inactive` means no turn is executing. | Read the settlement notice or the artifact, not the state. |
| `context: "fork"` copies the Lead's completed turns, not the in-flight one. | A fork is for context-rich analysis, not a substitute for a self-contained brief. |
| Teammates are durable. | A settled teammate can take more work; reuse a builder instead of respawning one per ticket. |
| There is no worktree isolation. | One writer per territory; overlapping edits are a Lead bug. |
| The human can open and stop any teammate from the session header. | The Lead is not the only brake; say so when the work is long or risky. |
| A plain `subagent` child is expected to be absent from `list_agents` `(inferred: the description lists only the Lead and durable teammates; not measured)`. | Use `spawn_teammate` when the Lead needs an addressable, durable member. |
| `workflow` is for fan-out, not for teammates. Harness guidance: only when the human asks for a workflow or a large orchestration. | Do not wrap a two-teammate team in a workflow script. |
| A teammate runs on the session's model; `spawn_teammate` has no model field. | Per-run model routing exists only inside `workflow` (`agent(..., { provider, model })`). |
| A plain `subagent` child received the global `~/.dsh/AGENTS.md` in a 2026-10-29 probe. `(measured for subagent; assumed for teammates)` | Assume workspace rules may reach a teammate; still quote the project rules it needs into the brief. |

## Verified / not verified

Verified on 0.2.1-rc.3 on 2026-10-29 from this session's tool schemas:

- the tool names and argument shapes for `spawn_teammate`, `send_message`, `list_agents`,
  `wait_agent`, `interrupt_agent`, `team_task_create` / `get` / `list` / `update`, and `workflow`;
- the Lead-only restriction stated on `spawn_teammate`, `interrupt_agent` and `team_task_*`;
- `spawn_teammate` `context: "fresh" | "fork"`, and that a fork inherits completed Lead turns;
- a plain `subagent` child receives the global `~/.dsh/AGENTS.md` (one probe, reported 2026-10-29)
  and is expected to be absent from `list_agents` (inferred, not measured);
- the installed app version: 0.2.1-rc.3 (uninstall registry).

Assumed, not measured:

- several `spawn_teammate` calls in one assistant message run in parallel;
- a teammate can message the Lead, and sibling messaging is not a target;
- project-level `AGENTS.md` / `CLAUDE.md` files reach a teammate the same way the global one
  reaches a `subagent`.

Not verified:

- no live Agent Teams run has used this adapter yet (no teammate was spawned for it), so the whole
  path is designed, not proven;
- whether a teammate can spawn its own helpers; assume delegation depth 1, as with `subagent`.

## Legacy: preset compositions (rc.2)

`../preset/` documents the earlier route: five role presets selected through
`subagent(agent_preset: …)`, with composition-enforced read-only roles. It was verified against
0.2.1-rc.2 and never mounted by a live session; in this rc.3 session the `subagent` schema has no
`agent_preset` field, and the reference composition was not re-extracted for rc.3. Treat it as an
optional strict-role path, not the DSH default; read `../preset/README.md` before installing it.
