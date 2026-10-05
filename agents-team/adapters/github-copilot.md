# Adapter: GitHub Copilot

One `task` tool for dispatch, taking `agent_type` + `prompt` (plus `name`, `description`, `mode`).
Management is a separate tool family — `list_agents`, `read_agent`, `write_agent`. That split is the
shape of a team here: dispatch is a tool call, management is its own verb.

**There is no host-run `gate`, and no tool that stops an agent.** Read "The lead is the verifier of
record" before staffing — it changes who owns step 5.

Do not confuse `send_message` with a teammate verb: it targets **sessions and chats**, not the
`task` teammates a team is staffed from. For a teammate, the verb is `write_agent`.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `task({ agent_type: "<profile>", prompt: "<brief>", description: "<3-5 words>", name: "<slug>", mode: "background" })` — returns an agent id; `mode: "sync"` blocks the lead |
| `identity` | the returned agent id; store it in `members[].agentId` — it is what `list_agents`, `read_agent` and `write_agent` all take |
| `parallel-spawn` | several `task` calls in one assistant message, each `mode: "background"` |
| `status` | `list_agents` for the roster (`running` / `idle` / `completed` / `failed` / `cancelled`); one teammate's output with `read_agent` (`since_turn` for a specific turn) |
| `steer` | **absent as a mid-run redirect.** `write_agent` continues a teammate with its context intact; a message to a *running* agent is queued and delivered after its current turn — a follow-up, not an interrupt |
| `stop` | **absent.** No tool cancels an agent; the human can stop it from the session UI |
| `gate` | **absent.** No `task` parameter runs a host command against the result |
| `raise` | **absent.** A teammate has no channel to the lead before it finishes; its final result is the only message |
| `fresh-context` | the default — a `task` teammate runs in its **own context window** and the tool states plainly that each agent is stateless, so the whole brief must be in the prompt |
| `fan-out` | **absent as a packaged tool.** Lanes are plain parallel `task` calls with one shared brief shape; synthesise the result yourself |
| `isolate` | **absent on the dispatch.** `create_session` can give a genuinely separate worktree and branch, but that is a *peer session*, not a `task` teammate — see the edges |

`task` also accepts `model`, `reasoning_effort` and `context_tier` per dispatch — a real per-dispatch
route, subject to "Model" below.

## Role dispatch

`agent_type` comes from the session's own `task` schema; a project may add its own agent types, so
read the live list before staffing. The built-ins observed were:

| Role | `agent_type` | What it already does | Still only the brief |
| --- | --- | --- | --- |
| scout | `explore` | read-only reconnaissance — search, locate, follow data flow; runs on a fast lightweight model | it locates code, it does not review it — do not ask it to judge |
| builder | `general-purpose` | full toolset, multi-step execution, its own subprocess | its territory |
| prober | `general-purpose`, a **second** call | nothing role-specific | independence, the acceptance list, the evidence format, "edit nothing" |
| critic | `general-purpose`, a second call; or the built-in `code-review` when the job is exactly a diff review | `code-review` is read-only and diff-scoped, but reports only high-confidence bugs and ignores style | the two axes, the verdict vocabulary, "edit nothing" |
| scribe | `general-purpose` | nothing role-specific | doc conventions |
| research | `research` | searches GitHub, fetches files, verifies claims, reports findings with citations | the question, and that every claim carries a source |
| security | `security-review` | read-only exploitable-vulnerability specialist | reach for it only when the human asked for a security pass; otherwise it is not this skill's critic |

**Do not staff the prober on the `task` agent type by name.** Its contract is a *summary on success
and full output only on failure* — the opposite of the skill's "raw output is mandatory" evidence
format. Use `general-purpose` and demand the raw output in the brief.

Two consequences of a profile list where only `explore`, `code-review` and `security-review` carry a
read-only posture:

- **Read-only is entirely the brief's job** for every other role. Write it in, and check the diff
  against `baseline.sha` afterwards.
- **Independence is entirely the lead's job.** Spawn a **separate** `task` call for the prober, and
  never `write_agent` the builder a second brief asking it to verify itself.

## `fresh-context` is the default — and mandatory here anyway

The `task` tool already states that a teammate is stateless and that everything it needs must be in
the prompt, so the skill's brief discipline is enforced by the harness rather than merely advised.
That does **not** settle whether a teammate reads `AGENTS.md` or
`.github/copilot-instructions.md` on its way in — that is unverified (see the last section). Treat it
as if it does not: paste `houseRules` into every brief, and never rely on inherited project
conventions.

## Model

A `task` dispatch accepts `model`, `reasoning_effort` and `context_tier`, so a route *can* be set
per teammate. The rule still holds: **the human is the only one who specifies.** Pass a dispatch
route only when the human named it for that teammate in this run, and quote them in `inbox.log`; the
lead does not route on its own initiative. When nothing is specified, the runtime picks per
`agent_type` (the `explore` profile deliberately runs a fast lightweight model), so a teammate's
model may come from the profile rather than the human — that is still not the lead choosing. Record
what each member actually ran on in `members[].model` — audit, not routing.

## The lead is the verifier of record

With no `gate`, nothing in the harness rejects a teammate's result. A builder that says "tests pass"
is a claim with nothing behind it, and there is no host output to quote.

The substitute, and it is not optional:

1. The prober still runs, still re-runs the acceptance commands, and still reports raw output.
2. **The lead then runs the task's `verify` commands itself**, in its own session, before the batch
   lands. That output is the evidence of record.
3. Say so in the human report, in those words: which checks the lead ran, and that no check on this
   harness was harness-enforced.

Skipping step 2 because a prober said PASS is how a Copilot team ships an unverified batch. Nothing
on this harness will catch it.

## Gate

**None.** There is no `gate` parameter on `task`, so no host-run command can reject a teammate's
result. The substitute is the lead re-running `verify` before the batch lands, as above — not
optional, and it must be named in the human report.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| A teammate's final report is returned to the lead, not shown to the human. | The lead relays. This matches "one voice to the human" exactly — nothing leaks past you. |
| `write_agent` on a *running* teammate queues the message to the end of its current turn. | "Steer" here means: accept the run and correct after, or discard the result and re-brief a fresh `task`. There is no interrupt, so a wrong track costs the whole run. |
| No tool stops an agent. | A looping or drifting teammate runs to its own limit. Budget for it — smaller briefs, tighter territories — and check the diff against `baseline.sha` before anything lands. The human can stop it from the session UI; say so when the run is long or risky. |
| A `task` teammate is stateless and does not see this conversation. | Paste paths, decisions, red lines and `houseRules` into the brief. A brief that depends on inherited context cannot be re-run or audited later. |
| A background teammate outlives the turn that spawned it and notifies the lead when it settles; `read_agent` with `wait: true` collects the result (bounded per call, ~180 s). | Do not poll `read_agent` in a loop. Read the settlement notice, then the result. If a `wait` times out, the teammate is still running — stop there, do not re-read. |
| Teammates cannot address each other. | Hub-and-spoke; the lead is the only message bus and relays everything. |
| Whether a teammate may spawn its own helpers is not documented on the dispatch. | Charter nesting explicitly in the brief; assume a teammate does not recruit help unless you wrote it in. |
| `create_session` can give a genuinely separate worktree and branch (with `coordinateWithCreator` and `notifyOnIdle`); `create_chat` instead shares this session's workspace and aggregate diff. | This is the nearest thing to `isolate`, but a session is a peer with its own lifecycle, not a `task` teammate — and it does not aggregate into the same diff. Reach for it only when a writer truly needs its own tree, and say in the report that the team ran without dispatch-level isolation. |
| Only `explore`, `code-review` and `security-review` are read-only by construction; `general-purpose` and `task` are not. | Read-only is a brief-level promise for every builder and prober; verify it from the diff, not from the profile name. |
| The tool's own guidance says to default to `sync` and to treat `general-purpose`/`task` as side-effecting. | Parallelism is opt-in: pass `mode: "background"` explicitly on every teammate you want to overlap, or they run one after another and the ladder should drop a rung. |

## Verified / not verified

Read from the live tool schemas in a GitHub Copilot CLI session on 2026-10-05: the `task` parameters
(`agent_type`, `prompt`, `name`, `description`, `mode` = `sync`/`background`, `model`,
`reasoning_effort`, `context_tier`), the built-in `agent_type` list and its per-profile descriptions,
the stateless/fresh-context wording, the `list_agents` / `read_agent` / `write_agent` semantics
(including that a message to a running agent is queued to its next turn), and the **absence** of any
`gate` or `stop` parameter or tool, of a packaged `fan-out`, and of dispatch-level `isolate`.

Assumed, not verified: that a teammate does not read `AGENTS.md` or
`.github/copilot-instructions.md` on its way in; that a `task` teammate cannot spawn its own
helpers; that `write_agent` never reaches a teammate mid-turn; and that the settlement notification
is the reliable completion channel. The skill's discipline makes all four safe either way — but do
not claim in a report that a teammate had rules or limits it was never handed.

Not observed in a live run: no team has been dispatched on this harness.
