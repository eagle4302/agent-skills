# Routing the advisor

An advisor is only an advisor if it brings something you lack. In order of value:

1. **A stronger model** — where the harness allows a per-call model.
2. **Deeper thinking** — the same model at its highest reasoning level.
3. **A clean perspective** — a fresh context, or a fork of a completed trajectory when the record
   itself is the evidence; a fork still inherits your completed turns and misses only the in-flight
   one.

The same model, at the same thinking level, reading the same context, is a mirror. Say so in the
ledger if that is all the harness offers.

## Dispatch by harness

Look at the tools this session actually has; never guess from the machine.

| Harness | Fresh (default) | Fork | Follow-up |
| --- | --- | --- | --- |
| DSH | `subagent({ description, prompt })` | `subagent_fork({ description, prompt })` | `send_message` to the child id |
| pi + `pi-subagents` | `subagent({ agent: "oracle", context: "fresh", task })` | same with `context: "fork"` | `subagent({ action: "resume", id, message })` |
| generic subagent tool | the tool's fresh variant, strongest available model | the tool's fork variant, when it has one | a second call carrying the transcript |
| no subagent, or delegation is depth-capped (a delegated child cannot spawn) | — | — | answer the packet yourself as a hostile reviewer; the ledger says **self-review** |

The packet (`packet.md`) is the `prompt`/`task` string in every row, and nothing else crosses the
boundary. A harness may list a subagent tool and still refuse the call at depth 0: treat a refusal
as the last row, not as a reason to guess.

## Pick the context

| Context | Use when | The packet must |
| --- | --- | --- |
| fresh (default) | every checkpoint — `approach`, `stuck`, `pivot`, `irreversible`, `done`, `asked` | Carry everything: goal quoted, evidence, decisions |
| fork | the completed trajectory itself is what must be judged — a `done` check or audit of a long task where a short packet would lose the decisive detail | Restate this turn's evidence anyway: a fork does not see the in-flight turn |

A fork inherits the reasoning that produced the move you are asking it to judge, so on `approach`,
`pivot` and `irreversible` the history is the bias, not the evidence. The fork buys fidelity, not
independence; a fresh consult with a tight packet is usually sharper.

## Pick the model

- **DSH**: no per-call model and no read-only advisor profile. The advisor runs on the session's
  model with a fresh (or forked) context. That still earns the call when a wrong premise is
  expensive; record `model: session` in the ledger. If the human wants a stronger model, run the
  consult in a session on that model — do not pretend to switch.
- **pi + `pi-subagents`**: the human picks the model and thinking level once per session. List the
  available models with the harness's own model list and ask with its ask tool; keep the question
  to two fields (model, thinking level) and the first option the cheapest default. Build the run
  string as `provider/id:level`. Never pin the model in settings: a per-run choice wins, and a pin
  invites skipping the question.
- **Generic harness**: use the strongest model the tool exposes, and record it.

## Ask the human

Ask only when the answer changes the dispatch: the model on pi, or whether to fork when the
evidence is already in the session. One question, once per session, through the harness's ask
tool. Field names are harness-specific — DSH's `ask_user_question` requires an `id` per question
and uses `multi_select`; the wrong names return a schema error, not an answer.

## Cost and time

- A strong model at maximum thinking is the most expensive call in a typical task. The
  three-consult budget in `SKILL.md` keeps it worth it.
- Bound the advisor with the packet and the reply contract, not a hard tool budget.
- A forked advisor re-reads your whole session; prefer fresh on a long session.

## When the advisor fails to run

Provider errors, rate limits and quota failures come back from that one call; nothing falls back
automatically.

- **pi**: ask the human which model to use instead (same dialog, failed model removed); in a
  non-interactive run, fall back to the cheapest available once and note it.
- **DSH**: retry once with the same packet; if it fails again, say so in the ledger and continue on
  your own judgement only where a wrong turn is cheap to undo.
- If no advisor can run, label the packet **self-review**, answer it yourself in a separate pass as
  a hostile reviewer, and never report it as an advisor.

## The advisor's report

The advisor opens with `VERDICT: proceed | adjust | rethink | blocked`, then at most three short
sections. If it needs a decision from the executor, it ends the reply with `QUESTION: <one line>`;
the reply is the only channel, so do not ask it to use a tool that may not exist.
