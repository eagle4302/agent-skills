---
name: context-first
description: Context-first order for any dev task — CodeGraph for code structure, TypeSafe Jev for narrow typed judgments, the Obsidian vault for recorded decisions, then plan and edit. Use at the start of a coding task, when locating or understanding code, when a pick-one / yes-no / score call comes up, or when a past decision or gotcha may already be written down.
---

# Context first

Look things up before reasoning them out. Each lookup has one tool; reach for it first and fall back only when it comes back empty.

## Order

1. **Code → CodeGraph.** Call `codegraph_explore` (MCP) with the symbols, files, or question. One call returns verbatim source, callers, and blast radius; treat it as a Read. For one symbol's caller/callee trail, run `codegraph node <name>` in the shell. Done when the symbols you will touch and their dependents are in view.
   - Fall back to Read / Grep / Glob for: non-code files, a repo with no `.codegraph/` index, text CodeGraph does not index (log strings, config values), or a symbol it returned nothing for.
2. **Recorded knowledge → Obsidian.** When the repo has a vault (a folder with `.obsidian/`), search it before explaining a design, a past decision, or a known trap: `obsidian vault="<name>" search query="<terms>" limit=10` (Obsidian must be running; `vault=` is a parameter; `search:context` adds matching lines). On Windows run CJK queries through PowerShell — Git Bash mangles them into an empty result. Read the hits and build on them. Done when you can say which note covers it, or that none does.
3. **Narrow judgments → Jev.** A choice with a fixed answer set goes to Jev — see the next section.
4. **Plan and change code.** Only now design, decide, and edit, citing what steps 1–3 returned.

Skip a step that has nothing to look up; the order still holds for the steps you take.

## Jev

Jev fits a **narrow** judgment: one label from a list, yes/no on a stated condition, a score on a described scale. Examples: which skill or tool fits this request, which folder a note belongs in, which ticket label applies, is this task done per its stated acceptance list, how hard is this task on a 1–5 scale.

- Design the questions with the `typesafe:typesafe-ai` skill. Write `{state, model:"jev-latest", questions:{...}}` to a temp file and run `bash ~/.claude/hooks/jev.sh <file>`. A choice's `criteria` must be a dict (a list returns 422).
- Report the pick and its probability. Top < 0.6 or a failed call → decide yourself, say so, and ask the user when the choice matters.
- Keep these with Claude and the user: code design, debugging, multi-step reasoning, and any safety, risk, destructive-action, deploy, or go-live call.

### Batch classification

For many items (files, symbols, tests, tickets) against one fixed label set:

1. Sort out the **rule-decidable** items first: anything a path, namespace, extension, or name pattern settles (everything under a `*.Tests` project is a test) gets its label by rule, with no Jev call.
2. For the rest, build each item's one-line description from CodeGraph — kind, name, signature, a short summary of what it does — rather than its full source; Jev sees only what is in `state`.
3. One request per chunk: `state.items` maps an id to its description; `questions` has one `choice` per id with the same `criteria` (label → meaning, plus `none`). Start with chunks of about 20 items; the per-request limit is untested.
4. Read each answer's `choice` and `confidence`. `confidence` ≥ 0.6 → accept; below it, or `none` → a review list that Claude judges item by item, handing the user any that stay unclear.
5. Report counts per label, how many came from rules vs Jev, and the review list.

Measured 2026-10-14: 3 items in one request, all correct, 0.36 s, 641 input tokens.

## Writing back

When a task lands an important decision, a finished piece of work, or a trap that cost time, offer in one line to record it in the vault, naming the note it would go in. Write after the user agrees — or right away when the repo's instructions already require that write — and use the `obsidian:obsidian-markdown` skill plus the repo's own vault conventions (its `CLAUDE.md` / `AGENTS.md`).
