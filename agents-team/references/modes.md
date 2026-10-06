# Modes: quick, standard, thorough

Three presets. The human picks one **at charter**, for a Light team or larger — never for Solo
or one-helper work, where the ceremony would cost more than the change (`SKILL.md` → step 1).
Record it in `team.json.mode`, the classes they kept off the fast path in
`team.json.fastPathExclusions`, and quote both in the closing report: a run that quietly took
the fast path is a run the human cannot audit.

A mode changes **how much coordination the work gets**, never what counts as done. Acceptance
criteria, the evidence format, the human gates, and the rule that nobody verifies their own
work are identical in all three.

| | **quick** | **standard** | **thorough** |
| --- | --- | --- | --- |
| shape | 1 writer (may be the lead); no scout unless the terrain is unknown | 1–2 builders | scout + 2–3 builders + critic |
| cases | the writer makes the **failing test** first, boundaries included; the lead reads the test before implementation starts | a non-writer drafts known-answer cases before the build | as standard, and the critic re-reads the acceptance list |
| verifier | **the lead re-runs `verify` in the same tree** | a prober that did not write it, one round per batch | prober + critic, two axes, plus any real-machine or integration gate |
| hostile cases | the verifier adds its own | the prober adds its own | as standard |
| mutation | once per `commitGroup`, by the verifier, aimed at the acceptance criteria | the prober's single mutation pass | as standard, plus the red paths |
| parallel writers | at most 2, disjoint territories only, verification interleaved | 2–3 | as it falls |
| timebox | writer 20 min per ticket, verification round 10 min | 60 min (the ordinary child budget) | as the risk demands |
| lands as | one commit per ticket (`commitPolicy.mode: "per-task"`) | one per territory | one per territory plus the integrated batch |

**Why quick mode is still verified.** Agentless (`arXiv 2407.01489`) beat every open-source
agent of its time on SWE-bench Lite — 32.00% at $0.70 per issue — with a plain
locate → repair → validate pipeline instead of a free-running agent. What the evidence does
*not* support is dropping the check: DORA's 2025 report finds 90% AI adoption with more than
80% feeling faster, while 30% still trust the generated code little or not at all. Speed comes
out of coordination and waiting; verification moves, it does not shrink.

## Quick mode's two hard exceptions

Quick mode's verifier is the lead *because the lead is not the writer*. Two cases keep the
separate prober, and neither is negotiable:

1. **The lead wrote the code.** Then re-running `verify` proves nothing about independence —
   dispatch a prober, timebox included.
2. **The human named the class.** Ask at charter which categories may not take the fast path
   this run; everything they name is verified by someone who did not write it, whatever the mode.

Everything else the human did not name stays a judgement call for the lead, recorded in
`fastPathExclusions` as the answer it gave.

## The timebox, and what happens when it expires

Quick mode buys its speed by refusing to wait. A writer gets 20 minutes for a ticket and a
verification round 10; when either expires, **the lead finishes the `verify` itself and writes
one `takeover` line into `inbox.log`** — it does not spawn a replacement, because a re-spawn
costs the whole round trip that the timebox exists to bound. A teammate that takes longer is
evidence about the ticket, not a reason to hand it to a third party.

On pi the clock has a second cost: a running goal fires a continuation every ~2 seconds. Park
it (`update_goal({status:"paused"})`) before any wait that could run long — see `adapters/pi.md`.

## Escalation

- **Up** — the lead proposes, the human confirms in one line. Triggers: the ticket turns out to
  touch a class the human named, the safety layer, the on-line protocol, a config format, or the
  terrain was unknown after all. Escalating mid-run is normal and cheap; noticing late is not.
- **Down** — the human only. A lead that downgrades on its own has decided, unasked, to buy speed
  with someone else's quality bar.

Both directions add one `inbox.log` line and update `team.json.mode`.

## The charter question (paste-ready)

> **Mode for this run:** quick / standard / thorough — I recommend **<mode>** because <one line:
> territory size, whether the terrain is known, what the change touches>.
> **Classes that must not take the quick path:** I suggest <list — e.g. safety/interlock and
> motion, on-line protocol and config formats, deploy paths>; accept, edit, or say "none".
> **Commits:** may I land each batch once its verifier passes?

One question, two answers, asked once — the same charter stop that already collects the commit
authorization. Solo and one-helper runs ask neither.

## What no mode changes

- One writer per territory; two writers never share a glob.
- The verification is still **written down as a task on the board**, owned by whoever runs it —
  the prober, or the lead in quick mode. A board that cannot say who checked what is not a fast
  board, it is an unaudited one.
- Nobody verifies their own work. In quick mode the lead is the verifier *because* the lead is
  not the writer; if that stops being true, a prober comes back.
- The full `verify` command still runs **on the tree that lands**, by whoever is the verifier of
  record. A passing subset is not a passing gate.
- Where the harness has a `gate`, it is still set on the writer's dispatch: host-run enforcement
  is free, and it is not the same layer as the verifier's judgement.
- Evidence format: exact commands, real output with numbers, `file:line`, status, and what was
  **not** verified.
- Human gates — push, deploy, restart, destructive operations, format changes — are asked, never
  self-authorized, in every mode.
- Anything that computes gets known-answer cases. Quick mode changes who writes them (the
  writer's failing test) and who reads them (the lead, before implementation), not whether they
  exist. If a ticket's acceptance cannot be checked by a command, that is a charter problem, not
  a mode problem — write the command, or the ticket is not ready.
