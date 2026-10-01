# Adapter: OpenCode

One `subagent` tool for dispatch: `agent` + `description` + `prompt`. Status, steer and stop are
**not tools at all** — the same background service serves them as HTTP routes, and the lead reaches
them from its own `shell` as `opencode api …`. That split is the whole shape of a team on this
harness: dispatch is a tool call, management is a shell command.

**There is no host-run `gate`.** Read "The lead is the verifier of record" below before staffing —
it changes who owns step 5.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `subagent({ agent: "<id>", description: "<3-5 words>", prompt: "<brief>" })` — foreground, waits. `background: true` returns immediately and notifies the parent when the child settles |
| `identity` | the returned `sessionID` (`ses…`); store it in `members[].agentId` — it is also the id every verb below takes |
| `parallel-spawn` | several `subagent` calls in one assistant message. `execute` cannot do it: `subagent` is not in its catalog |
| `status` | `opencode api get /api/session/active` → `{"data":{"ses…":{"type":"running"}}}`; one teammate's transcript via `opencode api get /api/session/{sessionID}/message` |
| `steer` | `opencode api post /api/session/{sessionID}/prompt --data '{"text":"…","delivery":"steer"}'` — `steer` \| `queue` is a documented field of the prompt route |
| `stop` | `opencode api post /api/session/{sessionID}/interrupt` → `{"interrupted":true}`; the child settles as `cancelled` and the parent is notified |
| `gate` | **absent.** No `subagent` parameter runs a host command against a result |
| `raise` | **absent.** A child has no channel to the lead before it finishes, and `question` is denied to the builtin subagents |
| `fresh-context` | the default — subagents run in fresh child sessions. **Project instructions are still injected**: see the edges |
| `fan-out` | **absent.** No packaged lane runner, and `execute` holds no `subagent` tool to compose |
| `isolate` | **absent as a dispatch parameter.** Worktree routes and `opencode.session_move` exist, but nothing wires a teammate to its own tree at spawn |

`model` is accepted on the dispatch, but only when the human named a route for that teammate — see
"Model".

## Role dispatch

The usable builtins, read from `opencode api get /api/agent` on 2026-10-01:

| Role | `agent` | What the profile already does | Still only the brief |
| --- | --- | --- | --- |
| scout | `explore` | read-only **enforced by permissions**, not by the prompt: deny `*`, then allow `read`/`glob`/`grep`/`webfetch`/`websearch`. No `shell`, no `edit` | thoroughness, and that it locates code rather than judging it |
| builder | `general` | full tool access, multi-step | its territory; that it must not spawn help |
| prober | `general`, a **second** child | nothing role-specific | independence, the acceptance list, the evidence format, "edit nothing" |
| critic | `general`, a second child | nothing role-specific | the two axes, the verdict vocabulary, "edit nothing" |
| scribe | `general` | nothing role-specific | doc conventions |

`build` and `plan` are `mode: primary`, so `subagent` cannot launch them, and V2 ships **no builtin
`scout`** — `explore` is the one to reach for. A prober here cannot be given a read-only posture by
the builtins: re-running `verify` needs `shell`, and no builtin grants `shell` without `edit`. The
one addition worth proposing to the human is a project or global agent definition
(`.opencode/agents/<name>.md`, `~/.config/opencode/agents/<name>.md`) that denies `edit` and allows
`shell` — on this harness that is the only way to make a prober's read-only-ness a permission
instead of a promise. Do not create it silently.

## The lead is the verifier of record

With no `gate`, nothing in the harness rejects a teammate's result. A builder that says "tests pass"
is a claim with nothing behind it, and there is no host output to quote.

The substitute, and it is not optional:

1. The prober still runs, still re-runs the acceptance commands, and still reports raw output.
2. **The lead then runs the task's `verify` commands itself**, in its own `shell`, before the batch
   lands. That output is the evidence of record.
3. Say so in the human report, in those words: which checks the lead ran, and that no check on this
   harness was harness-enforced.

`opencode api` being available does not change this. It is a way to reach a *teammate*, not a way to
gate one: it can stop a run and read a transcript, but it cannot judge a diff.

## Model

A subagent runs on its configured model, or inherits the parent session's when none is configured.
The human's channel is a `model: "provider/model#variant"` on the dispatch, or a `model:` already
pinned in the agent definition; the lead does not route on its own initiative. Record what each
member actually ran on — and where the route came from — in `members[].model`: `inherited`, or the
specified `provider/model`.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| Subagents run with fresh context, but the project's instructions, skills and references are **added** to the child. Verified live: an `explore` child quoted this repo's `AGENTS.md` verbatim without reading a file. | Paste `houseRules` anyway — that is what makes a brief auditable. But do not claim in a report that the teammate was blind to the project's rules, and expect a repo `AGENTS.md` to reach it. |
| A teammate's final report arrives as the spawn's result; the human does not see it. | The lead relays. That is the "one voice to the human" rule, satisfied by construction rather than by discipline. |
| A foreground `subagent` call blocks the lead's turn. | A lead that intends to `status`, `steer` or `stop` must have launched `background: true` — otherwise it has no turn in which to run the verb. This is the one edge that changes how the loop is run, so decide it at staffing, not at step 5. |
| `status`, `steer` and `stop` are HTTP routes reached through `shell`, not tools with a permission of their own. | Every management action is a shell command the lead chooses to run, and it appears in the transcript as one. Keep `members[].agentId` as the only copy of each child's `sessionID` — the board has to carry it across a compaction. |
| `interrupt` stops execution and the child stays addressable by `sessionID`; the route takes `resume`, and the prompt route takes `resume: true`. | After a stop, decide explicitly whether to re-brief a fresh child or resume the same one, and say which in `inbox.log`. |
| Nesting depth is one, and the builtin subagents deny `subagent`. | The team is flat by construction. A teammate cannot spawn help, so anything below the first layer is the lead's own work. |
| Children cannot address each other, and `question` is denied to them. | Hub-and-spoke; a teammate cannot reach the human even by accident. |
| Reading `*.env` and paths outside the session's Location is `ask` for the builtins. | A teammate that wanders outside the workspace can sit waiting on a prompt in the human's TUI while the lead waits on the child. Keep every territory inside the pre-approved roots and say so in the brief. |
| `steps` on a custom agent definition bounds a run. | With `stop` living outside the tool catalog, a `steps` cap is the only self-terminating brake. Worth proposing for a builder on a long run; not worth setting silently. |

## Verified / not verified

Verified in a live OpenCode session on 2026-10-01: the `subagent` parameters, foreground and
background behaviour, and the returned `sessionID`; the completion and cancellation notices;
`opencode api get /api/session/active` listing a running child; `opencode api post
/api/session/{sessionID}/interrupt` returning `{"interrupted":true}` and settling the child as
`cancelled`; the request body of the prompt route reaching the route intact (`--data` with a
single-quoted JSON body from PowerShell resolved to a 404 session lookup, not a parse error); the
builtin agent list with its modes and permission sets; and that a child receives this project's
`AGENTS.md`.

Read from the V2 documentation, not exercised: `delivery: "steer"` and `resume` on the prompt route,
`POST /api/worktree`, the nesting-depth-one default, and `steps`.

Assumed, not verified: that several foreground `subagent` calls in one message genuinely overlap;
that a permission `ask` raised inside a child surfaces to the human rather than parking the team.

Not observed in a live run: no full team has been dispatched on this harness.
