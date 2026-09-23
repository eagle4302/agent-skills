# Routing the advisor

An advisor is only an advisor if it brings something you lack. In order of value:

1. **A stronger model** than the one you are running on.
2. **Deeper thinking** — the same model at `max` or `xhigh` where yours runs lower.
3. **A clean perspective** — `fresh` context, or a fork that has not been through your last
   hour of reasoning.

The same model, at the same thinking level, reading the same context, is a mirror. Say so in
the ledger if that is all you had.

## Ask the human for the model

The model is the human's call, every session. You never pick it, and you never pin it where
it would skip the question.

1. List what is available: `subagent({ action: "models" })`. Copy exact `provider/id`
   strings; bare ids resolve only when unique.
2. Ask once, before the first consult of the session, with `ask_user_question` — two
   questions in one dialog:

   ```ts
   ask_user_question({
     questions: [
       {
         header: "Advisor",
         question: "Which model should the advisor run on?",
         multiSelect: false,
         options: [
           { label: "deepseek-flash (default)", description: "deepseek/deepseek-flash — cheapest; a clean second look rather than a stronger mind" },
           { label: "deepseek-v4-pro", description: "deepseek/deepseek-v4-pro — stronger reasoning, about 3–4x the price of flash" },
           { label: "Same as this session", description: "The model you are talking to now — only the fresh perspective is new" }
         ]
       },
       {
         header: "Thinking",
         question: "How hard should the advisor think?",
         multiSelect: false,
         options: [
           { label: "high (default)", description: "oracle's own default" },
           { label: "max", description: "Deepest reasoning; slowest and most expensive" }
         ]
       }
     ]
   })
   ```

   Build the model options from the `models` list: `deepseek/deepseek-flash` always first
   and marked default, then up to two others worth offering (the strongest, and the
   session's own). The dialog adds a free-text row, so any other listed model stays
   reachable. Drop an option whose model is not in the list.
3. Turn the answer into the model string: `provider/id:level`, e.g.
   `deepseek/deepseek-flash:high`. A model only accepts the levels its provider maps — if
   one is rejected, check `thinkingLevelMap` in the model entry and ask the human again
   rather than picking a level yourself.
4. Reuse the choice for every consult in this session. Ask again only when the human says to
   change it, or when the chosen model fails to run (see below).
5. No answer possible — a non-interactive run, where `ask_user_question` is not in your
   tools: use `deepseek/deepseek-flash`, oracle's default thinking, and write "model:
   default (non-interactive)" in the ledger.

If a `subagents.maxThinking` ceiling rejects the level, use the highest level it allows and
note it in the ledger. Do not edit the ceiling.

## Pick the context

| Context | Use when | The packet must |
| --- | --- | --- |
| `fork` (default for `oracle`) | `approach`, `pivot`, `irreversible` — the history is the evidence | Point at the decision; history supplies the rest |
| `fresh` | `stuck` for the second time, a long session with drift, or a `done` check you want unanchored by your reasoning | Carry everything: the goal quoted, the evidence, the decisions — the advisor sees nothing else |

An explicit `context: "fork"` fails when the session is not persisted yet. Fall back to
`fresh` with a self-contained packet, and note it.

## Persistent settings

Do not pin `oracle` to a model in `settings.json` (`subagents.agentOverrides.oracle.model`):
the per-run `model` wins anyway, and a pin invites skipping the question.
`/subagents-models oracle` shows what pi has loaded right now.

## Cost and time

- An advisor run on a pro model at `max` thinking is the most expensive call in a typical
  task. The three-consult budget in `SKILL.md` is what keeps it worth it.
- Do not set a hard `toolBudget` on the advisor; bound it with the packet and the reply
  contract. A `timeoutMs` of 10–15 minutes is a sane ceiling for one consult.
- A forked advisor re-reads your whole session. On a very long session a `fresh` consult with
  a tight packet is often both cheaper and sharper.

## When the advisor fails to run

Provider errors, rate limits and quota failures come back from that one model; nothing falls
back automatically.

- Ask the human which model to use instead (same dialog, the failed model removed); in a
  non-interactive run, fall back to `deepseek/deepseek-flash` once, and note it.
- If no advisor can run, **say so** — in the ledger and to the human if the checkpoint was
  `irreversible` or `done`. Continue on your own judgement only for checkpoints where a wrong
  turn is cheap to undo.

## Other harnesses

The loop, the packet and the reconcile rules are harness-neutral. Only the dispatch changes:

| Harness | Dispatch |
| --- | --- |
| pi + `pi-subagents` | `subagent({ agent: "oracle", context, model, task })` as in `SKILL.md` |
| A harness with a native advisor tool | Call that tool at the same checkpoints; write the packet as your last message before the call so the advisor reads it first |
| A harness with a generic subagent tool (e.g. Claude Code's `Agent`) | Launch it with the strongest `model` option, the packet as the prompt, and "read-only: do not edit files" as the packet's first line; it starts fresh, so the packet must be self-contained |
| No subagent at all | Write the packet anyway, then answer it yourself in a separate pass as a hostile reviewer. Label it **self-review** in the ledger — it is not an advisor and must not be reported as one |
