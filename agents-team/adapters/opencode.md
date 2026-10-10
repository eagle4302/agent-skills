# Adapter: OpenCode

One `subagent` tool for dispatch: `agent` + `description` + `prompt`. Status, steer and stop are
**not tools at all** — the same background service serves them as HTTP routes, and the lead reaches
them from its own `shell` as `opencode api …` (the **V2** CLI — see below). That split is the whole
shape of a team on this harness: dispatch is a tool call, management is a shell command.

**`opencode api` is the V2 CLI — a V1 `opencode` does not have it.** Two CLI lines can coexist on one
machine: the published V1 (npm `opencode`, 1.18.x) has **no `api` subcommand** — it prints its
top-level help and exits 1 — while the V2 CLI (`opencode-cli`, or the `opencode` that ships with the
desktop app) does. Call the V2 binary explicitly, or put it ahead of V1 on `PATH`. Confirm before
staffing: `opencode api get /api/session/active` must return `{"data":{…}}`; a V1 `opencode` on
`PATH` silently turns every `status`/`steer`/`stop` row below into a help printout. On Windows
PowerShell 5.1 a `--data` body is mangled before it reaches the CLI (HTTP 400, "Expected a valid
JSON body") — see "Management verbs, live" for the quoting that works. The GET rows carry no body
and are unaffected.

**There is no host-run `gate`.** Read "Gate" below before staffing —
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
| scout | `explore` | read-only **when its permission list wins**: the builtin denies `*` then allows `read`/`glob`/`grep`/`webfetch`/`websearch` — no `shell`, no `edit`. **Verify it per machine** (see below); a global `"permission": "allow"` can re-allow everything | thoroughness, and that it locates code rather than judging it |
| builder | `general` | full tool access, multi-step | its territory; that it must not spawn help |
| prober | `prober` — a custom subagent this skill installs at `~/.config/opencode/agents/prober.md` | `edit`/`write`/`patch` and `subagent` are **denied** by permission; `shell` is allowed so it can re-run `verify` | independence, the acceptance list, the evidence format |
| critic | `general`, a second child | nothing role-specific | the two axes, the verdict vocabulary, "edit nothing" |
| scribe | `general` | nothing role-specific | doc conventions |

`build` and `plan` are `mode: primary`, so `subagent` cannot launch them, and V2 ships **no builtin
`scout`** — `explore` is the one to reach for. **Do not assume `explore` is read-only on a given
machine:** read its effective rules (`opencode api get /api/agent`, or `opencode debug agent explore`)
and confirm the list still ends in `deny *`. A global `"permission": "allow"` in the user's config is
serialized *after* the builtin rules, so `explore` can come back with `bash` — and possibly
`edit`/`write` — re-allowed. The prober's read-only posture **is** enforced: this skill ships a custom subagent at
`~/.config/opencode/agents/prober.md` whose permission list ends in `edit`/`write`/`patch` and
`subagent` denied, leaving `shell` allowed so it can re-run `verify`. No builtin can do this —
re-running `verify` needs `shell`, and no builtin grants `shell` without `edit` — so the agent
definition is the only way here to turn read-only-ness into a permission instead of a promise. A
project or global `.opencode/agents/<name>.md` is where a read-only *scout* would go if the human
also wants `explore`'s posture enforced. Do not create further agents silently.

## Gate

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
single-quoted JSON body from PowerShell resolved to a 404 session lookup, not a parse error — but
see the PowerShell 5.1 quoting trap under "Management verbs, live", which contradicts this on 5.1); the
builtin agent list with its modes and permission sets; and that a child receives this project's
`AGENTS.md`.

Read from the V2 documentation, not exercised: `delivery: "steer"` and `resume` on the prompt route,
`POST /api/worktree`, the nesting-depth-one default, and `steps`.

Assumed, not verified: that several foreground `subagent` calls in one message genuinely overlap;
that a permission `ask` raised inside a child surfaces to the human rather than parking the team.

Still not observed: `fan-out`, `isolate`, a human-gate breach, a context loss and resume, and a
human-named model route. **A full light team has now been dispatched on this harness — see below.**

### Management verbs, live (2026-10-05)

Re-checked on Windows with the desktop V2 CLI (`opencode-cli` 2.0.22); the npm `opencode` on `PATH`
was V1 **1.18.31** and answered `opencode api …` with its top-level help and exit 1 — the V1 trap
above is real, not hypothetical.

- **`status`** — `opencode api get /api/session/active` returned
  `{"data":{"ses…":{"type":"running"},"ses…":{"type":"running"}}}`, the background child among them;
  its transcript came back from `opencode api get /api/session/{sessionID}/message`.
- **`steer`** — `opencode api post /api/session/{sessionID}/prompt` with
  `{"text":"…","delivery":"steer"}` returned a user message whose payload carried the text and
  `"delivery":"steer"`. The child, mid-loop at `PING 9`, left the loop, ran the steered command
  (`STEERED-ACK`), and settled. The steer landed at the child's next tool boundary.
- **`stop`** — `opencode api post /api/session/{sessionID}/interrupt` returned
  `{"interrupted":true}`; the id then disappeared from `/api/session/active`, the transcript gained
  `{"type":"idle","outcome":"interrupted"}`, and the parent was notified the child `cancelled`.

**Quoting trap, found here:** on Windows PowerShell **5.1** the `--data` JSON does **not** survive
normal argument passing — the route answers `HTTP 400 {"_tag":"InvalidRequestError","message":
"Expected a valid JSON body"}`. The earlier "resolved to a 404 session lookup, not a parse error"
note does not hold on PS 5.1. Build the command line and hand it to `Start-Process -ArgumentList`
with the JSON's inner `"` escaped as `\"`, or run `opencode api` from pwsh 7 or bash. The GET rows
carry no body and are unaffected.

The builtin agent list from `opencode api get /api/agent` shows `explore` (subagent) with its
`deny *` block re-tailed by a global `{"action":"*","resource":"*","effect":"allow"}`, so on a
machine whose config sets `"permission": "allow"` its read-only posture is **not** guaranteed;
verify before relying on it.

### First light team, live (2026-10-05)

A light team ran end to end in a scratch git sandbox: two disjoint builders (`src/greet.mjs`,
`src/sum.mjs`) spawned as **two `subagent` calls in one message**, one independent prober, the lead
writing the shared `test.mjs` and re-running every `verify` itself (no gate).

| Check | Result |
| --- | --- |
| `parallel-spawn` | two `subagent` calls in one message; both settled, each with its own `sessionID` |
| `identity` | the ids were recorded in `members[].agentId` and every verb took them |
| `fresh-context` | children carried the brief but not the lead's conversation |
| `team.mjs` | `init` → `baseline` (recorded `master@7e118cb` + 2 already-dirty paths) → `validate` → `status` → `batch`, plain Node |
| lead as verifier | the prober reported t1/t2/t3 PASS and a tampered copy exiting `1`; the **lead** re-ran all three (`exit 0`) as the evidence of record |
| batches | three `commitGroup`s landed as three separate by-pathspec commits (`107b463`, `3f30311`, `b081170`); `human-wip.txt` (a `baseline.dirtyPaths` entry) was never swept in |
| close | archived to `.agent-teams/archive/`; `validate` **0 errors, 0 warnings**; every batch `committed` |
| model | every child ran `deepseek/deepseek-flash#high`, inherited; no route was specified |

The prober's tamper pass and the lead's own re-run agreeing is exactly the "one pass per layer" the
skill asks for; with no `gate`, the lead's output is the load-bearing one.

### PATH and prober re-check, live (2026-10-10)

- **PATH** — `where opencode` resolves to a single binary and `opencode --version` reports
  **v2.0.21**; there is no V1 `opencode` shadowing it and no separate `opencode-cli`, so the V1 trap
  above does not bite on this machine. `opencode api get /api/session/active` returned three running
  sessions. The trap stays documented because it is machine-specific, not skill-wide.
- **prober read-only, enforced** — `~/.config/opencode/agents/prober.md` (mode `subagent`) is picked
  up live with no service restart: `opencode api get /api/agent` shows its permission list ending in
  `subagent` deny then `edit` deny. A dispatched `prober` child ran `echo PROBE_SHELL_OK` (exit 0,
  stdout verbatim) and reached no write path at all — the `edit`/`write`/`patch` tools were absent
  from its catalog, so `probe-write-test.txt` was never created. First time on this harness that a
  prober's read-only-ness is a permission rather than a promise.

### Full light team with the enforced prober, live (2026-10-10)

A second light team ran end to end on a scratch repo (`textkit-e2e`): the lead wrote
`manifest.json` + two known-answer suites, two builders on disjoint territories
(`src/slugify.mjs`, `src/truncate.mjs`) spawned as two `subagent` calls in one message, one
independent **`prober`** child, **standard** mode, commits authorized at charter.

| Check | Result |
| --- | --- |
| prober role | dispatched with `agent: "prober"`; it re-ran both suites (9/9, 9/9), added 14 hostile cases (14/14), and ran a two-module **mutation pass** (each mutation → exit 1); the read-only posture held — it left the repo byte-for-byte unchanged |
| `parallel-spawn` / `identity` | builders spawned together; both `ses…` ids recorded in `members[].agentId` |
| no gate → lead verifier | the lead re-ran `node acceptance/*.test.mjs` itself (9/9, 9/9, exit 0) as the evidence of record before each batch landed |
| batches | three `commitGroup`s landed as three by-pathspec commits (`8376990`, `00b012b`, `ed75ee3`); `human-wip.txt` (a `baseline.dirtyPaths` entry) was never swept in |
| close | archived to `.agent-teams/archive/`; `validate` **0 errors, 0 warnings**; every batch `committed` |

The prober's independence is now enforced by the harness, not asked for in a brief — the reason
this run exists.
