# team preset — role-scoped delegation for DSH 0.2.1-rc.2

`team.patch.yml` registers six presets as a profile patch layer:

| Preset id | Display name | What it is |
| --- | --- | --- |
| `team` | 團隊模式（Agents Team） | the shipped `standard` composition plus an `agent_preset` allowlist on `subagent` — the lead |
| `team-scout` | 團隊 · 偵查 scout | read-only reconnaissance; `dsh-tool-fs` mounted with `write: false, edit: false` |
| `team-builder` | 團隊 · 實作 builder | full file and shell tools, no delegation |
| `team-prober` | 團隊 · 驗收 prober | verifier: no `write` / `edit`, keeps the shell for acceptance commands |
| `team-critic` | 團隊 · 審查 critic | no shell at all; cannot change a byte or run a command |
| `team-scribe` | 團隊 · 文件 scribe | file tools only, for board and hand-off prose |

## Install

The preset list is a profile patch layer; the app reads it at startup. The desktop app boots
`profiles\desktop` — `profiles\web` belongs to the `dsh` CLI, which is a different install and
never sees this patch.

```powershell
# 1. append team.patch.yml's `- insert:` block to the desktop profile's user patch
notepad "$env:USERPROFILE\.dsh\profiles\desktop\cordis.patch.yml"

# 2. restart the DeepSeek Harness app, then start a NEW session on 團隊模式（Agents Team）
```

A session's composition is fixed when it is created: an existing session keeps the preset it
started with, so the preset picker only offers presets to a session that has produced nothing.

The five role presets also appear in the picker. Do not start a session on one — they exist to
be selected per child through `agent_preset`; a session on `team-critic` would be a coding
session that can neither write nor run anything.

## What the role tools change

Roles are enforced by what the preset **mounts**, not by filtering a catalog afterwards.

| Row | Effect |
| --- | --- |
| `dsh-tool-fs` with `write: false, edit: false` | `write` and `edit` are not registered at all — there is no tool to call |
| no `dsh-tool-bash` / `dsh-tool-pwsh` row | no shell, so the critic cannot run anything |
| no `dsh-tool-subagent` row | a teammate cannot recruit its own helpers |

The shell is *not* sandboxed. `toolFilter` used to remove the file tools but never the shell;
the same limit applies here — scout and prober keep a shell that can write, so "read-only"
means "no file tools", and the lead's diff check stays the backstop. Only the critic is
non-mutating by construction.

## Verify

```powershell
node ..\scripts\check-team-preset.mjs `
  --modules "$env:USERPROFILE\.dsh\profiles\node_modules" `
  --install "$env:USERPROFILE\.dsh\profiles\desktop\cordis.patch.yml"
```

Checks that the patch parses, that every role declares the right mounts, that the lead's
`allowedAgentPresets` matches the declared role ids and `maxDepth` is 1, that the lead still
carries every row of the shipped `standard` preset, and that the installed profile patch holds
all six rows.

`preset/reference/standard-0.2.1-rc.2.patch.yml` is the drift baseline, extracted from
`app.asar`. Refresh it after a DSH upgrade; the checker reports any shipped row the lead is
missing.

## Runtime state

Static checks pass; **the composition has never been mounted by a live 0.2.1 session.** The
first real check is a new session on 團隊模式 with `agent_preset` visible in the `subagent`
schema, and a scout child that has no `write` tool.
