# Failure playbook

Match the symptom, take the action, log it in `inbox.log`. Each row is a concrete repair,
not a diagnosis exercise.

| Symptom | First move | Then |
| --- | --- | --- |
| Teammate returns nothing, or a one-line "done" with no evidence | `status` on its id, and read its transcript if the harness offers one | Steer a narrow re-ask naming exactly the missing evidence; if the run already settled, re-brief a fresh teammate, or resume that one where the harness says it is resumable |
| Settlement notice says the run failed or was interrupted | Read the notice's stop reason and its diagnostic | Re-brief with the failing reason folded in, or take the task inline if it is small |
| Prober reports a failure that is in `baseline.knownFailures` | Compare its raw output against the recorded symptom | Not the team's failure: leave `attempt` alone, note it in the verdict, and add the block to the next prober's brief |
| Prober reports a failure and nobody knows whether it predates the team | Re-run that one command against `baseline.sha` in a scratch worktree | Pre-existing → add it to `knownFailures` and set `verifiedClean`; new → treat as a real FAIL |
| Teammate broke a project convention nobody told it (build flags, line endings, formatting) | Lead bug, not a teammate bug — `houseRules` was empty or not pasted into the brief | Fix `houseRules`, re-brief with it, and fix the files before the batch lands |
| Output exists but misses acceptance | Re-brief the same teammate with the exact failing criterion, its raw output, and the required fix | `attempt += 1`; at 2, reassign to a different teammate or shrink the task |
| Two teammates touched the same file | Stop both, diff the file, pick one owner | The other teammate's brief changes to read-only; record the overlap as a lead error in `inbox.log` |
| Teammate wrote outside its territory | `stop` | Inspect the diff against `baseline.sha`, keep or revert per the lead's judgement, re-brief narrower, tighten the territory glob |
| Teammate loops, retries the same failing command, or keeps re-reading | `stop` | Re-brief with a hard bound (files to touch, one command, one deliverable), or do it inline. Do **not** reach for a tool-call budget on a builder: on at least one harness those block *read* tools by default, which removes a thrashing teammate's ability to look things up and leaves its ability to write. Check your adapter; reserve budgets for read-only roles |
| A steer never lands | Check the steer receipt in `status`, where the harness gives one — a steer usually arrives only at a tool boundary | If the teammate is inside one long command, wait or stop it; do not send the same steer three times. Where `steer` is absent entirely, stop and re-brief instead |
| A `gate` failed | Read the gate's own output: the host rejected the run, not a model | Fix the code or fix the gate command — never drop the gate to make a run pass |
| The harness has no `gate` at all | Not a failure — a standing condition. Check your adapter at step 0, not at step 5 | The lead runs every task's `verify` itself before the batch lands, and the human report says no check was harness-enforced |
| Teammate asks the human something directly, or takes a human-gated action | Stop it, undo nothing without the human's say, report the breach | Re-brief with the gate list spelled out; nothing ships until the human confirms |
| Verification passes but the artifact does not match the request | Back to the charter: the acceptance criteria were wrong, not the code | Fix `team.json` acceptance, then re-verify; never patch acceptance to match what was built |
| A batch is ready but one task in it never got a prober | Do not land it — `team.mjs batch` says `blocked`, believe it | Dispatch the prober, or move that task into its own group and land the rest |
| A landed batch turns out wrong | `git revert <commitSha>`, never `reset --hard`: other batches are in the same branch | Clear `commitSha`, reopen the task, `attempt += 1`, log it as `commit` |
| A batch swept in files nobody on the team touched | Compare against `baseline.dirtyPaths` — that was the human's own work | `git revert`, re-add by pathspec only, and say so in the report |
| Teammate ran `git commit` itself | Stop it, `git log` the sha, report the breach — do not quietly keep it | Re-brief with "you never commit"; the lead decides whether to revert or adopt the commit |
| Human interrupts, or the session restarts | Freeze the board, write `inbox.log` up to the interruption | Resume via `team-state.md` → "Resuming after a context loss" |
| A brief or ticket cites a line number, count, or limit the lead did **not** measure this session, and it later turns out wrong | Stop and measure first | The artifact has to be rewritten **and re-delivered** (a mirror/dispatch per revision). Rule: measure → write → dispatch **once**. Every number in a ticket carries the command and output that produced it |
| `HEAD` does not compile on its own, because a committed file depends on a change that is still uncommitted | `git worktree add --detach <dir> HEAD`, build there | The pending batch repairs it; before **every** commit, verify the commit point builds by itself — "the working tree builds" is not that check |
| The same class of defect is caught by a prober in two consecutive revisions (tautological assertions, stale direction/limit prose) | Do not just fix it again | Turn it into a **pattern the next verifier is told to search for**, and add a line to the acceptance criteria |
| A verifier returns "could not determine" for one item | Usually there is no pre-change snapshot to compare against | Before editing, save the pre-change output (a render snapshot) and hand it to the verifier with the brief |
| One brief carries two deliverables where one depends on the other | Split it | Otherwise revising the upstream artifact forces the downstream one to be redone |
| The lead is polling with sleeps while teammate runs are open | Do not wait as work | Settlement notices arrive on their own; do queued work, or end the turn |
| A run settled, but machine load or processes the teammate started are still alive (`yes.exe`, servers, watchers) | Hunt them before trusting any number measured while they ran (`Get-CimInstance Win32_Process` on Windows, `ps` elsewhere), and read the harness's own cleanup story in your adapter — on some it kills only the runner | Re-run the verify you measured under load: a loaded machine turns known-flaky tests red, and you will otherwise chase a defect the team created. Log it, bound the load next time (a counted loop), and have the brief require the teammate to kill its own PIDs before it returns |

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
- **Self-authorized gates** — push, deploy, restart, format change, destructive op. None of
  these are ever a teammate's or the lead's decision. Commits are the one gate answered in
  advance, at charter, and only for verified batches by pathspec.
- **The closing blob** — nothing committed all run, then one commit at Close with every
  territory in it. Nobody can review it, revert one part of it, or bisect it.
- **`git add -A`** — the tree was dirty before the team started; `baseline.dirtyPaths` says
  exactly how. Adding everything makes the human's unrelated work part of the team's commit.
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
- **Load left running** — a teammate saturates the machine (busy loops, servers, watchers) and
  nobody checks the load is gone once it settles. The lead's own verify then measures a machine
  the team still occupies, and reports a flaky red as a real failure. Bound the load, kill it,
  confirm it is gone, and only then read the numbers.
