# Running a whole stage through the `workflow` tool

A team is persistent, addressable and steerable. A workflow is the opposite: one script,
many short-lived children, no mid-run steering, one JSON result at the end. Use each for what
it is good at.

Reach for `workflow` when a **single stage** of the plan is a fan-out:

- an audit over many files or modules,
- N independent review angles over one artifact, then a judge,
- the same mechanical migration applied to N items,
- cross-checking one claim against several sources.

The tool's own policy is to be used when the human asked for a workflow or for large
orchestration, so say which stage and why before you call it. Do not wrap a whole team project
in one workflow: nothing inside can be re-briefed, corrected, or asked a question.

## What a workflow cannot do

| Limit | Consequence |
| --- | --- |
| The parent turn waits for the whole run | Never put a stage in a workflow that the lead needs to steer |
| Children's intermediate messages never reach the lead | Design each child to fail loudly in its structured result instead |
| No capability modes | "Read-only" is an instruction in the prompt, not a sandbox; verify with a diff afterwards |
| Failure resolves to `null` per item (throwing hooks excepted) | Always `.filter(Boolean)` and count what came back |
| Result text is capped (default 50 000 chars) | Return summaries and file paths, not full transcripts |
| `agent()` options are `label`, `phase`, `provider`, `model` only | No persona, no tool filter, no depth control |

Schema rules are strict: an object at the root, using only `type`, `properties`, `required`,
`additionalProperties`, `items`, `enum`, `const`, `oneOf`. Misusing a hook or an unsupported
schema kills the whole script rather than degrading one item.

## Shape that works

Phases, then parallel reviewers, then one judge that keeps only evidenced findings — the
pattern that survives contact with self-reports:

```js
phase("review");
const angles = ["safety", "flow", "tests"];
const schema = {
  type: "object", required: ["findings"], additionalProperties: false,
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "severity", "file", "evidence", "problem", "requiredFix"],
        additionalProperties: false,
        properties: {
          id: { type: "string" }, severity: { type: "string" }, file: { type: "string" },
          evidence: { type: "string" }, problem: { type: "string" }, requiredFix: { type: "string" },
        },
      },
    },
  },
};

const found = await parallel(
  angles.map((angle, i) => () =>
    agent(`${BRIEF}\nYOUR ANGLE: ${angle}\nRead the files; do not answer from memory. Report this angle only.`, {
      label: `review:${angle}`, phase: "review", schema,
    }),
  ),
);

phase("judge");
const verdict = await agent(
  `You are the judge. Drop every finding you cannot confirm in the current files.\n` +
  `Reports: ${JSON.stringify(found.filter(Boolean))}\n` +
  `Verdict is "pass" only if no high or medium finding survives.`,
  { label: "judge", phase: "judge" },
);

return { angles: angles.length, reported: found.filter(Boolean).length, verdict };
```

Rules that keep it honest:

- Put the shared briefing in one string, then append the per-item instruction. The brief must
  be self-contained: workflow children do not see this conversation.
- Ask for `evidence` (command, output, `file:line`) in the schema. A finding without evidence
  is dropped by the judge.
- Give the judge the artifact, not just the reports; it must be able to refuse a claim.
- Return counts alongside conclusions, so a silent `null` is visible.
- Write the judge's prose verdict into `reports/<task-id>-<role>.md` and record
  `verdict`/`attempt` in `team.json`; the workflow's JSON result is not durable state.

## Feeding the result back into the team

A workflow stage is one task in `team.json` with `kind: "review"` (or `verification`) and
`assignee` set to `stage:<name>`; the lead is the one who reads the returned JSON, writes the
report file, and decides whether the next task is a re-brief, a fresh builder, or a human
question. Nothing about the workflow's success makes a *task* pass — a prober still owns the
acceptance verdict for anything that ships.
