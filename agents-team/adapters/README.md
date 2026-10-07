# Adapters: the same team on a different harness

Everything outside this folder is harness-neutral. It talks about **capabilities** — spawn,
gate, steer, stop — and never about tool names. This folder is where the tool names live, one
file per harness, and nothing else in the skill hardcodes them.

**Read exactly one adapter, at step 0, before you staff anything.**

## Pick yours

Look at the tools this session actually has and match the first row that fits:

| If the session has | You are on | Read |
| --- | --- | --- |
| a `subagent` tool taking `agent` + `task` | pi (`pi-subagents`) | `pi.md` |
| a `subagent` tool taking `agent` + `description` + `prompt`, with an `execute` tool beside it | OpenCode | `opencode.md` |
| a `task` tool taking `agent_type` + `prompt`, with `list_agents` / `read_agent` / `write_agent` beside it | GitHub Copilot | `github-copilot.md` |
| `subagent_scout` / `send_message` / `list_agents` | DSH | `dsh.md` |
| an `Agent` tool taking `subagent_type` + `prompt` | Claude Code | `claude-code.md` |
| none of the above | an unlisted harness | the rest of this file |

Do not guess from the machine, the shell or the repo: a machine can have all of them installed
at once, and this one does. The tool list in front of you is the only evidence.

## The eleven capabilities

The neutral files assume these by name. An adapter's job is to say, for each one, what the
call is here — or that it does not exist, so the degradation in `protocol.md` applies.

| Capability | What the team needs it for |
| --- | --- |
| `spawn` | start a teammate from a self-contained brief |
| `identity` | get back something that names that teammate afterwards |
| `parallel-spawn` | start several in one turn so they genuinely run at once |
| `status` | ask who is running and what they have done so far |
| `steer` | redirect a teammate that is still running |
| `stop` | end a run that is looping or out of territory |
| `gate` | a **host-run** command whose failure rejects the teammate's result |
| `raise` | the teammate reports a blocker before it finishes |
| `fresh-context` | the teammate does **not** inherit the lead's conversation |
| `fan-out` | many short-lived lanes in one call, one composite result |
| `isolate` | a writing teammate gets its own worktree |

Two of them decide how much team is even possible. Without `gate` the lead becomes the
verifier of record; without `parallel-spawn` the main reason to staff more than one teammate
is gone, and the sizing ladder drops a rung.

## Writing an adapter for a harness that has none

Fill the same five sections the shipped ones use, and do not invent a row:

1. **Capability table** — the eleven above, each with the exact call or `absent`.
2. **Role dispatch** — which agent profile or subagent type each of `scout`, `builder`,
   `prober`, `critic`, `scribe` maps onto, and what the profile already gives you.
3. **Edges** — the harness facts that change how a team is run (when a steer lands, whether
   children can address each other, budgets, depth limits).
4. **Gate** — how a host-run check is expressed, or how the lead substitutes for it.
5. **Verified / not verified** — which rows you read out of the harness's own docs or tool
   schemas, and which you are assuming. Mark the assumptions. A wrong row here is worse than a
   missing one, because the neutral files trust it.

Read the harness's own tool reference for those rows. If you cannot, say so in the adapter and
run the team at the degraded level `protocol.md` prescribes rather than guessing a call.
