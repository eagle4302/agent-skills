# Adapter: Claude Code

One `Agent` tool. Dispatch takes `subagent_type` + `prompt`; the management verbs are separate
tools (`ListAgents`, `SendMessage`, `TaskOutput`, `TaskStop`), several of which may be deferred
in a given session and have to be loaded by name before they can be called.

**This is one of the thinnest shipped harnesses for a team**, in one specific way: there is no
host-run `gate`. Read "Gate" below before staffing — it changes
who owns step 5.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `Agent({ subagent_type: "general-purpose", prompt: "<brief>", description: "<3-5 words>" })` — background by default; `run_in_background: false` blocks |
| `identity` | the returned agent id/name; store it in `members[].agentId` |
| `parallel-spawn` | several `Agent` calls in one assistant message |
| `status` | `ListAgents` for the roster; `TaskOutput` for one agent's output |
| `steer` | **absent as a mid-run redirect.** `SendMessage` continues an agent with its context intact, which is a follow-up, not an interrupt |
| `stop` | `TaskStop` |
| `gate` | **absent.** No dispatch parameter runs a host command against the result |
| `raise` | **absent.** A teammate has no channel to the lead before it finishes; its final report is the only message |
| `fresh-context` | the default — a new `Agent` call starts fresh. `subagent_type: "fork"` is the opt-in that inherits this conversation |
| `fan-out` | the `Workflow` tool, but **only with the user's explicit opt-in**; otherwise fan out as parallel `Agent` calls |
| `isolate` | `isolation: "worktree"` |

## Role dispatch

Agent types come from `.claude/agents/*.md` frontmatter (user- or project-level) or from the
SDK. With none defined, these built-ins are what you have:

| Role | `subagent_type` | What it already does | Still only the brief |
| --- | --- | --- | --- |
| scout | `Explore` | read-only fan-out search; reads excerpts, locates code | it locates code, it does not review it — do not ask it to judge |
| builder | `general-purpose` | full tool access, multi-step execution | its territory |
| prober | `general-purpose`, a **second** call | nothing role-specific | everything: independence, the acceptance list, the evidence format |
| critic | `general-purpose`, a second call | nothing role-specific | the two axes, the verdict vocabulary, and "edit nothing" |
| scribe | `general-purpose` | nothing role-specific | doc conventions |
| planning | `Plan` | step-by-step implementation plans, trade-offs | it is a planner, not a builder |

Check what this session actually offers before staffing — the list is per-session and a project
may define its own. Two consequences of `general-purpose` carrying no role posture:

- **Read-only is entirely the brief's job.** `Explore` cannot edit; nothing else is constrained.
  Write it in the brief and check the diff against `baseline.sha` afterwards.
- **Independence is entirely the lead's job.** Spawn a separate agent for the prober, and never
  `SendMessage` the builder a second brief asking it to verify itself.

## Gate

With no `gate`, nothing in the harness rejects a teammate's result. A builder that says "tests
pass" is a claim with nothing behind it, and there is no host output to quote.

The substitute, and it is not optional:

1. The prober still runs, still re-runs the acceptance commands, and still reports raw output.
2. **The lead then runs the task's `verify` commands itself**, in its own session, before the
   batch lands. That output is the evidence of record.
3. Say so in the human report, in those words: which checks the lead ran, and that no check on
   this harness was harness-enforced.

Skipping step 2 because a prober said PASS is how a Claude Code team ships an unverified batch.
On pi the harness would have caught it; here nothing will.

## Model

This adapter records no per-dispatch model parameter on `Agent`, so a route on this harness can only
come from the human: an instruction for this run, or a model the human already pinned in an agent
definition (`.claude/agents/*.md` frontmatter). The lead does not route on its own initiative. Record
what each teammate actually ran on — and where the route came from — in `members[].model`:
`inherited`, or the specified `provider/model`.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| The agent's final report is **not shown to the user**. | The lead must relay. This matches the skill's "one voice to the human" rule exactly — nothing leaks past you. |
| A teammate cannot raise a blocker mid-run. | Keep briefs small. A stuck teammate burns its whole run before you hear about it, so an oversized brief costs more here than on pi. |
| `SendMessage` continues an agent rather than interrupting it. | "Steer" in the neutral files means: `TaskStop`, then re-brief a fresh agent, or accept the run and correct after. |
| A new `Agent` call starts fresh; `fork` is the explicit inheritance. | The default is the one you want. Still write a self-contained brief and paste `houseRules` — do not rely on a subagent inheriting the project's conventions. |
| `Workflow` needs the user's explicit opt-in and can spawn dozens of agents. | Never reach for it on your own initiative for a fan-out stage. Ask, or use parallel `Agent` calls. |
| Several management tools are deferred. | Load `SendMessage`, `TaskStop`, `TaskOutput` by name in one batched call before you need them, not one at a time mid-run. |
| `isolation: "worktree"` branches from the **default branch**, not the lead's `HEAD`, and carries nothing uncommitted. | A teammate that must start from the lead's scaffolding (a paired build's stubs, any uncommitted contract) gets a tree the lead made — `git worktree add --detach` plus the probe-tree sync in `staffing.md` — named by path in its brief. |

## Verified / not verified

Read from the live tool schemas in a Claude Code session on 2026-09-23: the `Agent` parameters,
background-by-default, `isolation`, the built-in `subagent_type` list, the absence of any gate
parameter, the "final report is not shown to the user" behaviour, and which management tools
arrive deferred.

Read from the Claude Code sub-agents docs on 2026-10-13: an `isolation: "worktree"` tree is
branched from the default branch rather than the parent session's `HEAD`.

Assumed, not verified: that a subagent does not pick up the project's `CLAUDE.md` on its way in.
The skill's discipline makes this safe either way — `houseRules` is pasted into every brief — but
do not claim in a report that a teammate had rules it was never handed.

Not observed in a live run: no team has been dispatched on this harness.
