# Adapter: DSH

Dispatch is a family of `subagent*` tools, one per role posture; messaging, status and
interruption are separate tools. DSH is the harness this skill was originally written for, and
`VALIDATION.md`'s rounds 1 and 2 were measured here.

**Everything below is carried over from the DSH-era copy of this skill and the round-2
validation record. None of it has been re-verified against a running DSH session** — check the
capability table against your actual tool list at step 0 before you trust a row.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `subagent` (fresh) or `subagent_fork` (carries this conversation); `subagent_scout` / `subagent_prober` / `subagent_critic` for the role-scoped variants |
| `identity` | the returned child id; store it in `members[].agentId` |
| `parallel-spawn` | several dispatch calls in one assistant message |
| `status` | `list_agents` — `children` for the team, `descendants` for the whole tree |
| `steer` | `send_message` to a direct continuable child |
| `stop` | `interrupt_agent` — a brake, not a kill switch; see the edges |
| `gate` | **absent.** DSH enforces role posture through preset `toolFilter`, not through a host-run command |
| `raise` | `send_message` upward from a resident continuable child |
| `fresh-context` | the default; `subagent_fork` is the opt-in that copies the conversation |
| `fan-out` | no packaged equivalent recorded — run lanes as parallel dispatch calls |
| `isolate` | none recorded — keep territories disjoint by brief and check the diff |

## Role dispatch

Role separation here is real but comes from a **user preset**, not from the dispatch call.
Round 2 provisioned `~/.dsh/.agent-presets/team/` with three role-scoped tools:

| Role | Dispatch | What the preset removes | Still only the brief |
| --- | --- | --- | --- |
| scout | `subagent_scout` | `write`, `edit` absent from the child's catalog; persona fixed | `pwsh` can still write — send it to a scratch copy |
| prober | `subagent_prober` | `write`, `edit` absent; persona fixed | that it is not the author; the lead's diff check stays the backstop |
| critic | `subagent_critic` | `write`, `edit` **and** `pwsh` absent — it cannot change a byte | it also cannot run anything, so a dynamic claim it makes is unverified by construction |
| builder, scribe | `subagent` / `subagent_fork` | nothing beyond the brief and the task's territory | its territory; the lead's scope check |

**The preset has to be composed by a new top-level session.** Children join their parent's
composition, so a session already running on `standard` cannot use the `team` preset. If the
role tools are not in your tool list, you are not on that preset: run the team with plain
`subagent` and say in the human report that role separation was instruction-level only.

## No gate: the lead is the verifier of record

Same consequence as Claude Code, for a different reason. A `toolFilter` proves a prober
*could not* edit; it does not prove the acceptance command ran or what it printed.

So: the prober re-runs the acceptance commands and reports raw output, and **the lead re-runs
the task's `verify` commands itself** before the batch lands. Say in the human report which
checks the lead ran and that none was harness-enforced.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| `send_message` reaches a direct continuable child from its parent, and a direct parent from a resident child. Siblings and deeper descendants are not targets. | Hub-and-spoke; the lead is the only message bus and relays everything. |
| `send_message` returns acceptance (a `messageId`) and **never a reply**. | One-way traffic. A teammate answers in its own next turn or not at all. Never block waiting for an ack. |
| A working target receives the message at its nearest step boundary; an idle target starts a turn. | Steering works while they work; you do not have to stop them to redirect. |
| `interrupt_agent` stops only the current turn. Queued messages stay parked, descendants keep running, the child stays available. | After interrupting, decide explicitly whether to re-send the parked message. |
| `list_agents` states: `running` = working, `idle` = resident between turns, `ready` = storage only. | A `ready` teammate is **not** a finished one. |
| A background child's settlement notice is the main report channel; its transcript is the detail. | Read the notice, then the artifact. Do not ask for a summary you already have. |
| Delegation depth defaults to 3, and the team is depth 1 below the lead. | Keep nesting at ≤2: a teammate spawns help only if the lead chartered it in the brief. |
| `maxDepth` on a role tool is the child's **absolute** depth ceiling, not its own budget. | `maxDepth: 0` refuses every call. A role child that may exist at depth 1 and go no further needs `1`. |
| The human can open any teammate from the session header and stop it independently. | You are not the only brake; say so when the work is long or risky. |

## Model routing

Round 2 added a `subagent-model-selection` section to `~/.dsh/settings.yaml`. It is sampled
when a **fresh top-level session** is composed, so enabling it does not affect a session that is
already running. Record the route each teammate actually used in `members[].model`.

## Verified / not verified

Verified on DSH in 2026-09: the messaging, interrupt and status semantics above (rounds 1–2 of
`VALIDATION.md`), and the preset's static structure — the round-2 checker resolved every plugin
name, the role personas, the filters and the `maxDepth` semantics, with a negative control.

Never verified, on DSH or anywhere: **the preset has never been composed.** Role separation in
round 1 was instruction-level; nothing proves a prober *cannot* write, only that it did not.
Model routing has never been exercised. And this whole file is a port — the tool names came from
the DSH-era copy of the skill, not from a session running today.
