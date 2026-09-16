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
