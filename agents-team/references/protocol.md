# Protocol: how a pi team actually talks

Everything here is `pi-subagents`. The harness has hard edges; design the team around them
instead of discovering them mid-run. When a detail below disagrees with the extension, the
extension wins — read it with `subagent({ action: "guide", topic: "tool-reference" })`.

## One tool, many actions

There is a single `subagent` tool. Dispatch takes `agent` + `task`; everything else is an
`action`.

| What you want | Call |
| --- | --- |
| Start a teammate | `subagent({ agent: "worker", task: "<brief>" })` — background by default |
| Block on one | add `async: false` (it runs inside the parent process) |
| Carry this conversation in | add `context: "fork"`; default is `fresh` |
| See the whole team | `subagent({ action: "status" })`, or `view: "fleet"` |
| Read one child's tail | `subagent({ action: "status", id: "<runId>", view: "transcript" })` |
| Steer a running child | `subagent({ action: "steer", id: "<runId>", mode: "steer" })` |
| Stop one | `subagent({ action: "stop", id: "<runId>" })` |
| List finished, resumable children | `subagent({ action: "children.list" })` |
| Isolate a builder's tree | `isolation: "worktree"` (needs git) |
| Read the extension's own docs | `subagent({ action: "guide", topic: "<topic>" })` |

The edges that shape how a team is run:

| Fact | Consequence for the team |
| --- | --- |
| A steer lands at the child's **next tool boundary**, never inside a tool call. | Steering works while they work, but a child deep in one long command will not hear you for a while. |
| Steering has modes: `steer`, `follow_up`, `auto`, `plan`, `apply`. | Pick one deliberately. `steer` redirects the current run; `follow_up` queues work after it. |
| The steer's receipt (requested, routed, delivered) shows up in run status and events. | You can prove a teammate was told. Quote the receipt, not your intention. |
| Async runs **notify the parent natively** when they settle. | Do not poll. Do not wrap an ordinary async child in `bg_wait`. |
| A child talks back with `contact_supervisor` / `intercom`. | Teammates can raise a blocker without finishing. They still cannot reach the human. |
| Children cannot address each other. | Hub-and-spoke. The lead is the only message bus; the lead relays. |
| `stop` ends the run. Completed children stay addressable through `children.list` and may be `resume`-able. | Check `resumable` before planning to resume; if no row is resumable, start a same-role fallback and label it as fallback. |
| There is a spawn budget, visible in `action: "status"` and `action: "doctor"`. | Team size is enforced, not just advised. Check it before staffing a wide fan-out. |
| A foreground child never loads the parent's ambient extensions; an agent needing MCP tools must run in the background. | If a teammate needs `codegraph` or web access, it is a background child. |
| The human can open FleetView (`/subagents-fleet`) and steer or stop anything themselves. | You are not the only brake. Say so when a run is long or risky. |

## Acceptance gates: use the harness, not a promise

`pi-subagents` can enforce verification instead of asking a teammate nicely:

```
subagent({ agent: "worker", task: "<brief>",
           gate: "dotnet test Foo.Tests/Foo.Tests.csproj -c Release" })
```

The gate is a **host-run** command. The child's result is not accepted unless it passes.
The object form `{ command, output: "json", schema }` turns passing stdout into the child's
`structuredOutput`, and `acceptance: { level: "verified", verify: [...] }` takes several.

This does not replace the prober. A gate proves the command passed; it does not prove the
command tested the right thing, and it cannot read a diff for scope creep. Use both: the gate
for the mechanical check, a separate `reviewer`/`evidence-auditor` child for the judgement.
Put every task's `verify` command into its `gate` where one exists — a `verify` that never ran
is the commonest way a board lies.

## Operating rules

1. **One message, one thing.** A steer carrying three asks gets one of them done.
2. **Brief self-contained.** A `fresh` child sees nothing of this conversation, and it does not
   read `AGENTS.md` on its way in. Paths, decisions, red lines, prior evidence, `houseRules` —
   all of it goes in the brief.
3. **Log every exchange.** One `inbox.log` line per brief, steer, block, report, verdict and
   commit. That file is how a fresh session reconstructs the team.
4. **Answer three questions every loop.** Who is running, what am I waiting on, what is the next
   checkpoint. If you cannot, run `subagent({ action: "status" })`.
5. **Status before action.** `status` for the fleet, `status` + `id` for one run, `children.list`
   for finished children. A settled child is not necessarily a successful one — read the result.
6. **Escalate on a cap, not on a feeling.** A task gets 2 attempts; after that the lead either
   re-briefs a different teammate with the accumulated evidence, or asks the human.
7. **Only the lead talks to the human.** A teammate with a question uses `contact_supervisor`;
   the lead decides whether it is worth the human's attention, and records the answer in
   `inbox.log` and in the re-brief.
8. **Never let a teammate authorize a human gate.** Pushes, deploys, backend restarts,
   destructive filesystem or database operations, config-format changes, and anything the
   project marks "ask first" are the human's call, always. **No teammate ever commits** —
   committing is the lead's, under the one authorization the human gave at charter
   (`commitPolicy`), and only for a batch whose prober returned `pass`.
9. **Ask for the commit authorization once, at charter.** Which mode, and whether verified
   batches may land as they pass. Asking per batch turns a run into an interrogation; asking at
   the end is how a team ships 200 files in one commit.

## `inbox.log` line format

```
<ISO-8601 UTC> <from> -> <to> <kind> <one-line summary>
```

`kind` is one of two groups. Traffic between the lead and its teammates: `brief`, `steer`,
`block`, `report`, `verdict`, `human`, `commit`. The lead's own record of why it acted: `note`,
`finding`, `verified`, `decision`, `action`. A real run writes far more of the second group than
the first, and both belong in the file — a log of only the traffic cannot explain a single
decision. Common synonyms (`task`, `question`, `ruling`, `measured`, `request`, `charter`, `ack`,
`addendum`, `correction`, `reopen`, `status`) are normalised by `team.mjs log`, and `validate`
reads them the same way. Example:

```
2026-09-17T04:11:22Z lead -> lead commit baseline master@1b524c1, 1 path(s) already dirty
2026-09-17T04:11:30Z lead -> lead human commit authorization: per-territory, land on pass
2026-09-17T04:11:22Z lead -> builder-a brief implement slugify per acceptance 1-4
2026-09-17T04:26:03Z builder-a -> lead report done, 6/6 acceptance, evidence reports/t1-builder-a.md
2026-09-17T04:27:40Z lead -> prober-a brief independent re-run of t1 acceptance
2026-09-17T04:41:09Z lead -> lead commit batch builder-a landed a1b2c3d (t1,t6)
```

`commit` lines carry the baseline, each landed batch and its sha. A fresh session reads them to
learn what is already in git and what is still loose in the tree.

Record each teammate's **run id** as its `agentId` in `team.json`. That id is what `status`,
`steer` and `stop` take, and it is the only way back to a teammate after a context loss.

One line per event, written when the event happens. Backfilling a log afterwards can only ever
recover *that something happened* — the reasoning is gone. If you do reconstruct a gap, mark
every line `[重建]`, cite the file or field it came from, and leave the timestamp at the time you
wrote it; a reconstructed line dressed up as a contemporaneous one is worse than the gap it fills.

## Escalation ladder

| Situation | Who acts | Action |
| --- | --- | --- |
| Teammate is stuck or blocked | teammate | `contact_supervisor` with the blocker and what it needs |
| Teammate silent past a reasonable checkpoint | lead | `action: "status"` with its id, then one narrow steer |
| Teammate on the wrong track, still fixable | lead | `action: "steer"`, `mode: "steer"`; do not stop it yet |
| Teammate looping, thrashing, or writing outside territory | lead | `action: "stop"`, then re-brief or take it inline |
| A gate failed | lead | read the gate's output first: the run was rejected by the host, not by a model's opinion |
| Verification failed on something in `baseline.knownFailures` | lead | not a failure: record it, leave `attempt` alone, and fix the prober's brief so the next one is told |
| Verification failed once | lead | re-brief the same builder with the exact failing evidence |
| Verification failed twice on the same task | lead | reassign, shrink the task, or escalate to the human with the evidence |
| A batch's prober passed | lead | land it now by pathspec, record `commitSha`; do not save it up for Close |
| A batch is blocked while the rest moves on | lead | leave it uncommitted and say so in the report — never land an unverified batch to tidy the tree |
| Human gate, money, destructive action, decided-spec change | human | ask, then record the answer |
