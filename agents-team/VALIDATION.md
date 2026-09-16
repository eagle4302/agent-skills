# Validation record — agents-team

Written 2026-09-17 by the session that created the skill. Every number below comes from a
transcript on disk (`~/.dsh/sessions/<id>/session.v3.jsonl.zstd`) or from a file still present
under `%TEMP%\agents-team-validation\`, not from memory.

## Scenario (identical for RED and GREEN)

> Build a zero-dependency text utility package in `<sandbox>`: `slugify.mjs`, `truncate.mjs`
> (exact behaviours and edge cases specified), `feature.json` manifest, and `test.mjs` runnable
> with `node test.mjs`, exit 0 on pass. Run it, capture real output, report back. No network,
> nothing outside that folder.

The scenario is deliberately at the boundary: two independent modules that must agree with one
shared manifest, and a deliverable whose point is to be *verified*. GREEN-1 adds one line —
"Load the `agents-team` skill with the skill tool and follow it" — and nothing else.

## RED — baseline, before any skill file existed

Child `fee6400f` (origin `subagent`, depth 1), 7 tool calls: `pwsh`, `write`×4, `pwsh`×2.

| Signal | RED |
| --- | --- |
| Delegation (`subagent`/`workflow`/`ralph`) | 0 |
| Team messaging (`send_message`/`list_agents`/`interrupt_agent`) | 0 |
| Skill loaded | 0 |
| `.agent-teams/` state | none |
| Acceptance criteria as an artifact | none |
| Independent verification | none — the author mutated its own copy |

Verbatim from the RED report:

> 另外複製一份到暫存資料夾、故意把 `slugify` 的 `toLowerCase()` 拿掉，跑出 17 passed, 6 failed
> 且 `EXITCODE=1`，確認失敗路徑真的會非零退出（那份複本已刪除）。

Baseline rationalisation the skill has to defeat: *the job is small, so one agent writing and
verifying it in one pass is enough.*

## GREEN-1 — team path (child `bc51cf2c`, depth 1)

62 tool calls. Order starts `skill` → `todo_write` → charters/board writes → `pwsh` → then three
`subagent` calls **in one message** → steering, `list_agents`, `send_message`×4, integration.

| Signal | GREEN-1 |
| --- | --- |
| Skill loaded | yes (`agents-team`) |
| Teammates | 3 — `builder-modules` `3628374e` (37 calls), `builder-tests` `bc19c674` (31), `prober` `0f5eab83` (44) |
| Spawn shape | three `subagent` calls in one assistant message (parallel) |
| Lead's own hands-on work | 7 distinct paths written: `notes/local-contract.md`, `board.md`, `team.json`, `inbox.log`, `notes/run-notes.md`, `reports/t5-lead.md`, `work/README.txt` |
| `team.json` | validated by `scripts/team.mjs` (0 errors); 4 members, 5 tasks, verdicts recorded, archived to `.agent-teams/archive/deliver-textkit/` |
| Independent verification | prober wrote its own 32-assertion harness, re-ran the package, then tampered copies (16/21, exit 1) to prove the failure path |
| Human report | named the evidence per claim, the limits, and the one open question |

The team caught a **lead** error: the assertion table the lead froze said
`slugify("Ünïcödé Çafé")` → `"n-c-d-caf"`, which the stated rule cannot produce. Both builders
found it independently, refused to bend the code to the wrong table, and the lead amended the
contract (`notes/local-contract.md`, amendment A1). That is the second pair of eyes doing work
the RED run had no way to do.

## GREEN-2 — solo path (child `31e0373b`, depth 1), the REFACTOR test

Small job: one wrong operator in `adder.mjs`, `node check.mjs` failing, nothing else.
7 tool calls: `skill`, `read`×2, `pwsh`, `edit`×1, `pwsh`×2.

| Signal | GREEN-2 |
| --- | --- |
| Delegation | 0 |
| `.agent-teams/` created | no (confirmed on disk: `Test-Path` false) |
| Files written | `adder.mjs` only |
| Report | before/after raw output, the exact line changed, what was not verified |

It chose Solo, said why in the terms of the sizing table ("one file, one command, one
question"), and skipped team ceremony entirely. This is the behaviour the first draft was
missing; the sizing ladder in `SKILL.md` and "What to delegate, what to keep" in
`references/staffing.md` were added because of it.

## REFACTOR round

Two changes came out of the runs and one from the human:

1. **Adaptive sizing** (human request): the first draft's smallest rung was still "delegate one
   errand". Replaced with a five-rung ladder (solo → one helper → light team → full team →
   stage fan-out), push-up/push-down signals, an explicit "solo writes no `.agent-teams/`"
   rule, a working-lead rule in steps 3–4, hard rule 7 (scale down as fast as up), and two new
   red flags (over-staffing, idle lead).
2. **Delegation granularity and re-sizing** (`references/staffing.md`): what the lead keeps vs
   hands out, task-granularity rules, and merge/split/reassign/retire.
3. **Duplicate red-flag line** removed from `SKILL.md`.
4. **Closed teams stop nagging**: `validate` no longer warns "member owns no open task" or
   "attempt reached the escalation trigger" once `phase` is `closed` — an archived board was
   reporting noise as if it were a live problem. Re-verified: 13/13 validator checks still pass,
   and the archived GREEN manifest now reports 0 errors, 0 warnings.

Not yet re-run after these edits: GREEN-1's full team path (GREEN-2 ran against the *edited*
skill, so the solo rung is verified post-edit; the team rung is verified pre-edit — the edits
only relaxed the sizing rule, they did not touch the team loop).

## Validator checks (`scripts/team.mjs`)

13/13 passed, output recorded in the session; run with
`node team-tests.mjs` from the validation sandbox (`%TEMP%\agents-team-validation\tools\`).

Covered: `init` scaffolds; a good manifest passes; rejects implementation without acceptance;
rejects unknown assignee; rejects dependency cycle; warns on overlapping builder territory
(fails under `--strict`); rejects review without `reviewedTaskId`; rejects a `done` task whose
evidence file is missing; `status` renders; `log` appends; unknown command exits 2.

## Isolation — no repository was touched

`touched-paths.mjs` over the transcripts of every agent descended from this session:

- `fee6400f` (RED) wrote 4 files, all under `%TEMP%\agents-team-validation\sandbox-red\`.
- `bc51cf2c` (lead) wrote 7 files, all under `...\sandbox-green\`.
- `3628374e`, `bc19c674`, `0f5eab83` (teammates) wrote 11 files, all under `...\sandbox-green\`.
- `31e0373b` (GREEN-2) wrote 1 file, `...\sandbox-small\adder.mjs`.
- Git mutating commands issued by any of them: none.

`MetalAutoUQDwpf` shows two extra modified files (`ArmRemoteViewModel.cs`,
`PreLockPoseRunTests.cs`) that are **not** from this work: they are `arm-ui-dedup` territory,
owned by the separate session family under parent `session-03996ede`, whose child `17600aba`
was reading and staging exactly those paths at the same time. No new directory appeared in the
repository's `.agent-teams/`.

## Round 2 — role tools and model routing (2026-09-17, later)

Two capabilities the skill previously had to fake were moved into the harness.

**Role-scoped delegation tools.** New user preset at `~/.dsh/.agent-presets/team/`
(`preset.yml` + `agent.cordis.yml`, copied from the shipped `standard` preset and extended in the
`delegation` group): `subagent_scout`, `subagent_prober`, `subagent_critic`, each with a
`persona` string that shadows the deployment persona section and a `toolFilter.deny` list.

| Role tool | Denied tools | Effect |
| --- | --- | --- |
| `subagent_scout` | `write`, `edit` | cannot edit files through the file tools |
| `subagent_prober` | `write`, `edit` | same, and it keeps `pwsh` so it can run acceptance commands |
| `subagent_critic` | `write`, `edit`, `pwsh` | cannot change a byte by any mounted tool |

Mechanism, read from the code rather than assumed: `applyChildComposition`
(`dsh-subagent/lib/types/child-agent.js`) calls `childCtx.tools.restrict(composition.toolFilter)`
for the filter and registers the persona as the `deployment:persona-prefix` section.
`dsh-subagent-spawn-in-process` advertises `toolFilter` and `persona`, so the mount is accepted.

**A bug caught by reading the code**: `maxDepth` is the child's *absolute* depth ceiling, not the
child's own budget — `resolveChildDepth` computes `childDepth = parentDepth + 1` and throws
`SubagentDepthError` when it exceeds `maxDepth`. A first draft used `maxDepth: 0` on the role
tools, which would have refused every single call. Corrected to `1` (a role child may exist at
depth 1 and may not go further), and the checker now fails on `0` and warns above `1`.

**Model routing.** `~/.dsh/settings.yaml` gained the `subagent-model-selection` section
(namespace and schema read from `dsh-tool-subagent/lib/model-selection-settings.js`):
`enabled: true` with three allowed routes (`deepseek-flash`, `deepseek-v4-flash`,
`deepseek-v4-pro`). The setting is sampled when a **fresh top-level session** is composed, so
this session — and every session already running — keeps its recorded policy of "off".

**New checker** `scripts/check-team-preset.mjs`, run as
`node scripts/check-team-preset.mjs --modules <checkout>/node_modules --shipped <standard preset dir>`:

```
PASS  C:\Users\owner\.dsh\.agent-presets\team — 0 error(s), 0 warning(s)
  - preset metadata: 團隊模式（Agents Team）
  - composition: 34 rows
  - model selection owner: delegation/tool-subagent
  - role tools: 3 (delegation/tool-subagent-scout, delegation/tool-subagent-prober, delegation/tool-subagent-critic)
  - added row: tool-subagent-scout / -prober / -critic
  - model selection enabled with 3 route(s)
```

It resolves every plugin name against the installed modules, asserts a single model-selection
owner per scope (a harness rule: `list_subagent_models` is a global name), checks role personas,
filters and `maxDepth` semantics, and validates the settings section. Negative control: rewriting
the preset with `maxDepth: 0` produces three errors and exit code 1.

### Not verified in this round

- **The preset has never been composed.** Children join their parent's composition, so a session
  already running on `standard` cannot test the `team` preset; only a new top-level session can,
  and that is the human's action. Static checks pass; runtime behaviour is unproven until then.
- **Model selection has never been exercised.** It is off in this session by construction. The
  section validates against the plugin's own rules (enabled ⇒ at least one route, routes unique)
  and every listed route is in the adapter's catalog, but no call has carried `provider`/`model`.
- **`toolFilter` covers named tools only.** `pwsh` remains in the prober and scout, so "read-only"
  there means "cannot use the file tools", not "cannot write". Only the critic is non-mutating by
  construction. A shell-denied role is the honest name for the hard guarantee; the docs say so.
- **`persona` shadows the deployment persona prefix.** The role charter replaces the
  "You are a coding agent powered by ..." line for that child; whether that reads well for a
  teammate has not been observed in a live run.

## What round 1 does not cover

- The team rung was exercised once, on a 4-file sandbox job. Nothing here tests a multi-day run,
  a context loss and resume, `interrupt_agent` on a live teammate, or a human-gate breach.
- Failure paths were exercised by the prober (tamper copies) but not by the skill's own
  playbook: no deliberate "teammate goes silent", "two writers collide", or "attempt 2 reached"
  drill has been run.
- Role separation in round 1 was instruction-level (the team preset did not exist yet); nothing
  there proves a prober *cannot* write, only that it did not.
- Per-teammate model routing was not available while round 1 ran, so that round's
  `model: "inherited"` field is untested against a real override. Round 2 provisioned the
  capability; the test is still owed.

## Owed acceptance test (human, in a new session)

1. New session → preset picker → **團隊模式（Agents Team）**.
2. Ask for the delegation tools by name; expect `subagent`, `subagent_fork`, `subagent_scout`,
   `subagent_prober`, `subagent_critic`, plus `list_subagent_models` and `provider`/`model`/
   `reasoning_effort` on the generic `subagent` schema.
3. Spawn `subagent_scout` and `subagent_prober`, each asked to list its own file-editing tools;
   expect both to report none. Spawn `subagent_critic` and ask the same; expect it to have no
   shell either.
4. Spawn two teammates with different `model` values from the allowed routes; confirm both calls
   succeed and that the lead records the routes in `team.json`.
5. If step 2 shows no role tools, the preset did not compose — the picker lists a broken preset
   with its reason; report that reason rather than editing the preset blindly.

