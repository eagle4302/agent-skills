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

Each step ends when its completion criterion holds. Do not skip a step to look fast.

1. **Gate** — choose the shape before spawning anything.

   | Situation | Shape |
   | --- | --- |
   | One bounded errand | no team: one background `subagent` call |
   | Small work that still needs a second pair of eyes | light: 1 builder + 1 prober |
   | 2–3 independent workstreams sharing an artifact | full: builders + prober, plus scout/critic/scribe only as needed |
   | One stage, many homogeneous items | run that stage through the `workflow` tool (`workflow-stage.md`) |

   *Done when:* the shape and the reason are written into `team.json`.

2. **Charter** — `node "<this skill's base dir>/scripts/team.mjs" init <slug>`, then fill in the
   tasks. Every task carries acceptance lines, a paste-ready `verify` command where one exists,
   `inScope` globs, and its dependencies. Run `validate` until it exits 0.
   *Done when:* validation passes and every task has an owner or is deliberately `backlog`.

3. **Staff** — spawn independent teammates **in one message** so they run in parallel, each with
   a self-contained brief from `staffing.md`. Record the returned child id as that member's
   `agentId`.
   *Done when:* every live member has an `agentId`, and `board.md` shows who owns what.

4. **Run** — do your own tasks, never idle on the team. Read settlement notices, `list_agents`
   when status is unclear, `send_message` to steer, `interrupt_agent` to stop a teammate that is
   looping or outside its territory. Append every exchange to `inbox.log`.
   *Done when:* every task is `in_progress`, `in_review`, `blocked`, or `done` — and the board
   plus `inbox.log` say so.

5. **Verify** — dispatch a prober that did not write the code; it re-runs `verify` against the
   frozen artifact and returns per-criterion PASS/FAIL with raw output.
   *Done when:* every implementation task has a verification task with a verdict, and a failure
   has been re-briefed (attempt 1) or escalated (attempt 2).

6. **Review** — only for high-risk or contract-touching work: a critic on two axes, spec
   compliance and red lines, with structured findings.
   *Done when:* the verdict is `pass`, or every finding is fixed and re-reviewed.

7. **Close** — integrate the artifacts yourself, run the end-to-end check yourself, finish
   `board.md`, move the directory to `.agent-teams/archive/<slug>/`, and report to the human:
   what shipped, what did not, what they can do today, remaining risk, and what needs their
   decision.
   *Done when:* the human report names the evidence for each claim.

## Hard rules

1. **One writer per territory.** Overlapping edits are a lead bug, not a teammate bug.
2. **A teammate's report is a claim, not evidence.** Only a prober's raw output closes a task.
3. **Verifiers and critics are read-only.** They report; the builder fixes.
4. **Evidence format is mandatory** — commands, real output with numbers, `file:line`, status,
   and what was *not* verified. "Should work" is a failed report.
5. **Human gates are never self-authorized** — commit, push, deploy, restart, destructive
   operations, format changes: ask, then record.
6. **The lead is the only voice to the human.** Teammates message you; you decide what reaches
   the human, and you never relay an unverified claim as fact.

## Red flags — stop and correct

- Reporting progress to the human by quoting a teammate's summary.
- A verification task assigned to whoever wrote the code, or to a re-briefed same child.
- Two builders whose territories touch, or a teammate that "also cleaned up" a nearby file.
- Skipping the board because the job "looks small" — then losing the thread after a compaction.
- Staffing five teammates for two territories, or a teammate spawning its own helpers unasked.
- A teammate asking the human directly, or taking a gated action.
- Attempt 2 reached and the run continuing without a reassignment or a human question.

## Read next

| File | Read it when |
| --- | --- |
| `references/staffing.md` | Choosing roles, writing a brief, deciding team shape and size |
| `references/protocol.md` | Messaging, steering, status, escalation, `inbox.log` format |
| `references/team-state.md` | Creating or reading `team.json`, `board.md`, reports; resuming after a context loss |
| `references/failure-playbook.md` | Something went wrong: silence, wrong output, conflicts, runaway teammates |
| `references/workflow-stage.md` | A whole stage is a fan-out over many homogeneous items |

Related skills: `dispatching-parallel-agents` (ad-hoc 2+ delegations), `subagent-driven-development`
(written plan, fresh agent per task), `verification-before-completion` (the completion claim),
`ssh-captain` (remote machines as a team role).
