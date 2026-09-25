# Staffing: roles, charters, briefs

A role is a **prompt-level contract** first. Most harnesses ship agent profiles that carry a
persona and a tool posture, which gets you most of the way, but a teammate is a builder or a
prober because the brief says so and the lead checks the output against that contract. The most
a harness ever enforces is a `gate`, and not every harness has one. Never assume anything else
is enforced.

## Roster

| Role | Mission | Produces | Must not |
| --- | --- | --- | --- |
| `lead` | Owns the board, the briefs, integration and the single human interface. Always the main session, never a spawned child. | `team.json`, `board.md`, the final report | Delegate its own accountability for what ships |
| `scout` | Read-only reconnaissance: map the terrain before anyone writes. | Facts with `file:line` citations, open questions, a recommended split | Write or edit any file |
| `builder` | Implement one workstream inside one territory. | Changed files + command output + evidence | Touch files outside its territory; declare its own work verified |
| `prober` | Independently re-run the acceptance commands against the frozen artifact. Never the author. | Per-criterion PASS/FAIL with raw output and a "not verified" list | Fix what it finds; edit source; accept a self-report as evidence |
| `critic` | Independent review on two axes: spec compliance and red lines. Used for high-risk work only. | Structured findings + `verdict` | Re-litigate decisions the human already made; edit files |
| `scribe` | Turn frozen facts into project documentation (docs, wiki, progress notes, vault). | Doc changes + which facts they came from | Invent claims nobody verified; write before the artifact is frozen |

Optional `ops` role for remote machines: hand the whole thing to the `ssh-captain`
skill instead of reinventing it here.

Team shapes:

- **Light team** — 1 builder + 1 prober. Small work that still needs a second pair of eyes.
- **Full team** — scout (if the terrain is unknown) + 2–3 builders on disjoint territories
  + 1 prober + 1 critic (high-risk) + 1 scribe (only if the project keeps docs).
- **Stage fan-out** — when one stage has many homogeneous items, run it as parallel lanes
  instead of staffing a member for each; see `workflow-stage.md`.

Cap concurrent members at 3–4. Every teammate is a full context; a team costs real money
and real wall-clock, and the human pays for both.

## Roles map onto your harness's agent profiles

A role is always a brief. Most harnesses also ship agent profiles that carry a persona and a
tool posture, so pick the profile that matches the role instead of describing it from scratch.
**Your adapter's "Role dispatch" table is that mapping** — read it at step 0, and check it
against the profiles this session actually lists before you staff.

Three things a profile does **not** give you, on any harness, and all three are the lead's job:

- **Independence.** No profile stops you handing the prober's task to the teammate that wrote
  the code. Spawn a separate one, and say in the human report that you did. This is also the
  one rule `team.mjs validate` enforces: a verification task whose `assignee` wrote the task
  it judges is an error, and its batch never reaches `ready`.
- **Read-only.** A profile that cannot edit files usually still has a shell, and "read-only" in
  a brief is an instruction, not a sandbox. Write it in the brief and check the diff afterwards.
- **A known context.** Whether a teammate inherits this conversation is a per-profile default on
  some harnesses and a per-call flag on others. Your adapter says which; pass it explicitly
  where the harness accepts one.

What a harness *can* enforce is the **gate**: a host-run command whose failure rejects the
teammate's result. Where you have one, put every task's `verify` command in it. A gate proves
the command passed; it does not prove the command tested the right thing, so the prober's
judgement still matters. Where you do not have one — see the degradation table in
`protocol.md` — **the lead runs `verify` itself before the batch lands**. Either way, say in
the human report which checks were harness-enforced and which were a model's word.

The backstop is a real command, not a promise. `baseline.sha` is what makes it runnable —
without it, "did anyone write outside their territory?" has no answer:

```
git status --short
git diff --stat <baseline.sha> -- <that member's territory globs>
```

Anything changed that is neither in a territory nor in `baseline.dirtyPaths` is a scope breach.
Run it before the first batch lands, not after the run.

## Model routing

- Put routine, mechanical or parallel work on a fast model; put judgement, review and hard
  diagnosis on the strongest route available.
- Route a single teammate by naming a model on the dispatch, using whatever form your adapter
  gives. Copy an exact identifier from the harness's own model listing rather than typing one
  from memory; an agent name is not a model id.
- Record the route actually used in `team.json` (`members[].model`). A report that cannot say
  which model produced a claim cannot be audited later. Record a deliberate inherited context
  there too (`provider/model (inherited-context)`), so the closing report can say which
  teammates saw this conversation and which did not.

## What to delegate, what to keep

The lead is a working lead. It is not a dispatcher, and it is not a spectator.

| Keep with the lead | Hand to a teammate |
| --- | --- |
| The sizing decision, the board, and every call the evidence does not settle | A workstream with a written acceptance and a paste-ready verify command |
| Integration across territories and the final end-to-end check | One territory with exactly one writer |
| Every commit — one batch per territory, landed once its prober passes | Nothing: a teammate never runs `git commit` |
| Anything smaller than the brief it would take | Anything whose discovery would flood the lead's context |
| Talking to the human, the gates, and the closing report | Recon, implementation, verification, review, docs |
| Resolving two conflicting claims | Independently re-running acceptance on a frozen artifact |

- A task is ready to delegate when you can write its acceptance lines **and** a verify command.
  If you cannot, you have not finished thinking — that is not a reason to staff more.
- Delegation is granular: a one-line question, a single file, and a multi-day workstream are all
  legitimate tasks. Match the brief to the errand; never send a paragraph of instructions where
  a sentence would do, and never send a one-liner for work that needs context to be safe.
- A territory is also a **commit batch**: give every implementation task in it the same
  `commitGroup`, normally the owning member's name, so that builder's work lands as one
  reviewable commit the moment its prober passes. Two builders sharing a `commitGroup` means
  the territories were not disjoint after all — fix the split, not the group.
- The lead's own tasks live in `team.json` like everyone else's, so the board tells the truth
  about who is doing what.
- The lead's territory is normally the board, `notes/` and the integrated result. It claims
  product files only when it is their single writer — and then no builder is there too.

## Re-sizing mid-run

Size is a decision you revisit, not a decision you make once.

- **Take a task back** when the brief outgrew the work, when the teammate is stuck after two
  attempts, or when its territory turns out to overlap someone else's. Finish it inline.
- **Retire a member** with `stop` while it runs, `status: "retired"` in `team.json`, and one
  `inbox.log` line saying why. A teammate left running with nothing to do is pure cost, and it
  holds part of the session's spawn budget. Where `stop` is absent, let it settle and discard
  the result — then check the diff before anything lands.
- **Merge** two small tasks into one brief; **split** a task whose acceptance has two independent
  halves and two owners.
- **Grow only for a stateable reason**: a newly discovered independent workstream, a verification
  that must be independent, or terrain nobody has mapped. "It felt safer" is not a reason.

## A chain of tickets

When the remaining tasks depend on each other in a line and write the same territory, only one
builder can ever be writing. More builders buy nothing; what is left to gain is not re-paying
for context and not re-paying for rework.

- **One builder carries the chain.** When ticket N lands, hand ticket N+1 to the *same* builder
  with your adapter's follow-up call, instead of spawning a fresh one that re-reads the codebase
  from zero. Retire it and start fresh only when its context is visibly degrading or the chain
  moves to a different territory. Independence is unaffected: the prober was never that builder.
- **Draft ticket N+1's cases while ticket N is being built.** That is the one piece of real
  parallelism a chain has — see below.
- **Re-size at the moment the chain starts**, not at the end: a run that staffed two builders
  for the first wave drops to one builder + one prober once the remaining work is a chain, and
  says so in `inbox.log`.

## Known-answer cases before the build

A task whose acceptance is only "every item of ticket #N" is not ready for a builder when the
work computes something — metrics, detection, parsing, thresholds, comparisons. The edge cases
then get invented by the prober *after* the build, and every one it finds is a serial round of
re-brief, fix, re-probe.

- Before the builder starts, have a prober (or a scout) draft **known-answer cases**: concrete
  inputs with the expected output and a tolerance, plus the hostile ones — noiseless input,
  truncated file, a period that is not the default, a value on the threshold, the degenerate
  segment. It writes them to `notes/<task>-cases.md` and edits no product file.
- The lead reviews them, copies them into the task's `acceptance`, and pastes them into the
  builder's brief. The builder now hits them inside its own loop, where a fix costs minutes.
- The verifying prober checks every drafted case **and still adds its own**; the drafted list is
  a floor, not the whole probe. A case it adds that fails goes back into the list for the next
  ticket's draft.
- In a chain, draft ticket N+1's cases while ticket N is being built or probed, so the drafting
  costs no wall-clock.

## One pass per layer of verification

Builder, prober and lead each check the work, but each checks something different. When all
three run the same heavy checks, verification ends up costing more wall-clock than building.

| Layer | Runs | Does not run |
| --- | --- | --- |
| builder | its own tests while iterating, then the task's `verify` once before reporting | mutation testing, repeat-N flakiness loops — do not ask for them in the brief |
| prober | `verify`, the known-answer cases, its own hostile cases, and **the only mutation pass** | a sweep of every line: mutations target the acceptance criteria and the computational modules, where a test can pass without checking anything |
| lead | the task's `verify` commands, once, on the tree that is about to land | anything the prober already did — the lead's run is the evidence of record, not a second probe |

- **Repeat loops are bounded.** Re-running a suspect test is a probe for flakiness, capped at
  about ten runs; run more only when flakiness is itself the acceptance criterion.
- **The prober gets a persistent tree, not a fresh copy.** Copying the repository and building
  it cold for every probe (or for every mutation) repeats the slowest step of the project each
  time. At charter, create one probe tree for the whole run — `git worktree add --detach
  <probe-dir> <baseline.sha>` — build it once, and name it in every prober brief. Each probe
  syncs the frozen artifact's sources into it, keeps that tree's own build directories, and
  builds incrementally:

  ```
  rsync -a --delete --exclude .git --exclude '<each build dir>' <repo>/ <probe-dir>/
  ```

  A mutation is made in the probe tree, built incrementally, and reverted with
  `git -C <probe-dir> checkout -- <file>` before the next one. The main checkout is never
  mutated, so the builder — or the next ticket in a chain — can keep working there while the
  probe runs.
- **Say in `houseRules` which builds are slow**, so the prober budgets its mutation pass
  instead of discovering the cost one cold build at a time.

## Spawning

Start every independent teammate **in the same assistant message** so they actually run in
parallel. If your harness has no `parallel-spawn`, they run one after another and the sizing
ladder drops a rung — two territories that cannot overlap in time are often one task for the
lead.

Pass a fresh context unless the teammate genuinely needs this session's conversation.
Inheriting it copies the whole thing: real tokens per teammate and, on a critic, the framing it
was staffed to challenge. Your adapter says whether fresh is the default here — on at least one
harness it is not, for exactly the profiles a team uses most.

Record the returned id in `team.json` (`members[].agentId`); that id is what `status`, `steer`
and `stop` take, and what makes the team resumable after a context loss.

Give each teammate: a label (3–5 words), the brief, and nothing else. Spawn children do
not see this conversation, so the brief must be self-contained. That includes the project's
own rules: a teammate does not read `CLAUDE.md` or `AGENTS.md` on its way in, so whatever
those say about build flags, line endings or formatting has to be in `houseRules` and pasted
into every brief. A teammate that breaks a house rule you never told it is a lead bug.

## Brief skeleton (builder)

```
You are the <role> on a team. <One-line team objective.>

TASK: <what to produce, in one paragraph>
TERRITORY (the only paths you may write): <globs>
MUST READ: <exact files, tickets, specs — with paths>
HOUSE RULES (paste `houseRules` from team.json verbatim — you cannot see the project's
  CLAUDE.md or AGENTS.md, and "it built on my machine" is not acceptance):
  - <build/test command with every flag>
  - <line endings, formatting, naming — whatever the project insists on>
ALREADY BROKEN (do not try to fix, do not report as yours):
  - <each baseline.knownFailures entry: command -> symptom>
ACCEPTANCE (each line must end with evidence you can point at):
  1. ...
  2. ...
EVIDENCE FORMAT (mandatory):
  - the exact commands you ran
  - their real output, including numbers
  - file:line for every claim
  - STATUS: completed | failed | blocked
  - WHAT YOU DID NOT VERIFY: <be specific; an empty list is a red flag>
DO NOT: touch files outside your territory; commit; push; deploy; restart services;
  change configuration formats; ask the human anything directly.
REPORT: your final message is the report. If the harness gives you a way to raise a blocker
  mid-run, the lead will have named it in this brief; otherwise stop and report what blocked you.
```

Adapt for the other roles:

- `scout` — deliverables are facts and a recommendation; add "read-only, write no files".
- `prober` — replaces ACCEPTANCE with the other teammate's acceptance list, adds "you did
  not write this code; reproduce every criterion from scratch; on failure report the exact
  command and the mismatch, do not fix it", and requires a per-criterion verdict. Its
  ALREADY BROKEN block is not optional: without it a prober re-discovers a failure that
  predates the team, calls it a FAIL, and the lead burns two attempts on nothing. Say it
  plainly — *"reproducing one of these is not a FAIL of this task; only a new failure is.
  If one of them no longer reproduces, say so, that is also news."*
- `critic` — adds the two axes (spec compliance, red lines), forbids re-opening decided
  questions, and requires findings in this shape:

```json
{"id":"F1","severity":"blocker|high|medium|low","file":"path/to/file","line":42,
 "problem":"what is wrong","requiredFix":"what must change"}
```

Verdict vocabulary is exactly `pass`, `needs_revision`, `reject`. A vague "could be
stronger" is not a finding; if the critic found nothing after real reading, `pass` with the
list of what it did not examine.

## Anti-collusion

- The prober is never the builder, and never a second brief handed to the same child.
- Do not brief the prober with the builder's conclusion; brief it with the acceptance
  criteria and the artifact only.
- If a builder's own report says a test passes, that is a claim, not evidence, until the
  prober's raw output shows it.
