# Staffing: roles, charters, briefs

A role is a **prompt-level contract** first. `pi-subagents` agent profiles carry a persona and
a tool posture, which gets you most of the way, but a teammate is a builder or a prober because
the brief says so and the lead checks the output against that contract. The one thing the
harness really enforces is a `gate`. Never assume anything else is.

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

## Roles map onto pi's agent profiles

A role is always a brief. `pi-subagents` also ships agent profiles that carry a persona and a
tool posture, so pick the profile that matches the role instead of describing it from scratch.
Read the current list with `subagent({ action: "list" })` — the table below is what ships, and
your machine may have more.

| Role | Dispatch | What the profile already does | Still only the brief |
| --- | --- | --- | --- |
| scout | `subagent({ agent: "scout", task })` | fast local recon: files, entry points, data flow, risks | keeping it read-only is the brief's job — say "write no files" |
| builder | `subagent({ agent: "worker", task })` | implementation; escalates unapproved decisions instead of guessing | its territory |
| prober | `subagent({ agent: "reviewer", task, gate: "<verify cmd>" })` | review against the task, tests, edge cases; the `gate` is host-run | that it is not the author — **the lead must pick a different child** |
| critic | `subagent({ agent: "oracle", task })` | second opinion, challenges assumptions, does not edit | the two axes and the verdict vocabulary |
| prober (claims) | `subagent({ agent: "evidence-auditor", task })` | checks whether claims are supported by their sources | needs `pi-web-access` in the child |
| scribe | `subagent({ agent: "delegate", task })` | behaves close to the parent session | doc conventions |

Two things the profile does **not** give you, and both are the lead's job:

- **Independence.** No profile stops you handing the prober's task to the child that wrote the
  code. Spawn a separate child, and say in the human report that you did.
- **Read-only.** `oracle` does not edit, but `scout` and `reviewer` still have a shell. If a
  role must not touch the tree, write it in the brief and check the diff afterwards.

What *is* harness-enforced is the **gate** (see `protocol.md`): a host-run command whose failure
rejects the child's result. Put every task's `verify` command there. A gate proves the command
passed; it does not prove the command tested the right thing, so the prober's judgement still
matters. Say in the human report which checks were gates and which were a model's word.

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
- Pass `model` on the dispatch to route a single child. Call `subagent({ action: "models" })`
  first and copy an exact `provider/id`; a bare id resolves only when unique, and an agent name
  is not a model id. A `provider/id:high` suffix overrides that agent's thinking level.
- Record the route actually used in `team.json` (`members[].model`). A report that cannot say
  which model produced a claim cannot be audited later.

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
- **Retire a member** with `subagent({ action: "stop", id })` while it runs, `status: "retired"`
  in `team.json`, and one `inbox.log` line saying why. A teammate left running with nothing to
  do is pure cost, and it holds part of the session's spawn budget.
- **Merge** two small tasks into one brief; **split** a task whose acceptance has two independent
  halves and two owners.
- **Grow only for a stateable reason**: a newly discovered independent workstream, a verification
  that must be independent, or terrain nobody has mapped. "It felt safer" is not a reason.

## Spawning

Start every independent teammate **in the same assistant message** so they actually run in
parallel, and use `subagent` (spawn) unless the teammate genuinely needs this session's
conversation — `context: "fork"` copies it and costs the extra context. Record the returned
run id in `team.json` (`members[].agentId`); that id is what `status`, `steer` and `stop`
take, and what makes the team resumable after a context loss.

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
REPORT: your final message is the report. Raise a blocker mid-run with contact_supervisor.
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
