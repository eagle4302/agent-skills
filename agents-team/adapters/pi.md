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
deliberate fork in `members[].model` as `(fork)`.

## Model: specified wins, otherwise inherited

A teammate's model comes from whoever specified one, otherwise from the lead. The human is the only
one who specifies — an instruction for this run ("run the prober on X"), or a pin they already made
in configuration. The lead does not route on its own initiative: no `model` on a dispatch the human
did not ask for, no per-agent `model:` line the lead picked, no `subagents.defaultModel` the lead set
for the team.

Resolution is pi's own, strongest first: per-run dispatch `model` → provider-scoped role override →
`subagents.agentOverrides.<name>.model` → agent frontmatter `model` → `subagents.defaultModel` →
the parent session model (`docs/models.md`, "Precedence"). With nothing specified anywhere, the
builtins pin no model and inherit the current Pi default — the normal case. `model: "inherit"` in a
definition or an override selects the parent session model explicitly.

Pass a dispatch `model` only when the human named it for that teammate in this run, and quote them in
`inbox.log`. `members[].model` records what the member actually ran on, copied from
`{ action: "models" }`, plus the source of the route (human instruction, settings override, agent
definition, or inheritance); it is an audit field, never how the lead chooses a route. Whether to
keep a profile's `thinking` level is a separate question this rule does not settle.

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
| **On Windows a settled run does not kill the processes its child started.** Three call sites: `src/runs/shared/background-process-options.js:1-6` spawns the child with `detached: platform !== "win32"` (no process group on win32); `src/runs/background/async-execution.js:248,266,283` terminates with `process.kill(pid, signal)` on the runner pid alone; `src/runs/background/owned-process-tree.js:80-90` returns `{ state: "unknown", reason: "unsupported-platform" }` on win32. `taskkill /PID <pid> /T /F` exists only for external-CLI agents (`src/runs/shared/external-cli-runner.js:104-112`) and worktree setup commands (`src/runs/shared/worktree-setup-command.js:14`), so those are covered and a native child run is not. On POSIX the child gets its own group and teardown kills `-pid` plus enumerates the members — but a job the child detaches itself (`nohup`, `setsid`, `disown`) escapes there too (`knownDetachedDescendants`). | A teammate's bash `… &` grandchildren — CPU-load busy loops, dev servers, watchers, `dotnet run` — outlive the run, so scan and kill them **before** you trust your own build or test output: they hold ports, lock `bin\`/`obj\` files, and turn known-flaky tests red. `yes > /dev/null` writes to the Windows `NUL` device, which never fails, so it cannot die on its own. Observed 2026-10-01: 10 orphaned `yes.exe` loops from one prober, ~2,100 CPU-seconds each, and full-suite runs red under that load. |

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

Observed on 2026-10-01 (pi-subagents 0.74.0, Windows): a prober dispatched through this adapter left
10 orphaned `yes.exe` load loops behind after its run settled, and the lead's own full-suite runs came
back red while those loops were burning ~10 cores. The Windows branch and the two `taskkill` call sites
above were re-read from the installed package that night, and the loops were killed by pid
(`Stop-Process -Id … -Force`; note `taskkill /F /PID` is mangled by MSYS path conversion in Git Bash).
