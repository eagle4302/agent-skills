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

## What this validation does not cover

- The team rung was exercised once, on a 4-file sandbox job. Nothing here tests a multi-day run,
  a context loss and resume, `interrupt_agent` on a live teammate, or a human-gate breach.
- Failure paths were exercised by the prober (tamper copies) but not by the skill's own
  playbook: no deliberate "teammate goes silent", "two writers collide", or "attempt 2 reached"
  drill has been run.
- Role separation is instruction-level. The harness does not sandbox a teammate into read-only;
  nothing here proves a prober *cannot* write, only that it did not.
- Per-teammate model routing was never available in this profile (the `subagent` schema exposes
  no `provider`/`model`), so the `model: "inherited"` field is untested against a real override.
