# Adapter: Grok Build

One `spawn_subagent` tool. There is no `subagent_type` and no host-run gate.
Read "The lead is the verifier of record" below before staffing.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `spawn_subagent({ description, prompt, background: true, cwd })`. `background: false` waits. A new call starts a new conversation. |
| `identity` | the returned `subagent_id`. Store it in `members[].agentId`. |
| `parallel-spawn` | several `spawn_subagent` calls in one assistant message. They run at the same time. |
| `status` | `get_command_or_subagent_output({ task_ids, timeout_ms })` |
| `steer` | **absent.** `resume_from` continues a **completed** child only. It is not a mid-run redirect. |
| `stop` | `kill_command_or_subagent({ task_id })` |
| `gate` | **absent.** No parameter runs a host command against the result. |
| `raise` | **absent.** The child has no channel before it finishes. |
| `fresh-context` | the default. The child does not see the lead's conversation. `resume_from` is the opt-in that continues a finished child's transcript. There is no parameter that forks the live conversation. |
| `fan-out` | the `workflow` tool runs a Rhai script. Do not use it for a team stage unless the human asked for a workflow. |
| `isolate` | `isolation: "worktree"` makes a new git worktree, or pass `cwd` of a worktree the lead already made. This run uses `cwd`. |

## Role dispatch

No agent profiles. Every role is the same tool. The brief is the whole contract.

| Role | Call | What it already does | Still only the brief |
| --- | --- | --- | --- |
| scout | `spawn_subagent` | nothing role-specific | read-only, facts with file:line |
| builder | `spawn_subagent` | full tools, its own `cwd` | territory, house rules, acceptance |
| prober | a **second** `spawn_subagent` | nothing role-specific | independence, mutate+revert, evidence |
| critic | a second `spawn_subagent` | nothing role-specific | two axes, verdict vocabulary, edit nothing |
| scribe | `spawn_subagent` | nothing role-specific | doc conventions |

Read-only and independence are not enforced by the tool. Write them in the brief and check the diff afterwards. Never hand the prober's task to the child that wrote the code.

## The lead is the verifier of record

No gate. A builder that says "tests pass" is a claim.

1. The prober still re-runs acceptance and reports raw output.
2. The lead runs the task's `verify` commands itself, on the tree about to land, before the commit.
3. Say so in the human report: which checks the lead ran, and that nothing was harness-enforced.

## Model

`spawn_subagent` has no model parameter. The child inherits the session model. The lead does not route. Record `inherited (<session model>, fresh context)` in `members[].model`.

## Edges

| Fact | Consequence |
| --- | --- |
| The child's final report is returned to the lead, not shown as the user-facing answer. | The lead relays. |
| No mid-run raise. | Keep the brief to one round. A stuck child burns the whole run. |
| No steer. | `kill_command_or_subagent`, then a fresh brief. Do not `resume_from` a reviewer into a builder. |
| Fresh context is the default and cannot be turned off except by `resume_from` on a finished child. | Paste `houseRules`. |
| `isolation: "worktree"` creates a new worktree. | This run already has `wt-po/*`. Pass `cwd`. |
| Old `agentId`s from a Claude Code session do not resolve here. | Spawn fresh. Do not steer those ids. |

## Verified / not verified

Verified from the live tool schemas in this Grok Build session on 2026-10-09: `spawn_subagent` parameters (`prompt`, `description`, `background`, `isolation`, `resume_from`, `cwd`), background default, fresh conversation, `get_command_or_subagent_output`, `kill_command_or_subagent`, no gate parameter, no model parameter.

Assumed, not verified: that a child does not load `AGENTS.md` / `CLAUDE.md` on its own. Paste `houseRules` either way.
