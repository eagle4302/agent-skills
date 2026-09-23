# Validation record — agents-team

> **This record was produced on DSH, not on pi.** It is kept verbatim because rewriting a
> validation record to match a different harness would falsify it. Read it with that in mind:
> tool names in it (`subagent_scout`, `send_message`, `list_agents`, `interrupt_agent`, `pwsh`,
> presets) are DSH's, and the instructional files in this copy have been translated to
> `pi-subagents` while this file has not.
>
> | What it covers | Carries over to pi? |
> | --- | --- |
> | `scripts/team.mjs` behaviour — schema, batches, baseline, the log audit, the CRLF and `stage:` fixes | **Yes.** It is plain Node and touches no harness API; re-verified from the pi path on 2026-09-23. |
> | `team.json` / `board.md` / `inbox.log` formats and the commit-batch rules | **Yes.** Nothing in them is harness-specific. |
> | The RED/GREEN behaviour runs (rounds 1–2) | **Partly.** They show the skill changes what a lead does; they were run on DSH children, not pi ones. |
> | Role separation via preset tools | **No.** That preset does not exist here. pi uses agent profiles plus a host-run `gate`; neither has been measured. |
> | Messaging, steering, status, interrupt semantics | **No.** Rewritten for `pi-subagents` from its own docs, and **not yet exercised on a real run.** |
>
> Owed on pi: one real team run using `subagent` dispatch, a `gate`, a steer, and a stop, with
> the numbers written up here as a new round.

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

## Round 3 — commit batching (2026-09-23)

Triggered by a real defect, not a hypothetical: the skill had no git step anywhere. `commit`
appeared in five places, all of them prohibitions. The seven-step loop never raised the gate,
so every run ended as one uncommitted blob.

Evidence from a real run on `MetalAutoUQDwpf`: team `ssc-batch1` (10 members, 37 tasks, 31 of
them implementation, 4 builders on disjoint territories) landed as commit `1b524c1` — **206
files, +27646 / −7967**. Its own objective says `lead integrates uncommitted on master`. The
last non-team commit before it was 29 files.

Changed: `schema` 2 with `baseline` (git sha, branch, already-dirty paths) and `commitPolicy`
(`mode`, `authorized`, `authorizedAt`, `messagePrefix`); `commitGroup`/`commitSha` per task;
`team.mjs baseline` and `team.mjs batch`; `commit` added to the `inbox.log` kinds; the
authorization asked once at charter instead of never.

Verified on this machine:

| Check | Result |
| --- | --- |
| `node --check scripts/team.mjs` | passes |
| 6 existing boards re-validated | no new error or warning from the schema-2 checks; schema 1 boards get one informational line and skip them |
| `init` → `baseline` on a scratch git repo | recorded `master @ 2830890` and both already-dirty paths |
| `status` / `batch` on a two-territory board | `builder-a ready`, `builder-b blocked t2:unverified` |
| Landing the ready batch by pathspec | commit contained `src/a/a.cs` only; `untracked-by-human.txt` stayed loose in the tree |
| Prose in `inScope` (`src/b/** (only the parser bits)`) | flagged `! not pathspecs` instead of emitting a wrong `git add` |
| `commitSha` with `authorized: false` | ERROR, exit 1 |
| `phase: closed` with a batch still open | WARN naming the count |

Not verified: no full team run has used the new path end to end — the numbers above come from
a synthetic board and a scratch repo, not from teammates actually working. `per-task`,
`single` and `none` modes are validated but never exercised on a real run.

## Round 4 — known failures, house rules, bookkeeping (2026-09-23)

Four gaps found in the same review, fixed together.

1. **A failure that predates the team was scored as the team's.** On this machine the repo's
   own build always ends at `VerifyDecodeModels` (the models are hand-placed and untracked), so
   a prober running the charter's `verify` command reports FAIL, the lead burns attempt 1 on a
   re-brief and attempt 2 on an escalation, for nothing. Added `baseline.verifiedClean`
   (`unknown` | `clean` | `known-failures`) and `baseline.knownFailures[]`
   (`command`, `symptom`, `why`), an `ALREADY BROKEN` block in every brief, and a ladder row
   saying such a failure never increments `attempt`.
2. **Briefs carried no project conventions.** A spawn child never reads `CLAUDE.md` or
   `AGENTS.md`, so build flags and line-ending rules reached nobody. Added `houseRules[]`, a
   `HOUSE RULES` block in the brief skeleton, and a warning when the repo has one of those
   files while `houseRules` is empty.
3. **Three dangling skill references.** `dispatching-parallel-agents`,
   `subagent-driven-development` and `verification-before-completion` exist nowhere on disk or
   in the plugin marketplace cache. Removed; `ssh-captain` was verified present and kept.
4. **`validate` never checked the log.** Added `inbox.log` accounting: a staffed member with no
   `brief` line, a member with a done task and no `report` line, a landed sha with no `commit`
   line. Gated to live boards so archived ones stay quiet.

Verified on this machine:

| Check | Result |
| --- | --- |
| `node --check` | passes |
| 6 existing boards re-validated | error counts unchanged (35 / 4 / 0 / 0 / 43 / 0); the 3 boards at `phase: closed` gained no warnings |
| `baseline` on a repo with `CLAUDE.md` + `AGENTS.md` | named both and listed what is still owed by hand |
| `verifiedClean: "known-failures"` with an empty list | ERROR, exit 1 |
| `knownFailures[1]` missing `symptom` | ERROR naming the index |
| Re-running `baseline` after filling them in | `verifiedClean`, `knownFailures` and `houseRules` all survived |
| Empty `houseRules` while the repo has convention files | WARN naming the files |
| Staffed member with no `brief`/`report` line | 2 WARNs; both cleared after two `team.mjs log` calls |
| Free-form log (4 of 9 lines parseable) | WARN says so first, so the rest are not read as missing entries |

Not verified: same limit as round 3 — none of this has run inside an actual team.

## Round 5 — the vocabulary was the bug (2026-09-22)

Round 4's bookkeeping check reported that `loader-speed-ceiling-…` had a 155-line `inbox.log`
that was "mostly prose", with five of six teammates missing a brief or report. **That reading
was wrong, and so was the check.** 147 of those 155 lines are correctly shaped; the board just
uses a richer `kind` vocabulary than the protocol had — 32 `note`, 24 `verified`, 23 `action`,
8 `task`, 7 `decision`, 6 `verdict`, 6 `report`, 5 `steer`, 4 `finding`. The validator dropped
every line whose kind was not one of its seven and then blamed the board.

Fixed in the skill, not in the board:

| Change | Why |
| --- | --- |
| `LOG_KINDS` gained `note`, `finding`, `verified`, `decision`, `action` | a log of only lead↔teammate traffic cannot explain one decision; real boards write mostly these |
| `LOG_ALIASES` normalises `task`→`brief`, `question`/`問`→`human`, `ruling`→`decision`, `blocker-adjacent`→`block`, and 7 more | the vocabulary already in use is not wrong, only unlisted |
| Kind token is split on `:`/`：` | real lines write `task：implement t3` |
| A line must start with an ISO date to count | wrapped summaries were being parsed as log lines |
| "never reported" now accepts `verdict`, `finding` or `block` | a prober's output *is* a verdict; demanding `report` was wrong |
| Malformed-shape and unknown-kind are two separate warnings | conflating them blamed the board for a parser limit |

Effect on that board: 10 warnings → 3 real gaps (`prober-backend` had no brief and no report,
`critic-contract` had no brief). Those three were backfilled from evidence that exists on disk
— `team.json` assignees and `agentId`s, and `reports/t5-prober-backend.md` (mtime
2026-09-20T18:49Z) and `reports/t6-critic-contract.md` (18:48Z) — each line marked `[重建]`,
timestamped when it was written, not backdated. Nothing about the *content* of those briefs was
reconstructed, because nothing on disk records it.

Also found on that board and **not** fixed (reported to the human instead, it is their call):
`phase` still `staffing` while tasks are `done`; `t8` and `t12` point at evidence files that do
not exist; `reports/` holds four files (`t9`, `t10`, `t13`, `t14`) for tasks absent from
`team.json`.

Regression after all of it: 6 boards, error counts unchanged (35 / 4 / 0 / 0 / 43 / 0).

Lesson worth keeping: a validator that finds a vocabulary it does not know should say so in
those words, not report the data as missing.

## Round 6 — the CRLF bug, found by using the tool (2026-09-22)

Reconciling that board turned up a defect in round 4's own code. The `inbox.log` reader did
`.split('\n')`, which leaves a `\r` on every CRLF line, and the parse pattern ends `(.*)$` —
and JavaScript's `.` does not match `\r`. So **every Windows-written line failed to parse** and
was counted as unreadable. On a mixed-ending file it silently dropped 5 of the 12 lines under
examination. Fixed to `.split(/\r?\n/)`. This is a Windows-first repo; the bug would have
misreported every board written here.

Reconciliation of `loader-speed-ceiling-…`, all of it evidence-led:

| Source | Used for |
| --- | --- |
| `board.md` (2026-09-20T23:57, newer than `team.json`'s 19:05) | the 15-row task table: subjects, owners, deps, verdicts |
| `reports/*.md` on disk | verdicts re-read from the files themselves, not from the board's prose |
| `inbox.log` lines 59/80/91 and 116/122/123/134/135 | transcribing the two reports that were gone |

- Added `t9`, `t10`, `t13`, `t14`, `t15`; `t8` and `t12` moved to `done`; `prober-backend` and
  `critic-contract` retired; `critic-contract` given the territory it never had; `taskSeq` 13→15.
- `phase` set to `integrating`, **not** `closed`: `t7`'s own subject includes `archive`, and the
  directory is still in `.agent-teams/`, not `.agent-teams/archive/`. The board said "done"; the
  filesystem said otherwise, and the filesystem wins.
- `reports/t8-prober-hmi-round2.md` and `reports/t12-builder-hmi.md` were genuinely lost — absent
  from the repo, every worktree, and unrecoverable because `.agent-teams/` is gitignored. They
  were rebuilt from `inbox.log` following the convention this board already used for `t9`, `t10`
  and `t14`: a header naming the transcription, the exact source lines, and a closing section
  listing what the transcription does *not* contain.
- 12 `inbox.log` lines had summary text sitting in the `kind` slot. Repaired by inserting the
  kind or splitting it off the `to` field; verified by reconstructing each expected line —
  12/12 as intended, the other 149 lines byte-identical.

Result: that board went from `0 error(s), 14 warning(s)` to `0 error(s), 1 warning(s)` (the
remaining one is the schema-1 notice). Regression across all 6 boards: error counts unchanged
(35 / 4 / 0 / 0 / 43 / 0).

Lesson worth keeping: the two tasks with no surviving evidence were the ones worth the most
attention. Reconstructing them was only defensible because the board had already established
how to mark a transcription — and because what could not be recovered was written down as
missing rather than quietly filled in.

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

