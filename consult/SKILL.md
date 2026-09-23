---
name: consult
description: Consult a read-only advisor model, chosen by the user, at decision checkpoints — before committing to an approach on non-trivial work, when stuck (same failure twice, hypotheses exhausted), before a pivot or an irreversible move, and before declaring a multi-step task done — then reconcile its advice against your evidence. Also use when the user asks for an advisor, a second opinion, or to check with a smarter model. Routine diff review belongs to a reviewer; a multi-advisor debate belongs to council-mode.
---

# Consult

You are the **executor**: you hold the tools, the evidence and the decisions. The **advisor**
is a model the human picks, called at a few checkpoints to look at your trajectory with fresh
eyes. It reads, it does not write; it advises, it does not decide. Its value comes from three
things — a stronger model, deeper thinking, and a perspective not worn down by your own
context — and every rule below protects them.

Loading this skill is the operator's standing authorization for **read-only advisor runs at
the checkpoints below**. It authorizes nothing else: no worker, no writer, no fan-out.

## When to consult

A consult earns its cost only at a **checkpoint** — a moment where a wrong turn is expensive
and a second mind can still change it.

| Checkpoint | Trigger | Why then |
| --- | --- | --- |
| **approach** | You have oriented (read the relevant files, know the constraints) and are about to make the first substantive write on non-trivial work | Cheapest point to change direction; the advisor now has evidence to work with |
| **stuck** | The same failure twice, two hypotheses disproven, or you are circling | Your own context is the likeliest cause; a fresh view breaks the loop |
| **pivot** | About to abandon the approach, overturn an earlier decision, or widen scope | Pivots are where silent drift from the human's intent happens |
| **irreversible** | Before a migration, a deletion, a public-contract change, a security-sensitive change | The human gate still applies — consult first so you bring the human a checked plan |
| **done** | The deliverable is durable (written, built, tested) and you are about to call it done | Last cheap chance to catch a missed requirement |
| **asked** | The user asks for an advisor, a second opinion, or "check with a smarter model" | Their question becomes the packet's question |

Skip the consult when a command can settle the question — run the test, read the file, check
the docs. **Evidence beats advice.** Skip it for lookups, mechanical edits, one-file fixes and
anything you could finish in the time the packet takes to write.

Budget per task: **one consult per checkpoint, one follow-up per consult, three consults in
total** unless the human asks for more. A second `stuck` consult on the same problem is the
last one — after it, the problem goes to the human.

## Run the loop

Each step ends when its completion criterion holds.

1. **Orient first** — the advisor judges evidence, so gather it: the files involved, the
   error text, the command output, the constraints the human stated.
   *Done when:* you can state your current plan and the one decision you are unsure of.
   "What should I do?" with no plan attached is not ready.

2. **Write the packet** — one question, your current plan, the evidence with `file:line` and
   raw output, what you already tried, the decisions the human already made, and the reply
   contract. Templates per checkpoint are in `references/packet.md`.
   *Done when:* the packet names **one** decision, carries its evidence inline, and a stranger
   could tell what a useful answer looks like.

3. **Ask the human for the model** — the advisor's model is the human's choice, never
   yours. Before the first consult of the session, list `subagent({ action: "models" })` and
   ask with `ask_user_question`: which model, and which thinking level. The first option is
   always `deepseek/deepseek-flash` marked as the default. Reuse the answer for the rest of the
   session; ask again only when the human wants to change it. When no one can answer (a
   non-interactive run, where `ask_user_question` is absent), use `deepseek/deepseek-flash`
   and say so in the ledger. The exact question is in `references/routing.md`.
   *Done when:* the human picked a model and a thinking level, or the non-interactive default
   is recorded.

4. **Dispatch** — call the advisor on the chosen model:

   ```ts
   subagent({
     agent: "oracle",                // alias: "advisor"; read-only, thinking high
     context: "fork",                // inherits this session; use "fresh" when your trajectory is the suspect
     model: "<chosen provider/id>:<level>",
     task: "<the packet>"
   })
   ```

   It runs in the background. Keep doing work the answer does not touch — more reading, a
   test run — but do not start the step the question is about. If it asks you something
   through `contact_supervisor`, answer from facts you hold; a question that is really the
   human's goes to the human, not answered by guess.
   *Done when:* you hold the advisor's full reply and its run id.

5. **Reconcile** — read the verdict line first, then weigh each recommendation against your
   evidence: accept, adapt, or reject, with a one-line reason each. A conflict with your
   evidence earns **one** follow-up to the same advisor (`subagent({ action: "resume", id,
   message })`); after that, evidence settles facts and the human settles judgement calls.
   Full rules in `references/reconcile.md`.
   *Done when:* every recommendation has a disposition and a reason, and a `rethink` or
   `blocked` verdict has changed your plan or reached the human.

6. **Record** — keep a one-line ledger entry per consult: checkpoint, question, verdict,
   disposition, and the model it ran on. It goes into your final report to the human; inside
   an `agents-team` run it also goes into `inbox.log`.
   *Done when:* the final report carries the ledger, and no advice is presented as your own
   finding or as verification.

## Verdicts

The packet asks the advisor to open with one of these; read it before anything else.

| Verdict | Meaning | Your move |
| --- | --- | --- |
| `proceed` | The plan is sound as stated | Continue; note any small risks it named |
| `adjust` | Sound direction, specific corrections | Apply the corrections that survive reconcile, then continue |
| `rethink` | The approach or a premise is wrong | Stop; re-plan from the named premise; one follow-up if you disagree |
| `blocked` | A decision only the human can make | Put that decision to the human, with the options and the advisor's view |

A reply with no verdict line is read as `adjust`, and the missing line is noted in the ledger.

## Hard rules

1. **Advice is a claim, not evidence.** A factual claim the advisor makes ("that function is
   never called", "the API retries by itself") is checked before you act on it, when a check
   is cheap.
2. **The human outranks the advisor.** Advice that contradicts the human's instructions, the
   project's `AGENTS.md`/`CLAUDE.md`, or an approved scope is surfaced to the human, never
   followed silently.
3. **The advisor stays read-only.** If the working tree changed during a consult and you did
   not change it, stop and find out why before continuing.
4. **You are the only voice to the human.** Relay the advisor's view as "the advisor
   recommends X because Y", attributed, and only where it bears on a decision the human owns.
5. **Advice is not verification.** "The advisor agreed" never closes a task — a test, a
   gate, or a reviewer's reproduced output does.
6. **No verdict shopping.** One consult per checkpoint. Re-asking until the answer suits you
   turns the advisor into an echo of your own bias.

## Red flags — stop and correct

- Consulting before orienting, so the advisor has nothing but your guess to judge.
- Asking a question that one command would have answered.
- A packet with three questions in it — the advisor answers the easiest one.
- Pasting the advisor's reply to the human as a status report.
- Following a `rethink` silently, or ignoring it silently — both hide a decision.
- A scope expansion from the advisor quietly entering the plan.
- Consulting at every step until the checkpoints mean nothing and the bill does.
- The `done` consult launched before the deliverable was written, tested and saved.
- Treating a second opinion on the same model at the same thinking level as a stronger one.

## Read next

| File | Read it when |
| --- | --- |
| `references/packet.md` | Writing the packet: fields, the reply contract, one template per checkpoint |
| `references/reconcile.md` | Weighing advice, handling conflict with your evidence, the follow-up, escalation |
| `references/routing.md` | Choosing the advisor's model and context, persistent settings, other harnesses |

Related skills: `council-mode` (ships with `pi-subagents`) when a decision is material enough
to want 2–3 advisors cross-examined; `agents-team` when the work itself needs teammates —
there the lead still uses this skill for its own decisions; `code-review-and-quality` for a
routine quality judgment on a diff, which is a reviewer's job, not an advisor's.
