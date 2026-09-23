---
name: agents-team
description: Use when the user asks for an agent team, multiple agents, a lead plus specialists, or teammates; also use when a deliverable needs 2+ independent workstreams sharing one artifact, a durable task board with dependencies, agents handed off across a context loss, or an independent verification pass before anything is called done. One bounded delegation does not need this.
---

# Agents Team

A team is three things and nothing else: **disjoint territories**, **one independent verifier
per deliverable**, and **one voice to the human** — you, the lead. Everything below serves
those three.

Teammates are DSH subagents: durable ids, background runs, one settlement notice each. They do
not see this conversation, they cannot message each other, and they cannot message the human.

## Run the loop

Each step ends when its completion criterion holds.

1. **Size the job** — judge how much team this deserves before spawning anything. Most jobs
   are smaller than they feel; some are larger than they look.

   | Scale | Reach for it when | Shape |
   | --- | --- | --- |
   | **Solo** | one workstream, one pass, nothing that must be reproduced by a second pair of eyes | you do it yourself, inline — and create **no team state at all** |
   | **One helper** | one bounded errand whose reading, fetching or building would flood your context | one background `subagent` call |
   | **Light team** | one deliverable that owes independent verification, work that splits into two disjoint territories, or work that will outlive a compaction | 1–2 builders + 1 prober |
   | **Full team** | 2–3 independent workstreams sharing an artifact, unknown terrain, a high-risk or contract-touching change, or the human asked for a team | scout + builders + prober, plus critic/scribe as needed |
   | **Stage fan-out** | one stage is many homogeneous items | that stage runs through the `workflow` tool (`workflow-stage.md`) |

   Push **up** a rung when: the human asked for a team; two workers could run at once without
   waiting on each other; the result must be independently reproducible; the job will not
   survive one context; a mistake is expensive or slow to undo.
   Push **down** when: one file, one command, one question; you already hold every fact a
   teammate would have to go and discover; briefing takes longer than doing.

   *Done when:* the scale and its one-line reason exist — in your reply for solo or one-helper,
   in `team.json` for a light or full team. Solo work writes no `.agent-teams/` directory;
   ceremony on a one-file change is a defect, not diligence.

2. **Charter** — `node "<this skill's base dir>/scripts/team.mjs" init <slug>`, then `baseline`
   on the same directory: it records the git sha you started from and every path that was
   **already dirty**, so afterwards the team's changes can be told apart from everything else.
   Run the verify commands **now, on the untouched tree**, and record what you find in
   `baseline.verifiedClean` + `knownFailures` — a build that was already red before the team
   existed must never be scored as the team's. Quote the project's own rules into `houseRules`
   (build flags, line endings, formatting): a spawn child never reads `CLAUDE.md` or `AGENTS.md`,
   so whatever is not in the brief does not reach it.
   Then fill in the tasks — acceptance lines, a paste-ready `verify` command where one exists,
   `inScope` globs, dependencies, and a `commitGroup` on every implementation task: one group
   per territory, so each builder's work lands as its own commit instead of one closing blob.
   Ask the human **once, here**, for the commit authorization (which `mode`, and "may I land
   each batch once its prober passes"), and record the answer in `commitPolicy`. Run `validate`
   until it exits 0.
   *Done when:* validation passes, `baseline.sha` and `verifiedClean` are filled, `houseRules`
   carries whatever the project insists on, `commitPolicy` carries the human's answer, and every
   task has an owner or is deliberately `backlog`.

3. **Staff** — spawn independent teammates **in one message** so they run in parallel, each with
   a self-contained brief from `staffing.md`. On the *team preset* choose the tool by role
   (`subagent_scout`, `subagent_prober`, `subagent_critic` carry the persona and drop the tools
   that role may not use); on any other preset carry the charter in the brief and say so in the
   human report. Delegate what a teammate can finish without you and hand back as evidence; keep
   the judgement calls, the integration and anything smaller than the brief it would take.
   Record the returned child id as that member's `agentId`.
   *Done when:* every live member has an `agentId`, and `board.md` shows who owns what.

4. **Run** — you are a working lead: you hold the smallest tasks, the integration, and every
   decision, and you never idle while the team works. Re-size whenever the evidence changes —
   merge two small tasks, split an oversized one, re-assign, interrupt a teammate whose errand
   turned out trivial, retire a member with nothing left. Read settlement notices, `list_agents`
   when status is unclear, `send_message` to steer, `interrupt_agent` to stop a teammate that is
   looping, drifting, or outside its territory — then decide explicitly whether to re-brief it or
   finish the work yourself. Append every exchange to `inbox.log`.
   *Done when:* every task is `in_progress`, `in_review`, `blocked`, or `done` — and the board
   plus `inbox.log` say so.

5. **Verify, then land the batch** — dispatch a prober that did not write the code; it re-runs
   `verify` against the frozen artifact and returns per-criterion PASS/FAIL with raw output.
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
2. **A teammate's report is a claim, not evidence.** Only a prober's raw output closes a task.
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

## Red flags — stop and correct

- Reporting progress to the human by quoting a teammate's summary.
- A verification task assigned to whoever wrote the code, or to a re-briefed same child.
- Two builders whose territories touch, or a teammate that "also cleaned up" a nearby file.
- Skipping the board on a team run because the job "looks small" — then losing the thread after a
  compaction.
- Building team state, briefs or a helper for work you could have finished in the time the
  briefing took.
- The lead idle while teammates work, or quietly redoing a teammate's task in parallel with them.
- Staffing five teammates for two territories, or a teammate spawning its own helpers unasked.
- A teammate asking the human directly, or taking a gated action.
- Attempt 2 reached and the run continuing without a reassignment or a human question.
- Reaching Close with every territory still uncommitted, so the run ends as one giant commit
  nobody can review, revert or bisect.
- `git add -A`, `git add .` or `git commit -a` on a tree that `baseline.dirtyPaths` says was
  already dirty — that sweeps the human's own unrelated work into the team's commit.
- Landing a batch whose prober has not returned `pass`, or before the human answered at charter.
- Burning two attempts on a failure that was already red before the team existed, because
  nobody ran the verify commands at charter.
- Briefing a teammate without the project's own rules, then treating what it built with the
  wrong flags as its mistake.

## Read next

| File | Read it when |
| --- | --- |
| `references/staffing.md` | Choosing roles, writing a brief, deciding team shape and size |
| `references/protocol.md` | Messaging, steering, status, escalation, `inbox.log` format |
| `references/team-state.md` | Creating or reading `team.json`, `board.md`, reports; resuming after a context loss |
| `references/failure-playbook.md` | Something went wrong: silence, wrong output, conflicts, runaway teammates |
| `references/workflow-stage.md` | A whole stage is a fan-out over many homogeneous items |
| `preset/README.md` | Installing the preset that gives the roles their own tools and their own limits |

Related skill: `ssh-captain` (remote machines as a team role) — load it instead of reinventing
an `ops` teammate. Everything else this skill needs is in the table above; do not go looking for
a companion skill to do the sizing, the fan-out or the verification for you.
