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

**New checker** `scripts/check-team-preset.mjs` (DSH only — **deleted in the pi port**, because
the preset it checked does not exist here; the output below is the record of that round, not a
command you can run in this copy):

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

## Round 7 — what the validator was not checking (2026-09-23)

A second review pass, driven by running the script rather than reading it. Three defects, each
reproduced on a scratch board before it was fixed.

1. **A teammate could verify its own work and the board called it ready to commit.** A board
   where `t2` (verification of `t1`) was assigned to `builder-a`, who wrote `t1`, validated
   `0 error(s)` and `batch` printed `[ready] builder-a`. The skill's first hard rule was the
   one rule with no check behind it. `validate` now errors on it, and `commitGroups` no longer
   counts a self-authored `pass`, so that batch reports `[blocked] t1:unverified`.
2. **The territory-overlap check missed any glob with a non-trailing wildcard.** `globOverlap`
   trimmed a trailing `*` and compared prefixes, so two builders on `src/**/*.cs` and
   `src/core/**/*.cs` were reported disjoint. Four of six realistic overlapping pairs were
   missed. Replaced with segment-wise glob intersection (`**` spans any number of segments,
   wildcard segments compared by regex, wildcard-free directory patterns read as git reads a
   pathspec). Now 14/14 on a positive/negative suite; the sweep also covers every writing role
   (`lead`, `builder`, `scribe`, `ops`) instead of `builder` alone.
3. **An untouched `init` template passed validation.** The template marks each owed field with
   `REPLACE:`; nothing looked for them, so `SKILL.md`'s "run validate until it exits 0" was
   satisfiable by a board nobody had filled in. `validate` now errors, naming the fields.

Also corrected, from the harness's own docs rather than a run: `failure-playbook.md` told the
lead to cap a looping teammate with `toolBudget`, but `docs/tool-reference.md` says not to set
one on implementation workers or reviewers with edit authority — its default block list is
`read`/`grep`/`find`/`ls`, so capping a thrashing builder removes its ability to look things
up and leaves its ability to write.

Verified on this machine:

| Check | Result |
| --- | --- |
| `node --check scripts/team.mjs` | passes; file stayed CRLF throughout (0 stray LF-only lines) |
| Self-verifying board | was `0 error(s)`, now `FAIL` exit 1 with the error naming t2, builder-a and t1 |
| Same board, `batch` | was `[ready]`, now `[blocked] builder-a (t1) — t1:unverified` |
| Same board with an independent `prober-a` | `0 error(s)`, batch back to `[ready]` — no false positive |
| Duplicate error when `reviewedTaskId` and `dependencies` both name the task | fired twice, deduped, now 1 |
| `globOverlap` suite (8 overlapping, 6 disjoint) | 14/14 |
| `station-status-lights` (the one real board on this machine) | byte-identical before and after: 0 error(s), 3 warning(s) |

Not verified: still no full team run on pi. Everything above is a scratch board and a scratch
git repo.

Checked and found **correct**, so not changed: `protocol.md`'s spawn-budget claim
(`maxSubagentSpawnsPerSession`, `maxSubagentSpawnsPerRun`, `globalConcurrencyLimit` all exist)
and its `contact_supervisor` claim (the supervisor bridge defaults to `mode: "always"`, so the
tool is auto-added to children).

**Fourth defect, fixed in the same round: the documented `context` default was wrong.**
`SKILL.md`, `staffing.md` and `protocol.md` all said a spawned child is `fresh` by default, and
no dispatch example passed `context` at all. Read from the installed package: of the six
profiles this skill uses, `worker` (builder) and `oracle` (critic) declare
`defaultContext: fork`, and this machine sets no `defaultSubagentContext` to override them —
`scout`, `reviewer`, `evidence-auditor` and `delegate` are unset and do fall back to `fresh`.
So every builder and every critic was forking the lead's whole conversation: real tokens per
teammate, and on a critic it hands over the framing it was staffed to challenge. The
self-contained-brief and `houseRules` apparatus was built on a premise that held for four of
the six profiles.

Fixed by making `context` explicit rather than assumed: every dispatch example now carries
`context: "fresh"`, the profile table names the two that default to `fork`, `protocol.md` gained
an operating rule ("Say `context` out loud", rules renumbered 3–10), `staffing.md` gained a
third "what the profile does not give you" bullet, `members[].model` now records a deliberate
fork, and `SKILL.md` gained a red flag for an omitted `context`.

| Check | Result |
| --- | --- |
| Profile defaults re-read from `node_modules/pi-subagents/agents/*.md` | 2 of 13 profiles set `defaultContext: fork` — `worker` and `oracle` |
| `defaultSubagentContext` in this machine's pi settings | not set, so the agent defaults win |
| `subagent(` dispatch examples in the skill without `context` | was 8, now 0 (a multiline sweep; a single-line grep misses the `gate` example and finds only 7) |
| `protocol.md` operating rules after renumbering | 1–10, no gaps, no duplicates |
| Cross-references to a renumbered rule | none in the skill |
| Line endings on the four edited docs | CRLF preserved, 0 stray LF |

## Round 8 — one skill, three harnesses (2026-09-23)

Triggered by a fact, not a preference: **this skill exists in three drifted copies on this
machine**, and two of them hand the agent tool names that harness does not have.

| Copy | State when found |
| --- | --- |
| `.pi/agent/skills/agents-team` | the git repo; ported to pi-subagents, rounds 3–7 applied here |
| `.claude/skills/agents-team` | still DSH-era — "Teammates are DSH subagents", 8 mentions of `subagent_scout` / `send_message` / `list_agents`, none of which exist in Claude Code |
| `.dsh/skills/agents-team` | a third copy, already differing from the `.claude` one in 2 files |

So "should this be more abstract?" had a concrete answer: the failure was already happening,
and vague prose would not have fixed it — it would have deleted round 7's `context` fix, which
is only useful *because* it names a specific profile's specific default.

### What changed

A capability layer instead of abstraction. Everything outside `adapters/` names capabilities;
the tool names live in one file per harness.

- **`adapters/`** — `README.md` (how to pick, the eleven capabilities, how to write a new one),
  `pi.md`, `dsh.md`, `claude-code.md`. Each carries a capability table, a role-dispatch table,
  the harness's edges, how its gate works, and an explicit verified/not-verified section.
- **`protocol.md` rewritten** as the capability contract plus a **degradation table**: for each
  of the eleven capabilities, what its absence costs and what the lead does instead. That table
  is what makes portability honest rather than vague — no `gate` means the lead is the verifier
  of record, no `parallel-spawn` means the sizing ladder drops a rung.
- **`SKILL.md` gained step 0**, "Identify the harness", whose completion criterion is one
  `inbox.log` note naming the harness, whether there is a gate, and who is therefore the
  verifier of record. Steps 1–7 keep their numbers.
- `staffing.md`, `workflow-stage.md`, `failure-playbook.md` and `team-state.md` had their tool
  calls replaced by capability names, each with the no-capability branch stated inline.
- `scripts/team.mjs`: **unchanged**. It was already plain Node touching no harness API, which is
  why the board format survives a harness change at all.

### Verified on this machine

| Check | Result |
| --- | --- |
| Harness-specific token sweep outside `adapters/` and `VALIDATION.md` | 0 hits across all 6 neutral docs (`subagent(`, `subagent_*`, `contact_supervisor`, `children.list`, `workflowScript`, `runs.all`, `/parallel-*`, `toolBudget`, `defaultContext`, `send_message`, `list_agents`, `interrupt_agent`, `FleetView`) |
| `node --check scripts/team.mjs` | passes |
| `station-status-lights`, the one real board | 0 error(s), 3 warning(s) — unchanged through the whole restructure |
| Round 7's self-verification error | still fires: `FAIL`, 1 error |
| Round 7's template-placeholder error | still fires: `FAIL`, 1 error naming 9 fields |
| Every file path referenced from a doc | all resolve |
| Line endings on all 12 skill files | CRLF, 0 stray LF (the 4 new adapters were written LF and converted) |

### Cost, stated honestly

The restructure **does not save tokens**, contrary to what was predicted when it was proposed.
`SKILL.md` went 155 → 187 lines because step 0 is new; the neutral docs went 817 → 968, and the
four adapters add 325 more. A pi run now reads `SKILL.md` + `adapters/README.md` +
`adapters/pi.md` where it used to read `SKILL.md` alone.

What it buys: the skill stops being wrong on two of the three harnesses it is installed on, and
a fourth harness needs one new file rather than a fork. Runtime behaviour on pi is unchanged —
`adapters/pi.md` is round 7's content in a different location.

### Not verified

- **No team has been run on any harness since the restructure.** The neutral files and the pi
  adapter are a re-arrangement of content that was itself never exercised end to end.
- **`adapters/dsh.md` is a port, not a measurement.** Its tool names came from the DSH-era copy
  of this skill and the round-2 record, not from a DSH session running today.
- **`adapters/claude-code.md`** was read from live tool schemas in a Claude Code session, but no
  agent was dispatched from it. One row is explicitly an assumption: whether a Claude Code
  subagent inherits the project's `CLAUDE.md`.
- The other two copies on this machine were **not** touched — the human is reconciling those.

## Round 9 — teammates inherit the lead's model (2026-09-26)

**What changed.** Model routing is gone from the skill. Round 2 gave the lead the job of choosing a
route per teammate (`staffing.md`, then "Model routing") and round 2's DSH preset gained a
`subagent-model-selection` section to do the routing with. That is now a rule *against* routing:
every teammate runs on the lead's model, `members[].model` is an audit field rather than a routing
field, and the adapter notes refuse a dispatch `model`, `subagents.defaultModel`,
`subagents.agentOverrides.<name>.model`, and a per-agent `model:` line of a team.

**Why.** The human runs the lead on a model they chose; a per-lane route silently extends that
choice to work the human never saw. It also makes a team hard to reason about while it runs — the
same brief produces different work depending on who picked up the lane — and round 2 could not show
the routing had ever been exercised on any harness (`adapters/dsh.md`, round 2 "Not verified").
Removing an option is cheaper than proving one.

**Touched:** `references/staffing.md` (section rewritten), `references/team-state.md` (`model` field
note), `references/protocol.md` (operating rule 3), `adapters/pi.md` (new "Model: inherited, never
routed"), `adapters/dsh.md` (Model section, plus the not-verified line), `assets/team.json.template`.

**Verified here, on this machine (2026-09-26):** the installed `pi-subagents` pins no model in any
builtin agent — `agents/{worker,scout,reviewer,oracle,evidence-auditor,researcher,delegate}.md`
declare `thinking` and `defaultContext` only — so inheritance is already the default, and
`docs/agents.md:37` says the builtins "do not pin a provider model; they inherit your current Pi
default model unless you set `subagents.defaultModel` or
`subagents.agentOverrides.<name>.model`". `docs/tool-reference.md:101` is the dispatch-level `model`
option this rule refuses. `scripts/team.mjs` never reads `model`, so no code changed.

**Not verified:** nothing about a running team changed — this round removes an option rather than
adding one. A first real run must still confirm the `members[].model` ids are the lead's own model
(owed test 4 below).

## Round 10 — a specified model wins, otherwise inheritance (2026-09-26)

**What changed.** Round 9 made every teammate inherit the lead's model and forbade routing outright.
The rule is now: a teammate runs on the model a human specified for it, and on the lead's model when
nobody specified one. The lead still never routes on its own initiative — no dispatch `model` the
human did not ask for, no per-agent pin the lead picked, no harness auto-sampling. Resolution follows
the harness's own precedence (`docs/models.md`, "Precedence": per-run dispatch `model` > provider-scoped
role override > `agentOverrides.<name>.model` > agent frontmatter `model` > `subagents.defaultModel` >
parent session model) rather than a second order the skill invents. `members[].model` stays an audit
field and now records the route's source as well as its id.

**Why.** Round 9 was too strong in both directions. Blocking a human from asking for a model on one
teammate is a needless restriction; the failure mode it guarded against — a *lead* quietly spreading
its own choice onto work the human never saw — is still forbidden by "only the human specifies".
Defaulting to inheritance keeps the common case auditable, and a mixed-model run becomes a deliberate,
recorded exception.

**Touched:** `references/staffing.md` (Model section rewritten), `references/team-state.md` (`model`
field note), `adapters/pi.md` (Model section), `adapters/dsh.md` (Model section, not-verified line),
`adapters/claude-code.md` (Model note), `assets/team.json.template`.

**Verified on this machine (2026-09-26):** `pi-subagents/docs/models.md` states the precedence order
quoted above and `model: "inherit"` as the explicit parent selection; `docs/agents.md:37` says the
builtins "do not pin a provider model; they inherit your current Pi default model unless you set
`subagents.defaultModel` or `subagents.agentOverrides.<name>.model`", so inheritance is already the
default; `docs/tool-reference.md:101` is the dispatch-level `model` option, now permitted only with
the human's words behind it. `scripts/team.mjs` never reads `model`, so no code changed in any copy.

**Not verified:** no mixed-model run has been observed here — the rule is written from the installed
package and this session, not from a live team.

## Owed acceptance test (on pi, one real run)

Everything below is still unmeasured on this harness. The old version of this section was a DSH
preset drill (`subagent_scout` / `subagent_prober` / the 團隊模式 picker); none of that exists on
pi, so following it would have wasted a session. What is actually owed:

1. Charter a real two-territory team and run `baseline` on a dirty tree, then land one batch by
   pathspec and confirm `baseline.dirtyPaths` stayed out of the commit.
2. Dispatch one `worker` with a `gate` that fails, and confirm the host rejects the child's
   result rather than a model reporting the failure.
3. `steer` a running teammate and quote the steer receipt from `action: "status"`; then `stop`
   one and confirm it is gone from the fleet.
4. Record which `provider/id` each teammate actually ran on in `members[].model`, taken from
   `action: "models"` rather than guessed. Run it both ways: one teammate the human names a model
   for, one with nothing specified — the first must run on that exact id, the second on the lead's
   own model, and each `members[].model` entry must say which of the two it was.
5. Confirm on a live run that `context: "fresh"` actually reaches the child — dispatch one
   `worker` with it and ask the child whether it can see anything of the parent conversation.
   The profile defaults were read from the installed package, never observed in a run.

