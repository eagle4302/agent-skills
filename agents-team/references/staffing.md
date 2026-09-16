# Staffing: roles, charters, briefs

A role is a **prompt-level contract**, not a configuration. DSH configures `persona`
and `toolFilter` per *tool instance*, not per call, so a teammate becomes a builder or
a prober only because the brief says so and the lead checks the output against that
contract. Never assume a role is enforced by the harness.

## Roster

| Role | Mission | Produces | Must not |
| --- | --- | --- | --- |
| `lead` | Owns the board, the briefs, integration and the single human interface. Always the main session, never a spawned child. | `team.json`, `board.md`, the final report | Delegate its own accountability for what ships |
| `scout` | Read-only reconnaissance: map the terrain before anyone writes. | Facts with `file:line` citations, open questions, a recommended split | Write or edit any file |
| `builder` | Implement one workstream inside one territory. | Changed files + command output + evidence | Touch files outside its territory; declare its own work verified |
| `prober` | Independently re-run the acceptance commands against the frozen artifact. Never the author. | Per-criterion PASS/FAIL with raw output and a "not verified" list | Fix what it finds; edit source; accept a self-report as evidence |
| `critic` | Independent review on two axes: spec compliance and red lines. Used for high-risk work only. | Structured findings + `verdict` | Re-litigate decisions the human already made; edit files |
| `scribe` | Turn frozen facts into project documentation (docs, wiki, progress notes, vault). | Doc changes + which facts they came from | Invent claims nobody verified; write before the artifact is frozen |

Optional `ops` role for remote machines: hand the whole thing to the `ssh-captain`
skill instead of reinventing it here.

Team shapes:

- **Light team** — 1 builder + 1 prober. Small work that still needs a second pair of eyes.
- **Full team** — scout (if the terrain is unknown) + 2–3 builders on disjoint territories
  + 1 prober + 1 critic (high-risk) + 1 scribe (only if the project keeps docs).
- **Stage fan-out** — when one stage has many homogeneous items, run that stage through
  the `workflow` tool instead of staffing it; see `workflow-stage.md`.

Cap concurrent members at 3–4. Every teammate is a full context; a team costs real money
and real wall-clock, and the human pays for both.

## Spawning

Start every independent teammate **in the same assistant message** so they actually run in
parallel, and use `subagent` (spawn) unless the teammate genuinely needs this session's
conversation — `subagent_fork` copies it and costs the extra context. Record the returned
child id in `team.json` (`members[].agentId`); that id is what makes the team resumable
after a context loss.

Give each teammate: a label (3–5 words), the brief, and nothing else. Spawn children do
not see this conversation, so the brief must be self-contained.

## Brief skeleton (builder)

```
You are the <role> on a team. <One-line team objective.>

TASK: <what to produce, in one paragraph>
TERRITORY (the only paths you may write): <globs>
MUST READ: <exact files, tickets, specs — with paths>
ACCEPTANCE (each line must end with evidence you can point at):
  1. ...
  2. ...
EVIDENCE FORMAT (mandatory):
  - the exact commands you ran
  - their real output, including numbers
  - file:line for every claim
  - STATUS: completed | failed | blocked
  - WHAT YOU DID NOT VERIFY: <be specific; an empty list is a red flag>
DO NOT: touch files outside your territory; commit; push; deploy; restart services;
  change configuration formats; ask the human anything directly.
REPORT: your final message is the report, or send it to the lead with send_message.
```

Adapt for the other roles:

- `scout` — deliverables are facts and a recommendation; add "read-only, write no files".
- `prober` — replaces ACCEPTANCE with the other teammate's acceptance list, adds "you did
  not write this code; reproduce every criterion from scratch; on failure report the exact
  command and the mismatch, do not fix it", and requires a per-criterion verdict.
- `critic` — adds the two axes (spec compliance, red lines), forbids re-opening decided
  questions, and requires findings in this shape:

```json
{"id":"F1","severity":"blocker|high|medium|low","file":"path/to/file","line":42,
 "problem":"what is wrong","requiredFix":"what must change"}
```

Verdict vocabulary is exactly `pass`, `needs_revision`, `reject`. A vague "could be
stronger" is not a finding; if the critic found nothing after real reading, `pass` with the
list of what it did not examine.

## Anti-collusion

- The prober is never the builder, and never a second brief handed to the same child.
- Do not brief the prober with the builder's conclusion; brief it with the acceptance
  criteria and the artifact only.
- If a builder's own report says a test passes, that is a claim, not evidence, until the
  prober's raw output shows it.
