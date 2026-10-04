# team preset — the role tools the skill delegates to

`agent.cordis.yml` is a full agent composition (the shipped `standard` preset plus three
role-scoped delegation tools). `preset.yml` is the picker metadata.

## Install

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\.dsh\.agent-presets\team" -Force
Copy-Item ".\*" "$env:USERPROFILE\.dsh\.agent-presets\team\" -Force
```

DSH scans `<dshHome>/.agent-presets` unmemoized, so a new **top-level session** sees the preset
without restarting the harness (a session already running keeps the composition it started with).
Pick **團隊模式（Agents Team）** in the preset picker.

## What the role tools change

| Tool | Denied tools | Effect |
| --- | --- | --- |
| `subagent_scout` | `write`, `edit` | read-only reconnaissance |
| `subagent_prober` | `write`, `edit` | independent verification, still able to run the acceptance commands |
| `subagent_critic` | `write`, `edit`, `pwsh` | cannot change a byte through any mounted tool |

Each carries a fixed `persona` (it shadows the deployment persona section for that child) and
`maxDepth: 1`, which is the *absolute* depth ceiling for the child — `resolveChildDepth` computes
`parentDepth + 1` and refuses above the cap, so `0` would refuse every call while `1` is what
"this teammate may not recruit its own helpers" actually costs.

`toolFilter` removes named tools; it does **not** sandbox the shell. The scout and prober keep
`pwsh`, so "read-only" for them means "no file tools" — only the critic is non-mutating by
construction. The skill's briefs therefore still send a prober to a scratch copy and the lead
still checks the diff.

## Verify

```powershell
node <skill>/scripts/check-team-preset.mjs --modules <checkout>/node_modules --preset <skill>/preset
```

Checks that every plugin row resolves, that exactly one tool owns model selection
(`list_subagent_models` is a global name), that each role tool has a persona and denies
`write`/`edit`, and that `maxDepth` is not `0`.

Runtime state: the composition has **not** been composed by a session yet — static checks pass,
and the acceptance test is listed at the end of `../VALIDATION.md`. Re-copy this directory after a
DSH upgrade only if `standard` gained rows the team depends on; the checker reports missing
shipped rows as drift warnings.
