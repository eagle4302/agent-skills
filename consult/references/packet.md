# The consultation packet

The packet is the `task` you hand the advisor. A forked advisor can read the whole session,
but a long session buries the one thing you need judged; the packet points at it. A `fresh`
advisor sees nothing else, so the packet must carry everything.

## Fields

| Field | Required | What goes in it |
| --- | --- | --- |
| `Checkpoint` | yes | `approach`, `stuck`, `pivot`, `irreversible`, `done` or `asked` |
| `Question` | yes | **One** decision, phrased so it has an answer: "A or B, and why?", "What does this plan miss?" |
| `Goal` | yes | The human's request in their own words — quoted, not paraphrased, when context is `fresh` |
| `Current plan` | yes | What you intend to do next, as numbered steps |
| `Evidence` | yes | `file:line` references, raw error text, command output with numbers — trimmed to the lines that matter |
| `Tried` | stuck, pivot | Each attempt and what disproved it |
| `Decided` | when any | Choices the human already made; the advisor treats these as fixed |
| `Constraints` | when any | Project rules, deadlines, compatibility, "no new dependencies" |
| `Reply contract` | yes | Copied verbatim from below |

Keep the packet under ~60 lines. When evidence is larger — a long log, a full diff — give the
path and the line range and let the advisor read it.

## Reply contract

Paste this at the end of every packet:

```text
Reply contract:
- First line exactly: VERDICT: proceed | adjust | rethink | blocked
- Then your normal sections, at most 3 bullets each. Mark every factual claim you did not
  verify yourself as (unverified).
- Answer the Question first; anything beyond it goes under "Also noticed", at most 3 items.
- Omit "Suggested execution prompt" unless the Question asks for one.
- Do not edit files. If you need a decision from me, ask with contact_supervisor.
```

The `(unverified)` mark tells you which claims to check before acting (see `reconcile.md`).
The "Also noticed" cap stops a good answer from being buried under a review of everything.

## Templates

### approach

```text
Checkpoint: approach
Question: Is this the right approach for <goal>, and what is the biggest risk in it?
Goal: "<human's request, quoted>"
Current plan:
1. ...
2. ...
Evidence:
- src/auth/session.ts:40-72 — token refresh lives here; called from 3 places (list them)
- `npm test` baseline: 212 passed, 0 failed
Decided: <e.g. "keep the public API unchanged" — human, earlier in session>
Constraints: <project rules that bear on this>
<Reply contract>
```

### stuck

```text
Checkpoint: stuck
Question: Why does <symptom> persist after <last fix>, and what should I test next?
Goal: "<request>"
Symptom (raw):
  <exact error text / failing assertion, trimmed>
Tried:
1. <hypothesis> → <what I changed> → <result, with output>
2. ...
What I currently believe: <your model of the bug, stated plainly so it can be attacked>
<Reply contract>
```

State your current belief explicitly. The advisor's best work on a `stuck` consult is
naming the premise that is false, and it can only attack a premise you wrote down.

### pivot

```text
Checkpoint: pivot
Question: Should I abandon <approach A> for <approach B>?
Why A is failing: <evidence>
What B changes: <files, contracts, scope>
Earlier decisions B would revise: <list — or "none">
<Reply contract>
```

### irreversible

```text
Checkpoint: irreversible
Question: What could go wrong with <action>, and is the rollback real?
Action: <exact command or change>
Blast radius: <what it touches: data, users, other services>
Rollback: <exact steps, and whether they have been tested>
<Reply contract>
```

The human's approval is still required after this consult. The consult makes the question
you bring them sharper; it does not replace it.

### done

```text
Checkpoint: done
Question: Does this deliverable meet every requirement? Name anything missed or wrong.
Goal: "<request, quoted in full>"
Requirements, as I read them:
1. ... → met by <file:line> / <test name>
2. ...
Verification run: <commands and their real output, with numbers>
Not verified: <what you did not check, and why>
<Reply contract>
```

Save and test the deliverable before this consult. An advisor judging a half-written result
reviews your intentions, not your work.

### asked

Use the user's question as `Question`, then add whichever fields above the question needs.
If the user's question bundles several decisions, split it and consult on the one that
matters most; tell the user which one you chose.
