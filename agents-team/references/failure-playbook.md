# Failure playbook

Match the symptom, take the action, log it in `inbox.log`. Each row is a concrete repair,
not a diagnosis exercise.

| Symptom | First move | Then |
| --- | --- | --- |
| Teammate returns nothing, or a one-line "done" with no evidence | `list_agents` to see `running`/`idle`/`ready` | `send_message` a narrow re-ask naming exactly the missing evidence; if it is `ready`, it stopped — re-brief or re-spawn |
| Settlement notice says the run failed or was interrupted | Read the notice's stop reason and its diagnostic | Re-brief with the failing reason folded in, or take the task inline if it is small |
| Output exists but misses acceptance | Re-brief the same teammate with the exact failing criterion, its raw output, and the required fix | `attempt += 1`; at 2, reassign to a different teammate or shrink the task |
| Two teammates touched the same file | Stop both, diff the file, pick one owner | The other teammate's brief changes to read-only; record the overlap as a lead error in `inbox.log` |
| Teammate wrote outside its territory | `interrupt_agent` | Inspect the diff, keep or revert per the lead's judgement, re-brief narrower, tighten the territory glob |
| Teammate loops, retries the same failing command, or keeps re-reading | `interrupt_agent` | Re-brief with a hard bound (files to touch, one command, one deliverable) or do it inline |
| `send_message` reports the message was not delivered (ghost id) | Confirm with `list_agents` | Re-spawn a fresh teammate from the last report, update `agentId` in `team.json` |
| Teammate asks the human something directly, or takes a human-gated action | Stop it, undo nothing without the human's say, report the breach | Re-brief with the gate list spelled out; nothing ships until the human confirms |
| Verification passes but the artifact does not match the request | Back to the charter: the acceptance criteria were wrong, not the code | Fix `team.json` acceptance, then re-verify; never patch acceptance to match what was built |
| Human interrupts, or the session restarts | Freeze the board, write `inbox.log` up to the interruption | Resume via `team-state.md` → "Resuming after a context loss" |
| A brief or ticket cites a line number, count, or limit the lead did **not** measure this session, and it later turns out wrong | Stop and measure first | The artifact has to be rewritten **and re-delivered** (a mirror/dispatch per revision). Rule: measure → write → dispatch **once**. Every number in a ticket carries the command and output that produced it |
| `HEAD` does not compile on its own, because a committed file depends on a change that is still uncommitted | `git worktree add --detach <dir> HEAD`, build there | The pending batch repairs it; before **every** commit, verify the commit point builds by itself — "the working tree builds" is not that check |
| The same class of defect is caught by a prober in two consecutive revisions (tautological assertions, stale direction/limit prose) | Do not just fix it again | Turn it into a **pattern the next verifier is told to search for**, and add a line to the acceptance criteria |
| A verifier returns "could not determine" for one item | Usually there is no pre-change snapshot to compare against | Before editing, save the pre-change output (a render snapshot) and hand it to the verifier with the brief |
| One brief carries two deliverables where one depends on the other | Split it | Otherwise revising the upstream artifact forces the downstream one to be redone |
| The lead is polling with sleeps while teammate runs are open | Do not wait as work | Settlement notices arrive on their own; do queued work, or end the turn |

## Standing anti-patterns

- **Verification theatre** — a prober that re-reads the builder's summary instead of running
  the commands. Its report must contain raw output, never conclusions only.
- **Drive-by fixing** — a prober or critic editing the code it is judging. That destroys the
  independent record; findings go to the builder, in writing.
- **Team inflation** — staffing 5 teammates for work with 2 territories. Cost has no
  acceptance criterion, but it is still a defect.
- **Board drift** — statuses updated in the chat but not in `team.json`. The next session
  reads the file.
- **Silent scope growth** — an implementation that "also cleaned up" a nearby file. Ask for
  the diff to stay inside `inScope`; anything else is a separate task.
- **Self-authorized gates** — commit, push, deploy, restart, format change, destructive op.
  None of these are ever a teammate's or the lead's decision.
- **Tautological acceptance** — an assertion whose expected value is computed by the same
  expression it is testing: two helpers that are the same `floor(...)` differing by ±1, a
  caller passing the very thing under test, `A ≡ B ± 1`. It reads green and proves nothing.
  **It grows back**: one was deleted and an instance reappeared two lines below its
  replacement. Verifiers must actively search this shape and list what they inspected —
  "I scanned it" is not a finding.
- **Unmeasured prose** — a direction, a limit, a multiplier, or "which value gets refused"
  written into a message or a comment, with no test that measures it. Editing the words is
  not editing the fact. Two of these in one run stated the exact opposite of the arithmetic
  (`lowering X shrinks the ceiling` when it doubles it).
- **Authoring from memory** — a brief or ticket citing numbers that were not measured in
  this session. It costs two full dispatches when it turns out wrong. Measure → write →
  dispatch, once.
- **Waiting as work** — the lead sleeping on a poll while teammate runs are open and queued
  work is sitting untouched. Settlement notices are delivered; use the gap, or end the turn.
- **A stale frozen artifact** — the lead edits an artifact after freezing its hash, then the
  verifier reports "artifact moved". Freeze, verify, and only then touch it; if you must
  touch it, say so in `inbox.log` and re-freeze before the verifier starts.
