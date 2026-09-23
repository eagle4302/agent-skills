# Running a whole stage as a fan-out

A team is persistent, addressable and steerable: you can ask a child how it is going, redirect
it, and stop it. A fan-out is the opposite — many short-lived lanes, one composite result at the
end. Use each for what it is good at.

Reach for a fan-out when a **single stage** of the plan is many homogeneous items:

- an audit over many files or modules,
- N independent review angles over one artifact, then a synthesis,
- the same mechanical migration applied to N items,
- cross-checking one claim against several sources.

## Three ways to run one, cheapest first

1. **A packaged prompt.** `/parallel-review`, `/parallel-cleanup`, `/parallel-research`,
   `/review-loop`. Same shape every time, nothing to write. Try this before building anything.
2. **Parallel lanes in one `subagent` call.** `runs.all` for "every lane gets this task",
   `runs.run` for per-lane tasks. Add `isolation: "worktree"` when the lanes write, so they
   cannot collide; `none` when they only read.
3. **`workflowScript`.** Only when the stage genuinely needs sequencing and conditionals that
   the first two cannot express.

Whichever you use, say **which stage** is fanning out and why before you call it. A whole team
project does not go inside one fan-out: nothing in it can be re-briefed, corrected, or asked a
question.

## What a fan-out cannot do

| Limit | Consequence |
| --- | --- |
| The composite settles as a unit | Never fan out a stage the lead needs to steer item by item |
| A lane's intermediate messages do not reach the lead | Design each lane to fail loudly in its own result instead |
| Children do not get the `subagent` tool by default | A lane cannot spawn its own help unless you chartered it, and `maxSubagentDepth` still binds |
| Children do not receive this skill | The lane knows nothing about the board; the brief carries everything |
| "Read-only" is an instruction, not a sandbox | Verify with a diff against `baseline.sha` afterwards |
| Output is truncated by `maxOutput` when set | Return summaries and file paths, not transcripts; use `outputMode: "file-only"` for the big ones |

## Make each lane prove itself

The same rule as any teammate: a lane's report is a claim. Two things make it checkable.

- **A `gate`.** One host-run command per lane. Its failure rejects that lane's result, and no
  model opinion overrides it. If the stage has a natural per-item command, it belongs here.
- **Evidence in the shape you asked for.** Require the command, its real output, and `file:line`
  for every claim. Then give the synthesizing child the artifact, not just the reports, and tell
  it to drop every finding it cannot confirm in the current files.

Return counts alongside conclusions — `lanes: 7, reported: 6` makes one silent failure visible,
where a prose summary hides it.

## When a lane's infrastructure fails

A failure in the fan-out itself — child launch, prompt runtime, extension loading, child tooling
— is a blocker, **not** permission to quietly redo the work another way. Do not fall back to a
foreground run, an external CLI, or doing it inline without saying so. Stop, report the exact
failure with the run status and the repo/worktree/branch state, check whether the tree is clean
or capture the partial diff, and retry the same way or ask the human.

## Feeding the result back into the team

A fan-out stage is one task in `team.json` with `kind: "review"` (or `verification"`) and
`assignee` set to `stage:<name>` — `validate` accepts that form and expects no member row for it,
because the lanes have no durable identity. The lead is the one who reads the composite result,
writes `reports/<task-id>-<role>.md`, and records `verdict`/`attempt` in `team.json`; the
returned JSON is not durable state.

Nothing about a fan-out's success makes a *task* pass. A prober still owns the acceptance verdict
for anything that ships, and a batch still does not land until that verdict is `pass`.
