# Reconciling advice

The advisor's reply is input to **your** decision. Reconciling means every recommendation
leaves with a disposition and a reason, and nothing it said changes your plan without you
deciding that it should.

## Weigh each recommendation

Go through the reply one recommendation at a time:

| Disposition | When | Record |
| --- | --- | --- |
| **accept** | It holds against your evidence, and it fits the goal and the human's decisions | `accept — <why>` |
| **adapt** | The concern is right but the proposed fix does not fit (scope, constraints, codebase idiom) | `adapt — <what you do instead, and why>` |
| **reject** | It rests on a wrong fact, contradicts the human, or solves a problem you do not have | `reject — <the evidence or the rule>` |
| **defer** | Sound, but outside the current task | `defer — listed for the human` |

"Also noticed" items are **defer** by default. A deferred item enters the plan only when the
human says so.

## Check the claims first

Before acting on a recommendation, check the factual claims it stands on — especially any
marked `(unverified)`:

- "X is never called" → search for callers.
- "The library already handles Y" → read the source or the docs for the installed version.
- "The test covers Z" → read the test.

A claim that fails its check makes the recommendation a **reject**, and says so in the
ledger. Skip the check only when it would cost more than being wrong.

## Conflict with your evidence

When the advice contradicts something you have observed:

1. **Do not switch silently and do not ignore silently.** Either one hides a decision.
2. **Follow up once**, on the same advisor, with the conflict stated plainly:

   - **DSH**: `send_message({ target: "<child id>", message: "<conflict> ..." })`, closing with
     "Does Z change your recommendation? First line: VERDICT: ...". If the child is no longer
     addressable, send a fresh consult carrying the first reply and the conflict in the packet,
     and label it a fallback in the ledger.
   - **pi + `pi-subagents`**: `subagent({ action: "resume", id: "<advisor run id>", message: ...
     })`; check `subagent({ action: "children.list" })` first and resume only a run it lists as
     `resumable`.
   - **Any other harness**: a second call with the first reply and the conflict; label the
     fallback.
3. **After the follow-up**, settle it by kind:
   - a question of **fact** → evidence wins; run the command that decides it;
   - a question of **judgement** (tradeoff, scope, product intent) → the human decides; bring
     both positions, attributed, with your recommendation.

## By verdict

- **`proceed`** — continue. Record any risks it named; they are candidates for your `done`
  checklist.
- **`adjust`** — apply the corrections that survive the weighing above. Corrections are
  narrow by nature; one that rewrites the plan is really a `rethink` — treat it as one.
- **`rethink`** — stop the current step. Identify the premise the advisor says is wrong, check
  it, and re-plan from there. If you still believe the premise holds, that is a conflict: use
  the follow-up. A `rethink` you override must appear in the report to the human, with your
  reason.
- **`blocked`** — the advisor named a decision that is not yours. Ask the human: the decision,
  the options, the advisor's view, your view. Continue only on work that does not depend on
  the answer.

## Escalate to the human when

- the advisor and your evidence still disagree on a judgement call after the follow-up;
- the advice would change scope, a public contract, or anything the human decided;
- a second `stuck` consult on the same problem has not produced a working next step;
- the advisor raises a risk to data, security or users that the plan does not already cover.

Bring a short, decidable question: what is at stake, the options, which one you recommend.

## Report

The ledger goes into the final report, one line per consult:

```text
Advisor: 2 consults
- approach — "session refresh: patch in place or move to middleware?" → adjust;
  accepted "keep refresh in session.ts", rejected "add retry library" (no new deps, per you)
- done — "all 4 requirements met?" → proceed; flagged missing test for expired token → added
```

Attribute what the advisor contributed; keep your own findings as yours. Say which
recommendations you rejected — the human may weigh them differently than you did.
