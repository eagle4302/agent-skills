# Adapter: pi (`pi-subagents`)

One `subagent` tool. Dispatch takes `agent` + `task`; everything else is an `action`.
When a row here disagrees with the extension, the extension wins — read it with
`subagent({ action: "guide", topic: "tool-reference" })`.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `subagent({ agent: "worker", task: "<brief>", context: "fresh" })` — background by default; `async: false` blocks the parent and runs in-process |
| `identity` | the returned run id; store it in `members[].agentId` |
| `parallel-spawn` | several `subagent` calls in one assistant message |
| `status` | `subagent({ action: "status" })`, or `view: "fleet"`; one run with `id` + `view: "transcript"`; finished children with `subagent({ action: "children.list" })` |
| `steer` | `subagent({ action: "steer", id: "<runId>", mode: "steer" })` |
| `stop` | `subagent({ action: "stop", id: "<runId>" })` |
| `gate` | `gate: "<command>"` on the dispatch — present and host-run |
| `raise` | the child calls `contact_supervisor`; the supervisor bridge defaults to `mode: "always"`, so it is auto-added |
| `fresh-context` | `context: "fresh"` — **must be explicit**, see below |
| `fan-out` | `runs.all` / `runs.run` in one call, or `workflowScript`; packaged prompts `/parallel-review`, `/parallel-cleanup`, `/parallel-research`, `/review-loop` |
| `isolate` | `isolation: "worktree"` (needs git); `none` runs in the shared cwd |

## Role dispatch

| Role | Dispatch | What the profile already does | Still only the brief |
| --- | --- | --- | --- |
| scout | `subagent({ agent: "scout", task, context: "fresh" })` | fast local recon: files, entry points, data flow, risks | keeping it read-only — say "write no files" |
| builder | `subagent({ agent: "worker", task, context: "fresh" })` | implementation; escalates unapproved decisions instead of guessing | its territory, and `context` |
| prober | `subagent({ agent: "reviewer", task, gate: "<verify cmd>", context: "fresh" })` | review against the task, tests, edge cases; the `gate` is host-run | that it is not the author — the lead must pick a different child |
| critic | `subagent({ agent: "oracle", task, context: "fresh" })` | second opinion, challenges assumptions, does not edit | the two axes, the verdict vocabulary, and `context` |
| prober (claims) | `subagent({ agent: "evidence-auditor", task, context: "fresh" })` | checks whether claims are supported by their sources | needs `pi-web-access` in the child |
| scribe | `subagent({ agent: "delegate", task, context: "fresh" })` | behaves close to the parent session | doc conventions |

Read the current list with `subagent({ action: "list" })` and one profile with
`subagent({ action: "get", agent: "<name>" })`; your machine may ship more than these.

## `context` is not `fresh` by default — say it out loud

Of the profiles above, **`worker` and `oracle` declare `defaultContext: fork`**; `scout`,
`reviewer`, `evidence-auditor` and `delegate` leave it unset and fall back to `fresh`. When
`context` is omitted, the pi config's `defaultSubagentContext` wins if it is set, and each
agent's own `defaultContext` wins otherwise.

So leaving `context` off a builder or a critic copies the lead's entire conversation into it:
real tokens per teammate, and on a critic it hands over exactly the framing it was staffed to
challenge. Pass `context: "fresh"` on every dispatch unless you mean `fork`, and record a
deliberate fork in `members[].model` as `provider/model (fork)`.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| A steer lands at the child's **next tool boundary**, never inside a tool call. | A child deep in one long command will not hear you for a while. |
| Steer modes: `steer`, `follow_up`, `auto`, `plan`, `apply`. | `steer` redirects the current run; `follow_up` queues work after it. Pick deliberately. |
| The steer receipt (requested, routed, delivered) shows up in run status and events. | Quote the receipt, not your intention. |
| Async runs **notify the parent natively** when they settle. | Do not poll, and do not wrap an ordinary async child in `bg_wait`. |
| Children cannot address each other. | Hub-and-spoke; the lead relays. |
| `stop` ends the run; completed children stay addressable through `children.list` and may be `resume`-able. | Check `resumable` per row before planning to resume; otherwise start a same-role fallback and label it as fallback. |
| Spawn budgets are real: `maxSubagentSpawnsPerSession`, `maxSubagentSpawnsPerRun`, `globalConcurrencyLimit`. | Team size is enforced, not just advised. Check `action: "doctor"` before a wide fan-out. |
| A foreground child never loads the parent's ambient extensions. | A teammate needing MCP tools (`codegraph`, web access) must be a background child. |
| `maxSubagentDepth` binds nested delegation. | A lane cannot spawn its own help unless you chartered it. |
| The human can open FleetView (`/subagents-fleet`) and steer or stop anything. | You are not the only brake; say so when a run is long or risky. |

## Gate

```
subagent({ agent: "worker", task: "<brief>", context: "fresh",
           gate: "dotnet test Foo.Tests/Foo.Tests.csproj -c Release" })
```

Host-run: the child's result is not accepted unless the command passes. `gate` is shorthand
for `acceptance: { level: "verified", verify: [{ id: "gate", command }] }`; the object form
`{ command, output: "json", schema }` turns passing stdout into the child's `structuredOutput`,
and `acceptance` takes several commands. It is also valid per lane on `runs.run` / `runs.all`.

A gate proves the command passed. It does not prove the command tested the right thing, and it
cannot read a diff for scope creep — so it never replaces the prober. Say in the human report
which checks were gates and which were a model's word.

## Do not cap a builder with `toolBudget`

`toolBudget`'s default block list is `read`, `grep`, `find`, `ls` — read tools, not write
tools. Capping a thrashing builder removes its ability to look things up and leaves its ability
to write. The harness's own guidance reserves hard budgets for read-only scouts, probers and
validators; for a looping builder, `stop` and re-brief instead.

## Verified / not verified

Read from the installed package on 2026-09-23 (`node_modules/pi-subagents/docs/` and
`agents/*.md`): every capability row, the profile list, the two `defaultContext: fork`
profiles, the spawn-budget names, the supervisor-bridge default, the `gate` shorthand, the
packaged prompt names, and the `toolBudget` guidance.

Not observed in a live run: none of it. No full team has been dispatched on pi — see
`VALIDATION.md`, "Owed acceptance test".
