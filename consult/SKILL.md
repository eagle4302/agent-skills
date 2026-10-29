---
name: consult
description: Consult a read-only advisor at decision checkpoints — before committing to an approach on non-trivial work, when stuck (same failure twice, hypotheses exhausted), before a pivot or an irreversible move, and before declaring a multi-step task done — then reconcile its advice against your evidence. Also use when the user asks for an advisor, a second opinion, or to check with a smarter model. The advisor runs in a fresh context; where the harness lets you pick its model, the human picks it. Routine diff review belongs to a reviewer.
---

# Consult

You are the **executor**: you hold the tools, the evidence and the decisions. The **advisor**
is a separate model call at a few checkpoints, looking at your trajectory with fresh eyes. It
reads, it does not write; it advises, it does not decide. Its value comes from a stronger model
or thinking level where the harness allows one, and from a perspective not worn down by your own
context. A fresh context alone still earns the call when a wrong premise is expensive — every
rule below protects that.

Loading this skill is the operator's standing authorization for **read-only advisor runs at
the checkpoints below**. It authorizes nothing else: no worker, no writer, no fan-out.

**Dispatch is harness-specific.** Read `references/routing.md` once per session and use the row
for the tools this session actually has; the loop, the packet and the reconcile rules do not
change.

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

3. **Pick the advisor's model — only where the harness offers one.** Where a per-call model
   choice exists (pi + `pi-subagents`), the human picks it once per session; ask with the
   harness's ask tool. Where it does not (DSH), the advisor runs on the session's model: say so
   in one line, offer to run the consult in a session on another model when the human wants a
   stronger one, and record `model: session` in the ledger. Never silently claim a stronger
   model.
   *Done when:* the model and thinking level are recorded, or "not selectable on this harness"
   is written down.

4. **Dispatch** — use the row in `references/routing.md` for the tools this session has. The
   default is a **fresh** context at every checkpoint: a fork inherits the reasoning that produced
   the move you are asking it to judge, which is the bias, not the evidence. Use a fork only when
   the completed trajectory itself is what must be judged (a `done` check on a long task), and
   restate this turn's evidence anyway. On DSH:

   ```js
   subagent({ description: "consult: <checkpoint>", prompt: "<the packet>" })        // fresh (default)
   subagent_fork({ description: "consult: <checkpoint>", prompt: "<the packet>" })   // fork
   ```

   DSH has no per-call model and no read-only advisor profile: the packet's first line says
   "read-only: do not edit files", and step 6 checks `git status --short` for violations. Keep
   the packet self-contained either way. It runs in the background; keep doing work the answer
   does not touch, but do not start the step the question is about.
   *Done when:* you hold the advisor's full reply and its child id.

5. **Reconcile** — read the verdict line first, then weigh each recommendation against your
   evidence: accept, adapt, or reject, with a one-line reason each. A conflict with your
   evidence earns **one** follow-up to the same advisor (`send_message` to the child id on DSH;
   `subagent({ action: "resume", id, message })` on pi); after that, evidence settles facts and
   the human settles judgement calls.
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
3. **The advisor stays read-only.** Where the harness has a read-only profile (pi's `oracle`),
   that is enforcement; on DSH the packet's first line is the only guard, and the `git status`
   check is the detection. If the working tree changed during a consult and you did not change
   it, stop and find out why before continuing.
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

Related skills: `agents-team` when the work itself needs teammates — there the lead still uses
this skill for its own decisions; `code-review-and-quality` for a routine quality judgment on a
diff, which is a reviewer's job, not an advisor's.
