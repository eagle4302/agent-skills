# Adapter: DSH

Dispatch is a family of `subagent*` tools; messaging, status and interruption are separate
tools. Roles are not separate tools: the lead's `subagent` takes an optional `agent_preset`
naming a preset that this repo ships.

Verified against **DSH 0.2.1-rc.2**, the desktop app (`resources/app.asar/dsh`), on 2026-10-18.
The `dsh` executable on `PATH` is a **different, older install (0.1.5-rc.2)** that shares
`~/.dsh`; its `--dump-config` composes the 0.1.5 packages and cannot be used to check this
adapter. See "Two installs" under the edges.

## Capabilities

| Capability | Call |
| --- | --- |
| `spawn` | `subagent` (fresh context), `subagent_fork` (copies this conversation) |
| `identity` | the returned child id; store it in `members[].agentId` |
| `parallel-spawn` | several dispatch calls in one assistant message; each returns immediately |
| `status` | `list_agents` — `children` for the team, `descendants` for the whole tree |
| `steer` | `send_message` to a direct continuable child |
| `stop` | `interrupt_agent` — a brake, not a kill switch; see the edges |
| `gate` | **absent.** No host-run command decides whether a teammate's result is accepted |
| `raise` | `send_message` upward from a resident continuable child |
| `fresh-context` | the default; `subagent_fork` is the opt-in that copies the conversation |
| `fan-out` | `workflow` — one call runs `agent()` lanes through `pipeline` / `parallel` with a composite result |
| `isolate` | **absent.** A teammate shares the working tree; disjointness is the brief plus the lead's diff |

## Role dispatch

Round 2 of `VALIDATION.md` used three role-named tools (`subagent_scout`, …) mounted from a
user preset directory. **That mechanism is gone in 0.2.1**: the preset declaration is a plugin
row, and the subagent tool rejects `persona` / `toolFilter` with a migration error. Roles now
come from the child's **preset**, selected through the lead tool's `agent_preset` field.

| Role | Dispatch | Enforced by | Still only the brief |
| --- | --- | --- | --- |
| scout | `agent_preset: team-scout` | the composition mounts `dsh-tool-fs` with `write: false, edit: false` | the shell is still mounted, so "read-only" is a file-tool fact, not a sandbox |
| builder | `agent_preset: team-builder` | full file and shell tools; no delegation rows | its territory |
| prober | `agent_preset: team-prober` | no `write` / `edit`; keeps the shell to run acceptance commands | that it is not the author |
| critic | `agent_preset: team-critic` | no shell and no `write` / `edit`: it cannot change a byte or run a command | a dynamic claim it makes is unverified by construction |
| scribe | `agent_preset: team-scribe` | file tools only, no shell | it writes what the lead hands it |

A role preset carries **no delegation rows**, and the lead's `subagent` sets `maxDepth: 1`, so a
teammate cannot recruit its own helpers. A plain `subagent` call with no `agent_preset`
inherits the lead's own composition, which is the right default for a one-off errand.

`fork` rejects preset selection (`agentPreset` / `allowedAgentPresets`) — forked children always
inherit the parent's composition.

## Preset install

`preset/team.patch.yml` in this repo is a profile patch layer. It registers five role presets
and one lead preset; the lead is the shipped `standard` composition plus an `agent_preset`
allowlist on the `subagent` row.

```powershell
# append the patch's `- insert:` block to the profile's user patch, then restart the app
notepad "$env:USERPROFILE\.dsh\profiles\web\cordis.patch.yml"
```

The preset list is read when a session is created, and the composition is fixed for that
session's life. A new preset therefore needs **a new top-level session**, not a new turn; after
editing the profile patch, restart the app. A preset that cannot mount is listed with its
reason rather than hidden, so a broken row shows up in the picker instead of failing silently.

## Gate

The harness has no gate. A read-only composition proves a prober *could not edit*; it does not
prove the acceptance command ran or what it printed.

So: the prober re-runs the acceptance commands and reports raw output, and **the lead re-runs
the task's `verify` commands itself** before the batch lands. Say in the human report which
checks the lead ran and that none was harness-enforced.

## Edges that shape how a team is run

| Fact | Consequence |
| --- | --- |
| **Two installs.** The desktop app is 0.2.1-rc.2; `dsh` on `PATH` is 0.1.5-rc.2. Both read `~/.dsh`. | Edit the profile patch both would see, but judge the result in the app. `dsh --dump-config` reflects the 0.1.5 packages, not the running GUI. |
| `send_message` reaches a direct continuable child from its parent, and a direct parent from a resident child. Siblings and deeper descendants are not targets. | Hub-and-spoke; the lead is the only message bus and relays everything. |
| `send_message` returns acceptance, never a reply. | One-way traffic. A teammate answers in its own next turn or not at all. Never block waiting for an ack. |
| A working target receives the message at its nearest step boundary; an idle target starts a turn. | Steering works while they work; you do not have to stop them to redirect. |
| `interrupt_agent` stops only the current turn. Queued messages stay parked, descendants keep running, the child stays available. | After interrupting, decide explicitly whether to re-send the parked message. |
| `list_agents` states: `running` = working, `idle` = resident between turns, `ready` = storage only. | A `ready` teammate is **not** a finished one. |
| `backgroundMode: continuable` on both spawn and fork rows. | A settled child can take more work through `send_message`; the lead can reuse a builder instead of respawning one per ticket. |
| A background child's settlement notice is the main report channel; its transcript is the detail. | Read the notice, then the artifact. Do not ask for a summary you already have. |
| Delegation depth defaults to 1 below the lead, and the team preset sets `maxDepth: 1` explicitly. | A teammate cannot spawn; keep nesting at ≤2 in briefs. |
| The human can open any teammate from the session header and stop it independently. | You are not the only brake; say so when the work is long or risky. |

## Model

A teammate runs on the model the human specified for it, and on the lead's model when the human
specified none. The resolution order is the harness's own; the lead does not route on its own
initiative. Per-call `provider` / `model` / reasoning effort on `subagent` is the human's
channel, and it exists only because the lead preset sets `modelSelectionSettings: true`; use it
when the human named a route for this run, and quote them in `inbox.log`. Record what a member
actually ran on, and where the route came from, in `members[].model` — audit, not routing.

## Verified / not verified

Verified on 0.2.1-rc.2 on 2026-10-18, by reading the shipped package sources and docs inside
`app.asar`:

- the `agent_preset` / `allowedAgentPresets` contract, and that `persona` / `toolFilter` throw;
- `dsh-tool-fs` switches `read` / `readImage` / `write` / `edit`, so a read-only role is a
  composition fact;
- the preset registry takes plugin rows, not directories, and failed definitions stay visible;
- the 0.2.1 `standard` composition this repo's lead is built from, row by row (32 rows).

**Not verified:** the team preset has never been mounted by a live 0.2.1 session. The first
real check is a new session on 團隊模式（Agents Team） with `subagent` showing `agent_preset` in
its schema. Until that is seen, treat role separation as designed, not proven.
