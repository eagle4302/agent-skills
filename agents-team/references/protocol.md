# Protocol: how a DSH team actually talks

The harness has hard edges. Design the team around them instead of discovering them
mid-run.

| Fact | Consequence for the team |
| --- | --- |
| `send_message` reaches **a direct continuable child** from its parent, and **a direct parent** from a resident continuable child. Siblings and deeper descendants are not targets. | Hub-and-spoke. The lead is the only message bus. Teammates cannot negotiate with each other; the lead relays. |
| `send_message` returns acceptance (a `messageId`) and **never a reply**. A delivered message has no result. | One-way traffic. A teammate answers in its own next turn, arrives as a settlement notice, or not at all. Never block waiting for an ack. |
| A working target receives the message at its nearest step boundary; an idle target starts a turn. | Steering works while they work; you do not have to stop them to redirect. |
| `interrupt_agent` stops only the current turn. Queued messages stay parked, descendants keep running, and the child stays available. | Interrupt is a brake, not a kill switch. After interrupting, decide explicitly whether to re-send the parked message. |
| A background child's settlement notice is the main report channel; its transcript is the detail. | Read the notice, then read the artifact. Do not ask for a summary you already have. |
| Delegation depth defaults to 3, and the team is depth 1 below the lead. | Keep nesting at ≤2 in practice: a teammate may spawn help only if the lead charters it in the brief, never on its own initiative. |
| The human can open any teammate from the session header (`/` count) and stop it independently. | You are not the only brake. Tell the human that this path exists when the work is long or risky. |

## Operating rules

1. **One message, one thing.** A steering message that carries three asks gets one of them.
2. **Brief self-contained.** Spawn children do not see this conversation. Anything they
   need — paths, decisions, red lines, prior evidence — goes in the brief.
3. **Log every exchange.** Append one line per brief, steer, block, report and verdict to
   `inbox.log`. That file is how a fresh session reconstructs the team.
4. **Answer three questions every loop.** Who is running, what am I waiting on, what is the
   next checkpoint. If you cannot answer, run `list_agents`.
5. **Status before action.** `list_agents` `children` for the team, `descendants` for the
   whole tree. `running` = working, `idle` = resident between turns, `ready` = storage only
   (resumable, not terminal) — a `ready` teammate is not a finished one.
6. **Escalate on a cap, not on a feeling.** A task gets 2 attempts; after that the lead
   either re-briefs a different teammate with the accumulated evidence or asks the human.
7. **Only the lead talks to the human.** A teammate with a question sends it up with
   `send_message`; the lead decides whether it is worth the human's attention. Record the
   human's answer in `inbox.log` and in the re-brief.
8. **Never let a teammate authorize a human gate.** Pushes, deploys, backend restarts,
   destructive filesystem or database operations, config-format changes, and anything the
   project marks "ask first" are the human's call, always. **No teammate ever commits** —
   committing is the lead's, under the one authorization the human gave at charter
   (`commitPolicy`), and only for a batch whose prober returned `pass`.
9. **Ask for the commit authorization once, at charter.** Which mode, and whether verified
   batches may land as they pass. Asking per batch turns a run into an interrogation; asking
   at the end is how a team ships 200 files in one commit.

## `inbox.log` line format

```
<ISO-8601 UTC> <from> -> <to> <kind> <one-line summary>
```

`kind` is one of two groups. Traffic between the lead and its teammates: `brief`, `steer`,
`block`, `report`, `verdict`, `human`, `commit`. The lead's own record of why it acted:
`note`, `finding`, `verified`, `decision`, `action`. A real run writes far more of the second
group than the first, and both belong in the file — a log of only the traffic cannot explain
a single decision. Common synonyms (`task`, `question`, `ruling`, `measured`, `request`,
`charter`, `ack`, `addendum`, `correction`, `reopen`, `status`) are normalised by
`team.mjs log`, and `validate` reads them the same way. Example:

```
2026-09-17T04:11:22Z lead -> lead commit baseline master@1b524c1, 1 path(s) already dirty
2026-09-17T04:11:30Z lead -> lead human commit authorization: per-territory, land on pass
2026-09-17T04:11:22Z lead -> builder-a brief implement slugify per acceptance 1-4
2026-09-17T04:26:03Z builder-a -> lead report done, 6/6 acceptance, evidence reports/t1-builder-a.md
2026-09-17T04:27:40Z lead -> prober-a brief independent re-run of t1 acceptance
2026-09-17T04:41:09Z lead -> lead commit batch builder-a landed a1b2c3d (t1,t6)
```

`commit` lines carry the baseline, each landed batch and its sha. A fresh session reads them
to learn what is already in git and what is still loose in the tree.

One line per event, written when the event happens. Backfilling a log afterwards can only
ever recover *that something happened* — the reasoning is gone. If you do reconstruct a gap,
mark every line `[重建]`, cite the file or field it came from, and leave the timestamp at the
time you wrote it; a reconstructed line dressed up as a contemporaneous one is worse than the
gap it fills.

## Escalation ladder

| Situation | Who acts | Action |
| --- | --- | --- |
| Teammate is stuck or blocked | teammate | `send_message` up with the blocker and what it needs |
| Teammate silent past a reasonable checkpoint | lead | `list_agents`, then one narrow `send_message` nudge |
| Teammate on the wrong track, still fixable | lead | `send_message` a corrected scope; do not interrupt yet |
| Teammate looping, thrashing, or writing outside territory | lead | `interrupt_agent`, then re-brief or take it inline |
| Verification failed on something in `baseline.knownFailures` | lead | not a failure: record it, leave `attempt` alone, and fix the prober's brief so the next one is told |
| Verification failed once | lead | re-brief the same builder with the exact failing evidence |
| Verification failed twice on the same task | lead | reassign, shrink the task, or escalate to the human with the evidence |
| A batch's prober passed | lead | land it now by pathspec, record `commitSha`; do not save it up for Close |
| A batch is blocked while the rest of the run moves on | lead | leave it uncommitted and say so in the report — never land an unverified batch to tidy the tree |
| Human gate, money, destructive action, decided-spec change | human | ask, then record the answer |
