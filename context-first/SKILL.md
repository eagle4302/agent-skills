---
name: context-first
description: Context-first order for any dev task — CodeGraph for code structure, TypeSafe Jev for narrow typed judgments, the Obsidian vault for recorded decisions, then plan and edit. Use at the start of a coding task, when locating or understanding code, when a pick-one / yes-no / score call comes up, or when a past decision or gotcha may already be written down.
---

# Context first

Look things up before reasoning them out. Each lookup has one tool; reach for it first and fall back only when it comes back empty.

## Order

1. **Code → CodeGraph.** Call `codegraph_explore` (MCP) with the symbols, files, or question. One call returns verbatim source, callers, and blast radius; treat it as a Read. For one symbol's caller/callee trail, run `codegraph node <name>` in the shell. Pass `projectPath` when the MCP tool has no default project. With no `.codegraph/` index in the repo, skip this step. Done when the symbols you will touch and their dependents are in view.
   - Fall back to Read / Grep / Glob for: non-code files, a repo with no `.codegraph/` index, text CodeGraph does not index (log strings, config values), or a symbol it returned nothing for.
2. **Narrow judgments → Jev.** A choice with a fixed answer set goes to Jev — see the next section. Done when every fixed-answer choice in this turn has a Jev answer, or a stated reason it does not qualify.
3. **Recorded knowledge → Obsidian.** When the repo has a vault (the project's `AGENTS.md` may carry the path → vault mapping), search it before explaining a design, a past decision, or a known trap: `obsidian vault="<name>" search query="<terms>" limit=10` (Obsidian must be running; `vault=` is a parameter; `search:context` adds matching lines). On Windows run CJK queries through PowerShell — Git Bash mangles them into an empty result. Read the hits and build on them. Done when you can say which note covers it, or that none does.
4. **Plan and change code.** Only now design, decide, and edit, citing what steps 1–3 returned.

Skip a step that has nothing to look up; the order still holds for the steps you take.

## Jev

Jev fits a **narrow** judgment: one label from a list, yes/no on a stated condition, a score on a described scale. Examples: which skill or tool fits this request, which folder a note belongs in, which ticket label applies, is this task done per its stated acceptance list, how hard is this task on a 1–5 scale.

If you are about to do one of these without looking it up, stop and call Jev:

- pick one from a fixed list (tool, skill, folder, label, owner)
- answer yes/no on a stated condition (does this ticket meet its acceptance list?)
- give a 1–5 score or rank a short list

A minimal request:

```json
{"state":{"issue":"Login page breaks in Safari"},"model":"jev-latest","questions":{"label":{"type":"choice","instructions":"Which label fits this issue?","criteria":{"bug":"broken behavior","feature":"new capability","none":"nothing fits"}}}}
```

For a yes/no question use `noul`; it carries no separate confidence, only the returned probability:

```json
{"state":{"ticket":"..."},"model":"jev-latest","questions":{"meets":{"type":"noul","instructions":"Does this ticket meet its stated acceptance list?"}}}
```

- Runner and exit codes: `AGENTS.md` → Jev 優先. The schema bits that actually bite: `type`, `instructions` and `criteria` sit **directly under the question** — wrapping them in a `choice` object returns 422; a `choice`'s `criteria` is an object (a list returns 422), a `score`'s is an array of level descriptions. Design the questions with the `typesafe-ai` skill when it is available.

  ```bash
  curl -sS -X POST https://api.typesafe.ai/v1/systemone \
    -H "Authorization: Bearer $TYPESAFE_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary "@request.json"
  ```

  ```powershell
  curl.exe -sS -X POST https://api.typesafe.ai/v1/systemone `
    -H "Authorization: Bearer $env:TYPESAFE_API_KEY" `
    -H "Content-Type: application/json" `
    --data-binary "@request.json"
  ```

- Gate at 0.6 as `AGENTS.md` says. Read the field correctly first:
  - `confidence` is **not** the top probability. TypeSafe rescales the peak by the number of options — all the probability on one option is 1, an even split is 0 (Choice: `(p_max − 1/n) / (1 − 1/n)`). So 0.6 means different top probabilities at different option counts: ≈ 0.8 with two options, ≈ 0.68 with five. Threshold on the same field everywhere; read `probabilities` when the number itself matters.
  - A **`noul` answer carries no `confidence`**. Gate on the probability it returns: near 0.5 means it is genuinely unsure, not "medium".
  - A **`score` answer** returns `score` as a 0–1 position across the levels plus a `legend` mapping index → level text. Report the level, not the fraction.
- The exclusion list (design, debugging, multi-step reasoning, safety/risk/destructive/deploy calls) lives in `AGENTS.md` → Jev 優先; when a call lands on it, decide yourself and say so.

### Batch classification

For many items (files, symbols, tests, tickets) against one fixed label set:

1. Sort out the **rule-decidable** items first: anything a path, namespace, extension, or name pattern settles (everything under a `*.Tests` project is a test) gets its label by rule, with no Jev call.
2. For the rest, build each item's one-line description from CodeGraph — kind, name, signature, a short summary of what it does — rather than its full source; Jev sees only what is in `state`.
3. One request per chunk: `state.items` maps an id to its description; `questions` has one `choice` per id with the same `criteria` (label → meaning, plus `none`). **Each question's `instructions` must name its own item by path — `` `items.<id>` ``.** A shared instruction with no path makes every answer identical: measured 2026-10-18, 20 items with one shared instruction returned the same label 20/20 at ≈0.57 confidence; the same 20 with the path returned 5 different labels, 3 of them under 0.6. Chunks of 20 work; the per-request limit is untested.
4. Read each answer's `choice` and `confidence`. `confidence` ≥ 0.6 → accept; below it, or `none` → a review list that the agent judges item by item, handing the user any that stay unclear.
5. Report counts per label, how many came from rules vs Jev, and the review list.

Measured 2026-10-14: 3 items in one request, all correct, 0.36 s, 641 input tokens. Measured 2026-10-18: 20 items, 5.7 k input / 1.2 k output tokens, 0.34 s — batching saves round-trips, not tokens, because `criteria` repeats per question.

## Writing back

When a task lands an important decision, a finished piece of work, or a trap that cost time, offer in one line to record it in the vault, naming the note it would go in. Wait for the user to agree before writing unless the repo's own instructions already require that write, then use the `obsidian-markdown` skill (`obsidian:obsidian-markdown` when installed as a Claude Code plugin) plus the repo's own vault conventions (its `CLAUDE.md` / `AGENTS.md`).
