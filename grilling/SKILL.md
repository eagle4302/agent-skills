---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Closed questions: ask with the harness's ask tool

A frontier question is sometimes **closed**: pick one of N, yes/no, a number. When the session has an interactive ask tool, put those questions there so the user clicks an option instead of typing, and leave the **open** ones — a title, a rationale, a free-form design — in the markdown round. The two are one round: same numbering, same recommended answer, with your pick listed **first** and marked `(Recommended)`, so the dialog and the markdown never drift apart.

Read the tools this session actually has and match the first row that fits. Never guess from the machine: one machine can carry several harnesses at once.

| Harness | Ask tool |
| --- | --- |
| pi | `ask_user_question` |
| Claude Code | `AskUserQuestion` |
| OpenCode | `question` |
| GitHub Copilot | `vscode_askQuestions` |
| Grok Build | `ask_user_question` |
| Codex CLI | `request_user_input` — Plan mode only; absent in Default/Code mode |
| an unlisted harness | whichever tool takes a list of questions, each with `options`; if there is none, ask in markdown |

No ask tool — an unlisted harness, or a non-interactive run where it is absent — is not a reason to drop the question: ask it in the markdown round exactly as above. The tool is a convenience; the round is the contract. Never answer a question for the user because the dialog was missing.
