# Protocol: how a team talks, on any harness

This file names **capabilities**, never tool names. The call for each one is in your
harness's file under `adapters/` — read exactly one of those at step 0, before staffing.
A capability your harness does not have is not a dead end; it is a row in the degradation
table below, and the team runs at the level that row prescribes.

## The capability contract

| Capability | What the team needs it for |
| --- | --- |
| `spawn` | start a teammate from a self-contained brief |
| `identity` | get back something that names that teammate afterwards |
| `parallel-spawn` | start several in one turn so they genuinely run at once |
| `status` | ask who is running and what they have done so far |
| `steer` | redirect a teammate that is still running |
| `stop` | end a run that is looping or writing outside its territory |
| `gate` | a **host-run** command whose failure rejects the teammate's result |
| `raise` | the teammate reports a blocker before it finishes |
| `fresh-context` | the teammate does **not** inherit the lead's conversation |
| `fan-out` | many short-lived lanes in one call, one composite result |
| `isolate` | a writing teammate gets its own worktree |

## Degradation: what to do when a capability is absent

Name the missing capability and its substitute **in the human report**. A team that quietly
runs degraded is worse than one that says which leg it is standing on.

| Missing | What it costs | What you do instead |
| --- | --- | --- |
| `gate` | Nothing in the harness rejects a teammate's result. A builder's "tests pass" has no host output behind it. | **The lead becomes the verifier of record**: the prober still re-runs acceptance and reports raw output, and then the lead runs the task's `verify` commands itself before the batch lands. Report that no check was harness-enforced. |
| `parallel-spawn` | Half the reason to staff more than one teammate is gone; two builders now cost two wall-clocks, not one. | Run them sequentially and **push the sizing ladder down one rung**. Two disjoint territories that cannot run at once are often one task for the lead. |
| `identity` | Every teammate is single-shot. No steer, no stop, no resume, no re-brief. | `board.md` and `reports/` are the only continuity. Shrink every brief so one wasted run is cheap, and expect to redo rather than redirect. |
| `steer` | A teammate on the wrong track cannot be corrected in place. | `stop` and re-brief a fresh teammate with the accumulated evidence. Without `stop` either, let it finish and discard the result — then check the diff against `baseline.sha` before anything lands. |
| `stop` | A looping teammate runs to its own limit. | Let it settle, discard its work, and verify with a diff that it wrote nothing outside its territory. Budget for it: smaller briefs, tighter territories. |
| `raise` | A blocked teammate says nothing until it finishes; you learn about the blocker after paying for the whole run. | Keep briefs small and make the failure mode explicit: "if you cannot do X, stop and report what blocked you." An oversized brief costs far more on this harness. |
| `fresh-context` | A teammate inherits the lead's conversation: real tokens each, and a critic gets handed the framing it was staffed to challenge. | Still write a self-contained brief — that discipline is what makes the board readable later. State the prober's and critic's independence in the brief, and verify it by reading what they actually did. |
| `fan-out` | A homogeneous stage has no cheap composite form. | Run the lanes as ordinary parallel teammates with one shared brief shape, and synthesise yourself. Do not build a workflow the harness does not offer. |
| `isolate` | Two writing teammates share one tree. | Disjoint territories stop being a convention and start being the only protection. Check `git status --short` between batches, not just at the end. |

## Operating rules

1. **One message, one thing.** A steer carrying three asks gets one of them done.
2. **Brief self-contained.** Assume the teammate sees nothing of this conversation and does not
   read `CLAUDE.md` or `AGENTS.md` on its way in. Paths, decisions, red lines, prior evidence,
   `houseRules` — all of it goes in the brief. This holds even where `fresh-context` is absent:
   a brief that depends on inherited context cannot be re-run or audited later.
3. **Know your context default, and say it out loud.** "Fresh" is not universal and on some
   harnesses is not even the default for the profiles a team uses most. Check your adapter, pass
   the context mode explicitly where the harness accepts one, and record a deliberate inheritance
   in `members[].model`.
4. **Log every exchange.** One `inbox.log` line per brief, steer, block, report, verdict and
   commit. That file is how a fresh session reconstructs the team.
5. **Answer three questions every loop.** Who is running, what am I waiting on, what is the next
   checkpoint. If you cannot, use `status`.
6. **Status before action.** A settled teammate is not necessarily a successful one — read the
   result, not the fact that it finished.
7. **Escalate on a cap, not on a feeling.** A task gets 2 attempts; after that the lead either
   re-briefs a different teammate with the accumulated evidence, or asks the human.
8. **Only the lead talks to the human.** A teammate with a question raises it to you; you decide
   whether it is worth the human's attention, and record the answer in `inbox.log` and in the
   re-brief.
9. **Never let a teammate authorize a human gate.** Pushes, deploys, backend restarts,
   destructive filesystem or database operations, config-format changes, and anything the
   project marks "ask first" are the human's call, always. **No teammate ever commits** —
   committing is the lead's, under the one authorization the human gave at charter
   (`commitPolicy`), and only for a batch whose prober returned `pass`.
10. **Ask for the commit authorization once, at charter.** Which mode, and whether verified
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
2026-09-17T04:11:24Z lead -> lead note harness: pi · gate present · verifier of record: harness
2026-09-17T04:11:30Z lead -> lead human commit authorization: per-territory, land on pass
2026-09-17T04:11:22Z lead -> builder-a brief implement slugify per acceptance 1-4
2026-09-17T04:26:03Z builder-a -> lead report done, 6/6 acceptance, evidence reports/t1-builder-a.md
2026-09-17T04:27:40Z lead -> prober-a brief independent re-run of t1 acceptance
2026-09-17T04:41:09Z lead -> lead commit batch builder-a landed a1b2c3d (t1,t6)
```

Write the harness line at charter, as above. A fresh session reading this log needs to know
which capabilities the run had before it can judge any verdict in it.

`commit` lines carry the baseline, each landed batch and its sha. A fresh session reads them to
learn what is already in git and what is still loose in the tree.

Record each teammate's **id** as its `agentId` in `team.json`. That id is what `status`, `steer`
and `stop` take, and it is the only way back to a teammate after a context loss.

One line per event, written when the event happens. Backfilling a log afterwards can only ever
recover *that something happened* — the reasoning is gone. If you do reconstruct a gap, mark
every line `[重建]`, cite the file or field it came from, and leave the timestamp at the time you
wrote it; a reconstructed line dressed up as a contemporaneous one is worse than the gap it fills.

## Escalation ladder

| Situation | Who acts | Action |
| --- | --- | --- |
| Teammate is stuck or blocked | teammate | `raise` the blocker and what it needs; where `raise` is absent, it reports and stops |
| Teammate silent past a reasonable checkpoint | lead | `status` on its id, then one narrow `steer` |
| Teammate on the wrong track, still fixable | lead | `steer`; do not `stop` it yet |
| Teammate looping, thrashing, or writing outside territory | lead | `stop`, then re-brief or take it inline |
| A gate failed | lead | read the gate's output first: the run was rejected by the host, not by a model's opinion |
| No gate on this harness | lead | run the task's `verify` yourself before the batch lands, and say so in the report |
| Verification failed on something in `baseline.knownFailures` | lead | not a failure: record it, leave `attempt` alone, and fix the prober's brief so the next one is told |
| Verification failed once | lead | re-brief the same builder with the exact failing evidence |
| Verification failed twice on the same task | lead | reassign, shrink the task, or escalate to the human with the evidence |
| A batch's prober passed | lead | land it now by pathspec, record `commitSha`; do not save it up for Close |
| A batch is blocked while the rest moves on | lead | leave it uncommitted and say so in the report — never land an unverified batch to tidy the tree |
| Human gate, money, destructive action, decided-spec change | human | ask, then record the answer |
