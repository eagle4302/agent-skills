---
name: agents-team
description: Use when the user asks for an agent team, multiple agents, a lead plus specialists, or teammates; also use when a deliverable needs 2+ independent workstreams sharing one artifact, a durable task board with dependencies, agents handed off across a context loss, an independent verification pass before anything is called done, or one agent writing an implementation while another writes its tests. One bounded delegation does not need this.
---

# Agents Team

A team is three things and nothing else: **disjoint territories**, **one independent verifier
per deliverable**, and **one voice to the human** — you, the lead. Everything below serves
those three.

A teammate is a delegated child: it gets a self-contained brief, it runs on its own, and it
hands back a result. It does not see this conversation unless you ask for a fork, and it cannot
reach the human. What it loads from the workspace depends on the harness — a DSH `subagent`
child was measured on 2026-10-29 to receive the global `AGENTS.md` — so quote the project rules a
teammate needs into the brief instead of assuming it inherits none.

**The tool names are not in this skill.** They live in `adapters/`, one file per harness, and
step 0 is reading yours.

## Run the loop

Each step ends when its completion criterion holds.

0. **Identify the harness** — look at the delegation tools this session actually has and read
   the matching file in `adapters/` (`adapters/README.md` picks it; it is one table). Never
   guess from the machine or the repo — one machine can have several harnesses installed, and
   this skill has already been shipped to a harness whose tools it did not have.

   The adapter tells you which of eleven capabilities you hold. Two of them change the plan:
   without `gate` **you are the verifier of record** and run every `verify` yourself at step 5;
   without `parallel-spawn` teammates cannot overlap and the sizing ladder drops a rung.
   `protocol.md` has the full degradation table — read the rows for whatever you are missing,
   at step 0, not when you hit them.

   *Done when:* one `note` line in `inbox.log` names the harness, whether you have a `gate`,
   and who is therefore the verifier of record. If no adapter matches, write one from the
   harness's own tool reference before staffing, or stay Solo.

1. **Size the job** — judge how much team this deserves before spawning anything. Most jobs
   are smaller than they feel; some are larger than they look.

   | Scale | Reach for it when | Shape |
   | --- | --- | --- |
   | **Solo** | one workstream, one pass, nothing that must be reproduced by a second pair of eyes | you do it yourself, inline — and create **no team state at all** |
   | **One helper** | one bounded errand whose reading, fetching or building would flood your context | one background teammate |
   | **Light team** | one deliverable that owes independent verification, work that splits into two disjoint territories (an implementation and its tests count as two — `staffing.md` → "Paired build"), or work that will outlive a compaction | 1–2 builders + 1 prober |
   | **Full team** | 2–3 independent workstreams sharing an artifact, unknown terrain, a high-risk or contract-touching change, or the human asked for a team | scout + builders + prober, plus critic/scribe as needed |
   | **Stage fan-out** | one stage is many homogeneous items | that stage runs as parallel lanes, or as a packaged prompt where the harness ships one (`workflow-stage.md`) |

   Push **up** a rung when: the human asked for a team; two workers could run at once without
   waiting on each other; the result must be independently reproducible; the job will not
   survive one context; a mistake is expensive or slow to undo.
   Push **down** when: one file, one command, one question; you already hold every fact a
   teammate would have to go and discover; briefing takes longer than doing; the harness has
   no `parallel-spawn`, so a second teammate buys no wall-clock at all; or the tasks form a
   dependency chain on one shared territory, so only one builder can ever be writing
   (`staffing.md` → "A chain of tickets").

   *Done when:* the scale and its one-line reason exist — in your reply for solo or one-helper,
   in `team.json` for a light or full team. Solo work writes no `.agent-teams/` directory;
   ceremony on a one-file change is a defect, not diligence.

2. **Charter** — `node "<this skill's base dir>/scripts/team.mjs" init <slug>`, then `baseline`
   on the same directory: it records the git sha you started from and every path that was
   **already dirty**, so afterwards the team's changes can be told apart from everything else.
   Run the verify commands **now, on the untouched tree**, and record what you find in
   `baseline.verifiedClean` + `knownFailures` — a build that was already red before the team
   existed must never be scored as the team's. Quote the project's own rules into `houseRules`
   (build flags, line endings, formatting): workspace instruction files are harness-dependent (a
   DSH child got the global `AGENTS.md`; project files may not reach it), so whatever is not in
   the brief may not reach it.
   Then fill in the tasks — acceptance lines (for work that computes something, concrete
   known-answer cases, not just "every item of ticket #N" — `staffing.md` → "Known-answer cases
   before the build"), a paste-ready `verify` command where one exists,
   `inScope` globs, dependencies, and a `commitGroup` on every implementation task: one group
   per territory, so each builder's work lands as its own commit instead of one closing blob.
   Ask the human **once, here**, for two things. First the **run mode** — quick / standard /
   thorough, with your recommendation and the classes they want kept off the quick path
   (`references/modes.md` has the paste-ready question); a Solo or one-helper run asks nothing.
   Then the commit authorization ("may I land each batch once its verifier passes"). Record
   both — `mode` + `fastPathExclusions`, and `commitPolicy`. Run `validate` until it exits 0.
   *Done when:* validation passes, `baseline.sha` and `verifiedClean` are filled, `houseRules`
   carries whatever the project insists on, `mode` and `commitPolicy` carry the human's answers,
   and every task has an owner or is deliberately `backlog`.

3. **Staff** — spawn independent teammates **in one message** so they run in parallel, each with
   a self-contained brief from `staffing.md`. Dispatch the role the way your adapter says (a
   role-prefixed brief where the harness has no presets, a preset where it does), set the context
   mode explicitly rather than inheriting a default you have not checked, and put the task's
   `verify` command in the `gate` so the
   harness, not a model's word, decides whether the result is accepted. Where there is no
   `gate`, that check does not vanish — it becomes yours at step 5. Delegate what a teammate can finish without you and hand back as evidence; keep
   the judgement calls, the integration and anything smaller than the brief it would take.
   Record the returned identity (child id or teammate name) as that member's `agentId`.
   *Done when:* every live member has an `agentId`, and `board.md` shows who owns what.

4. **Run** — you are a working lead: you hold the smallest tasks, the integration, and every
   decision, and you never idle while the team works. Re-size whenever the evidence changes —
   merge two small tasks, split an oversized one, re-assign, interrupt a teammate whose errand
   turned out trivial, retire a member with nothing left. When the remaining tasks become a
   chain, drop to one builder that carries on from ticket to ticket, and have the next ticket's
   known-answer cases drafted while the current one is built. Read the settlement notices (on DSH a notice carries the report but not the teammate's name —
   match it to the task you sent), ask for `status` when it is unclear who is running, `steer` to
   redirect, and `stop` a teammate that
   is looping, drifting, or outside its territory — then decide explicitly whether to re-brief
   it or finish the work yourself. Where `steer` or `stop` is absent, `protocol.md` says what
   replaces it.
   Append every exchange to `inbox.log`.
   *Done when:* every task is `in_progress`, `in_review`, `blocked`, or `done` — and the board
   plus `inbox.log` say so.

5. **Verify, then land the batch** — dispatch a prober that did not write the code; it re-runs
   `verify` against the frozen artifact and returns per-criterion PASS/FAIL with raw output.
   In quick mode the verifier is the lead re-running `verify` in the same tree — independence is
   the rule, the dispatch is only how it is usually bought (`references/modes.md`).
   Each layer checks once and checks something different — the builder does not mutate, the
   prober works in the run's persistent probe tree, the lead re-runs only `verify`
   (`staffing.md` → "One pass per layer of verification").
   On a harness with no `gate`, run every `verify` command yourself before the batch lands —
   the prober's report is the second opinion, your own output is the evidence of record.
   The moment every task in a `commitGroup` is settled and its verdict is `pass`, that batch
   lands: `team.mjs batch` prints the pathspecs, you show the human `git status --short` for
   those globs, commit **by pathspec only**, then write the sha into each task's `commitSha`
   and one `commit` line into `inbox.log`. Never `git add -A`, `git add .` or `git commit -a` —
   `baseline.dirtyPaths` lists what was in the tree before the team existed.
   *Done when:* every implementation task has a verification task with a verdict, every passing
   batch carries a `commitSha`, and a failure has been re-briefed (attempt 1) or escalated
   (attempt 2).

6. **Review** — only for high-risk or contract-touching work: a critic on two axes, spec
   compliance and red lines, with structured findings.
   *Done when:* the verdict is `pass`, or every finding is fixed and re-reviewed.

7. **Close** — integrate the artifacts yourself, run the end-to-end check yourself, land the
   last batch, finish `board.md`, move the directory to `.agent-teams/archive/<slug>/`, and
   report to the human: what shipped and **as which shas**, what did not, what they can do
   today, remaining risk, and what needs their decision.
   *Done when:* the human report names the evidence for each claim and lists the shas, and
   `validate` reports no batch left uncommitted.

## Hard rules

1. **One writer per territory.** Overlapping edits are a lead bug, not a teammate bug.
2. **A teammate's report is a claim, not evidence.** Only a verifier's raw output closes a task
   — a prober's, or the lead's own run where the harness has no `gate` or the mode makes the lead
   the verifier of record (`references/modes.md`). Whoever it is, it is never the author.
3. **Verifiers and critics are read-only.** They report; the builder fixes.
4. **Evidence format is mandatory** — commands, real output with numbers, `file:line`, status,
   and what was *not* verified. "Should work" is a failed report.
5. **Human gates are never self-authorized** — push, deploy, restart, destructive operations,
   format changes: ask, then record. Commits are gated **once, at charter**, in `commitPolicy`,
   so the run is not interrupted per batch; that one answer covers landing verified batches by
   pathspec and nothing else. No authorization, no `commitSha` — `validate` treats a sha
   without it as an error.
6. **The lead is the only voice to the human.** Teammates message you; you decide what reaches
   the human, and you never relay an unverified claim as fact.
7. **Scale down as fast as you scale up.** A teammate whose task shrinks, or whose results you
   no longer need, is stopped and retired — not kept busy to justify the team. Say in the human
   report that the team was resized, and why.
8. **A tree handed to a teammate is green there first.** A patch that applies cleanly has not
   passed: run `verify` in the tree the teammate will work in, and only then brief anyone into
   it. Scaffolding that fails on the first command spends a whole round on the lead's mistake.
9. **The mode is asked for, recorded, and never changed silently.** It is the human's call at
   charter, for a Light team or larger (`references/modes.md`); it lives in `team.json.mode`,
   and the closing report quotes it. Escalating needs their confirmation; downgrading is
   theirs alone.

## Red flags — stop and correct

- Reporting progress to the human by quoting a teammate's summary.
- A verification task assigned to whoever wrote the code, or to a re-briefed same child.
- Two builders whose territories touch, or a teammate that "also cleaned up" a nearby file.
- In a paired build, a test builder briefed with the implementation, or a builder editing a red
  test until it passes — the tests then confirm the code instead of checking it.
- Skipping the board on a team run because the job "looks small" — then losing the thread after a
  compaction.
- Building team state, briefs or a helper for work you could have finished in the time the
  briefing took.
- The lead idle while teammates work, or quietly redoing a teammate's task in parallel with them.
- Staffing five teammates for two territories, or a teammate spawning its own helpers unasked.
- A fresh builder spawned for every link of a dependency chain, each re-reading the codebase
  from zero, while only one of them can ever be writing.
- A prober's first round on computational work finding edge cases nobody wrote down before the
  build — the acceptance was a ticket reference, not known-answer cases.
- Builder and prober both running mutation passes, or a prober copying the repository and
  building it cold for every probe — verification then costs more wall-clock than the build.
- Dispatching a builder or a critic without setting the context mode, so it silently inherits
  the whole conversation you were paying a teammate to stay out of.
- Staffing before reading the adapter, then discovering at step 5 that nothing was ever
  harness-enforced — or calling a tool this harness does not have.
- A teammate asking the human directly, or taking a gated action.
- Attempt 2 reached and the run continuing without a reassignment or a human question.
- Reaching Close with every territory still uncommitted, so the run ends as one giant commit
  nobody can review, revert or bisect.
- `git add -A`, `git add .` or `git commit -a` on a tree that `baseline.dirtyPaths` says was
  already dirty — that sweeps the human's own unrelated work into the team's commit.
- Landing a batch whose prober has not returned `pass`, or before the human answered at charter.
- Taking the quick path without asking, or using a mode to lower an acceptance bar — a mode
  changes the coordination, never what counts as done.
- Burning two attempts on a failure that was already red before the team existed, because
  nobody ran the verify commands at charter.
- Briefing a teammate without the project's own rules, then treating what it built with the
  wrong flags as its mistake.
- Handing a teammate a worktree or a patch you checked only by "it applies cleanly", so its
  first command is a compile error and the round is spent on your scaffolding.
- A teammate saturating the machine (load loops, servers, watchers) with no bound, and no check
  that the load is gone before the lead reads its own build or test numbers — a loaded machine
  turns known-flaky tests red, so the lead then chases a defect the team itself created.

## Read next

| File | Read it when |
| --- | --- |
| `adapters/README.md` | **First, every run.** Which harness you are on, and the eleven capabilities |
| `adapters/<harness>.md` | The actual calls: dispatch, status, steer, stop, gate, fan-out |
| `references/staffing.md` | Choosing roles, writing a brief, deciding team shape and size, pairing an implementation with its tests |
| `references/modes.md` | **At charter, every Light-or-larger run**: quick / standard / thorough, and the classes kept off the quick path |
| `references/protocol.md` | The capability contract, **what to do when one is missing**, escalation, `inbox.log` format |
| `references/team-state.md` | Creating or reading `team.json`, `board.md`, reports; resuming after a context loss |
| `references/failure-playbook.md` | Something went wrong: silence, wrong output, conflicts, runaway teammates |
| `references/workflow-stage.md` | A whole stage is a fan-out over many homogeneous items |

Related skill: `ssh-captain` (remote machines as a team role) — load it instead of reinventing
an `ops` teammate. Everything else this skill needs is in the table above; do not go looking for
a companion skill to do the sizing, the fan-out or the verification for you. A harness may ship
its own subagent skill — read it for tool detail your adapter is missing, never for the team
rules, which are here.
