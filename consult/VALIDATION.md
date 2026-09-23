# Validation record — consult

Run on 2026-09-24, pi 0.86.1 + pi-subagents 0.70.1, headless (`pi -p --mode json`). Every
number below comes from that run's JSON event log, not from memory.

## Scenario

A two-file sandbox (`api.mjs` with an uncached `fetchUser`, `test.mjs` with 2 checks). Prompt:
add caching — no network for a repeat within 60 s, concurrent calls share one request, errors
never cached — extend the test to prove all three, run it; "Load the consult skill and follow
it"; headless, so wait for the advisor before continuing.

## Result

| Signal | Observed |
| --- | --- |
| Skill loaded | `SKILL.md` read first, then all three references |
| Model question | `ask_user_question` absent (headless) → used `deepseek/deepseek-flash:high`, ledger says "default (non-interactive)" |
| Consults | 2 — `approach` (after orienting, before the first write) and `done` (after the suite was green) |
| Verdict line | Both present: `adjust`, then `proceed` (the first one was written as a `##` heading, not a bare line) |
| Reconcile | Advisor's timer claim checked with a spike before acting; 2 recommendations accepted, 3 items deferred to the human, none silently folded in |
| Advisor stayed read-only | `git status` afterwards: only `api.mjs`, `test.mjs` modified |
| What the advisor caught | A test gap: an id-blind in-flight map passed the whole suite; the executor mutation-verified the gap and added a check |
| Final suite | 8/8 `ok`, exit 0 |
| Cost | Parent $0.035, advisors $0.014 + $0.022; 19 parent tool calls |

## Not yet verified

- The interactive path: the `ask_user_question` dialog, the human's pick being reused across
  consults, and re-asking after a model failure. Needs one run in the pi TUI.
- `context: "fresh"`, the `resume` follow-up on a conflict, and a `rethink` / `blocked`
  verdict — none occurred in this scenario.
- A stronger advisor than the executor: both ran on `deepseek-flash`.
