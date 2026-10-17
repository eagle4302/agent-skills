# Skills

This directory is the Pi user-level skills root (`~/.pi/agent/skills`). It holds 58 skills — most of
them copied from public upstream repos, the rest authored here.

It is also a git repository of its own:

```
origin  https://github.com/eagle4302/agent-skills.git
```

So there are **two layers of versioning**, and they are independent:

| Layer | What moves | Where it is recorded |
|---|---|---|
| Upstream | the public repos this directory copied skills from | `scripts/skill-sources.tsv` + the tables below |
| Your repo | upstream syncs, local edits, and skills authored here | the `eagle4302/agent-skills` git history |

An upstream sync is a **manual copy followed by a commit** — there are no submodules and no vendoring
tool in the loop. That is why provenance is written down instead of inferred.

## Using these skills from Claude Code

Claude Code does not look in this directory. It loads skills only from `~/.claude/skills/<name>/SKILL.md`
(user level), `.claude/skills/` inside a project, and installed plugins. To share one copy between Pi and
Claude Code, point Claude's user-level skills directory at this repo with a directory junction:

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills" -Target "$env:USERPROFILE\.agents\skills"
```

On macOS or Linux, use `ln -s ~/.agents/skills ~/.claude/skills` instead.

- **Disable the overlapping plugins.** If the `mattpocock-skills@mattpocock` or `obsidian@obsidian-skills`
  plugins are installed, set them to `false` under `enabledPlugins` in `~/.claude/settings.json`.
  Otherwise each skill shows up twice (`tdd` and `mattpocock-skills:tdd`), and the plugin copy lags
  behind the version pinned here.
- **Restart the session.** Claude Code reads the skill list at startup, so a running session keeps the old list.
- **No per-skill setup.** Every skill directory here already has `name` and `description` frontmatter, which
  is all Claude Code needs. `scripts/` has no `SKILL.md` and is ignored. Skills added or synced later are
  picked up on the next session.

## Using these skills from OpenCode

OpenCode V2 needs no junction: `~/.agents/skills` and `~/.claude/skills` are both **global compatibility
sources**, so this directory is read as-is, and a project-local `.agents/skills` is picked up from the
project root down to the current directory. Nothing goes in `opencode.jsonc` — extra directories and HTTP
catalogs are optional, via its `skills` array. The skill ID is the path-derived, case-sensitive directory
name (`typesafe-ai`), and as in Pi a skill with no `description` is not advertised to the model. Verify
with `opencode debug skill`, which lists every registered skill with its `location`.

## Sources at a glance

All five upstream repos last compared on **2026-10-18** by `scripts/check-skill-updates.sh`.

| Upstream repo | Upstream layout | Skills installed | Pinned commit |
|---|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/<category>/<name>/` for `engineering`, `productivity`, `misc`, `in-progress` | 38 | `49dd158` (2026-10-09) |
| [humanlayer/skills](https://github.com/humanlayer/skills) | `plugins/<plugin>/skills/<name>/` | 4 | `653b641` (2026-10-08) |
| [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | `skills/<name>/` | 6 | `3ccff533` (2026-09-15) |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `skills/<name>/` | 1 (divergent copy) | `aeac41d` (2026-10-13) |
| [typesafe-ai/skills](https://github.com/typesafe-ai/skills) | `skills/<name>/` | 1 | `65a39f3` (2026-09-12) |
| authored in this repo | — | 8 | — |

`dirname`-style names match upstream for every skill, so a skill's upstream path is usually
`<layout prefix>/<skill dir name>/`.

## Provenance by skill

### mattpocock/skills — pinned `49dd158d1076134a641b33efb035946536778336`

Most of the 38 copies are byte-identical to upstream (`verbatim`); eight carry a local edit (the
grilling family and its callers — see "Local edits that a re-sync would clobber").
`resolving-merge-conflicts` was removed upstream in v1.3 (commit `daa01d8`), so its local copy was
deleted; `implement-spec` and `retro` graduated from `in-progress/` to `engineering/`.

The 2026-10-18 sync moved the pin from `d81f3a1` to `49dd158` and refreshed 13 skills: eleven
`verbatim` copies (`ask-matt`, `code-review`, `diagnosing-bugs`, `implement`,
`setup-matt-pocock-skills`, `tdd`, `to-tickets`, `wizard`, `handoff`, `teach`, `claude-handoff`) plus
`grilling` and `wayfinder`, which carry a local edit and were merged by hand. Everything else in this
repo was already identical to `49dd158`.

The same day, `chief-of-staff` was added — the one skill upstream gained between `d81f3a1` and
`49dd158`. It is `verbatim`, and keeps upstream's `disable-model-invocation: true`, so it is invoked by
name only. `pr` was added the same day to close the flow: `ask-matt` hands the PR body to `/pr` and
notes that it is model-invoked, so leaving it out left that pointer dangling. It is `verbatim` too, and
its `agents/openai.yaml` carries only `interface:` metadata — no `policy:` block — so nothing
suppresses automatic invocation.

| Skill | Upstream path |
|---|---|
| `ask-matt` | `skills/engineering/ask-matt` |
| `code-review` | `skills/engineering/code-review` |
| `codebase-design` | `skills/engineering/codebase-design` |
| `diagnosing-bugs` | `skills/engineering/diagnosing-bugs` |
| `domain-modeling` | `skills/engineering/domain-modeling` |
| `grill-with-docs` | `skills/engineering/grill-with-docs` |
| `implement` | `skills/engineering/implement` |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` |
| `pr` | `skills/engineering/pr` |
| `prototype` | `skills/engineering/prototype` |
| `research` | `skills/engineering/research` |
| `setup-matt-pocock-skills` | `skills/engineering/setup-matt-pocock-skills` |
| `tdd` | `skills/engineering/tdd` |
| `to-spec` | `skills/engineering/to-spec` |
| `to-tickets` | `skills/engineering/to-tickets` |
| `triage` | `skills/engineering/triage` |
| `wayfinder` | `skills/engineering/wayfinder` |
| `wizard` | `skills/engineering/wizard` |
| `grill-me` | `skills/productivity/grill-me` |
| `grilling` | `skills/productivity/grilling` |
| `handoff` | `skills/productivity/handoff` |
| `teach` | `skills/productivity/teach` |
| `to-questionnaire` | `skills/productivity/to-questionnaire` |
| `wait-what` | `skills/productivity/wait-what` |
| `writing-for-agents` | `skills/productivity/writing-for-agents` |
| `git-guardrails-claude-code` | `skills/misc/git-guardrails-claude-code` |
| `migrate-to-shoehorn` | `skills/misc/migrate-to-shoehorn` |
| `scaffold-exercises` | `skills/misc/scaffold-exercises` |
| `setup-pre-commit` | `skills/misc/setup-pre-commit` |
| `claude-handoff` | `skills/in-progress/claude-handoff` |
| `implement-spec` | `skills/engineering/implement-spec` — graduated from `in-progress` upstream |
| `loop-me` | `skills/in-progress/loop-me` |
| `retro` | `skills/engineering/retro` — graduated from `in-progress` upstream |
| `setup-ts-deep-modules` | `skills/in-progress/setup-ts-deep-modules` |
| `writing-beats` | `skills/in-progress/writing-beats` |
| `writing-fragments` | `skills/in-progress/writing-fragments` |
| `writing-shape` | `skills/in-progress/writing-shape` |
| `chief-of-staff` | `skills/in-progress/chief-of-staff` |

Every skill in this repo is now installed.

### humanlayer/skills — pinned `653b6411c1f70c275a18e37673b042ff99f67ceb`

| Skill | Upstream path | Local state |
|---|---|---|
| `show-me` | `plugins/show-me/skills/show-me` | modified — see below |
| `improve-claude-md` | `plugins/improve-claude-md/skills/improve-claude-md` | verbatim |
| `rpi` | `plugins/rpi/skills/rpi` | verbatim |
| `visual-pr` | `plugins/visual-pr/skills/visual-pr` | verbatim |

The repo moved from `ca7c8088` to `653b641` (2026-10-08), which added `rpi`; `show-me`'s own tree did
not change, so the pin moved without a copy.

`rpi` and `visual-pr` declare "only use when the user explicitly invokes this skill by name" in their
`description` rather than with `disable-model-invocation`. Copied verbatim, so both keep upstream's
wording. For each of the three newer skills only the skill directory came over: the plugin-level
`agents/` (rpi's five subagent definitions) and `.claude-plugin/plugin.json` belong to the Claude Code
plugin, not to the skill, and `rpi` resolves its subagents from its own `references/subagents/`.

Not installed from this repo: `build-iterated-agentic-loop`, `design-control-loop`,
`narrow-react-prop-types`.

### kepano/obsidian-skills — pinned `3ccff5338ea700537839b21900aa5358a0402c98`

| Skill | Upstream path | Local state |
|---|---|---|
| `defuddle` | `skills/defuddle` | modified — see below |
| `json-canvas` | `skills/json-canvas` | verbatim |
| `knap` | `skills/knap` | verbatim |
| `obsidian-bases` | `skills/obsidian-bases` | verbatim |
| `obsidian-cli` | `skills/obsidian-cli` | verbatim |
| `obsidian-markdown` | `skills/obsidian-markdown` | verbatim |

### addyosmani/agent-skills — compared against `aeac41d4d005999432bb7312f7ff06383a91d59d`

| Skill | Upstream path | Local state |
|---|---|---|
| `code-review-and-quality` | `skills/code-review-and-quality` | divergent — see below |

The other 24 skills in that repo are not installed. The name match was found on 2026-09-26; the local
copy already carried its own frontmatter credit:

```yaml
source: https://github.com/addyosmani/agent-skills/tree/main/skills/code-review-and-quality
source_repo: addyosmani/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/addyosmani/agent-skills/blob/main/LICENSE
```

The repo moved from `1401c8b` to `aeac41d` (2026-10-13); the `code-review-and-quality` tree is unchanged
between the two, so the pin moved without a copy. The local variant is still the divergence described
below, not a stale copy of upstream.

### typesafe-ai/skills — pinned `65a39f393687675ce170e6094757de20370365b9`

| Skill | Upstream path | Local state |
|---|---|---|
| `typesafe-ai` | `skills/typesafe-ai` | verbatim |

The repo holds one skill (Release v0.5.7). The local copy matches the pin; the working tree carries CRLF
because this box runs `core.autocrlf=true`, which `scripts/check-skill-updates.sh` ignores.

### Authored in this repo

No upstream found as of 2026-10-15 — checked by directory name and by the `name:` frontmatter field
against all five repos above.

| Skill | Notes |
|---|---|
| `agents-team` | team/lead-plus-specialists workflow, built on `pi-subagents` |
| `ai-loop` | bounded spec-build-review loop |
| `consult` | read-only advisor model at decision checkpoints |
| `context-first` | lookup order for dev work: CodeGraph → TypeSafe Jev (narrow and batch classification) → Obsidian vault → plan and edit |
| `field-handoff` | office ↔ field handoff file (and paste-ready field-agent prompt) between the office and the real machine |
| `field-office-checklist` | MetalAutoUQDwpf only: list what still needs the real machine vs the office, field items layered by who can verify them |
| `git-janitor` | sweep a messy working tree: commit, push, .gitignore, or delete each stray entry |
| `ssh-captain` | drive remote dev/build/test boxes over SSH |

## Local edits that a re-sync would clobber

These skills intentionally differ from upstream. Copying upstream over them loses the edit; merge instead.

| Skill | Edit | Why it matters |
|---|---|---|
| `show-me` | Removed `disable-model-invocation: true` from the frontmatter **and** did not copy upstream's `agents/openai.yaml` (`policy: allow_implicit_invocation: false`) | Both files say "user-invoked only". Their absence means `show-me` is eligible for automatic model selection here. Pi does support `disable-model-invocation` (see `pi-coding-agent/docs/skills.md`), so this is a deliberate difference, not a portability fix. |
| `defuddle` | The `description` was rewritten into a longer routing description (adds "use instead of WebFetch", and the "not for `.md` URLs" caveat) | Description text is what the model routes on. Do not let a sync revert it to upstream's one-liner. |
| `code-review-and-quality` | Body rewritten and condensed relative to upstream (`SKILL.md` only; 362 lines locally vs 396 upstream, different frontmatter) | Upstream renamed/rewrote sections. Treat an upstream update as a source of ideas, not a patch to apply. The 2026-10-04 sync folded upstream's mutation-testing paragraph in at `1401c8b`. |
| `grilling` | Added a "Closed questions: ask with the harness's ask tool" section and a harness→tool table (`ask_user_question`, `AskUserQuestion`, `question`, `vscode_askQuestions`, `request_user_input`, …) | Makes the interview deliver multiple-choice questions through each harness's native ask UI instead of plain text. |
| `improve-codebase-architecture`, `triage`, `wayfinder`, `to-questionnaire`, `loop-me`, `writing-fragments`, `writing-shape` | One-line pointers to `/grilling`'s ask-tool rule, at the spot each asks the human a closed question | The rule lives once, in `grilling`. `grill-me` and `grill-with-docs` are **not** edited: they are one-line delegators to `/grilling` and inherit it. |

Everything not listed above is `verbatim`, which makes a clean `cp -r` the correct sync for those skills.

## Checking for updates

```bash
scripts/check-skill-updates.sh              # compare every skill against its upstream
scripts/check-skill-updates.sh --sources    # also list upstream skills that are not installed here
scripts/check-skill-updates.sh --strict     # exit 1 when anything needs attention (for CI / agents)
scripts/check-skill-updates.sh --offline    # reuse the cached upstream clones, no fetch
```

Upstream clones are cached in `$HOME/.cache/pi-skill-updates` (override with `--cache DIR` or
`PI_SKILLS_CACHE`). The script fetches each repo's default branch and compares directory trees, so it
catches added, changed, and deleted files.

**Line endings are ignored.** Upstream trees are exported as LF and the comparison ignores trailing CR, so
a Windows checkout (`core.autocrlf=true`) does not read every file as a local edit. The earlier "37 copies
are verbatim but the checker says they all drifted" false positive was exactly this and is fixed in the script.

Verdicts, and what to do:

| Verdict | Meaning | Action |
|---|---|---|
| `up-to-date` | local tree equals upstream HEAD | none |
| `upstream-ahead` | local equals `pinned_sha`, upstream has moved | copy over, then re-apply local edits if any |
| `local-drift` | upstream has not moved; this copy has local edits | none, unless you want to reconcile |
| `conflict` | local edits **and** upstream moved | merge by hand |
| `unknown-pin` | `pinned_sha` is not in the upstream clone, or the path is gone | verify by hand; the upstream may have been renamed, moved, or force-pushed |
| `missing-local` | a manifest row has no directory | fix the manifest or restore the skill |
| `local-only` | no upstream declared | none |

## Syncing a skill

1. Run `scripts/check-skill-updates.sh` and confirm the verdict is `upstream-ahead` (or `conflict`, which
   you then merge by hand).
2. Copy the new tree, for example:

   ```bash
   CACHE="$HOME/.cache/pi-skill-updates/mattpocock__skills"
   git -C "$CACHE" archive origin/main skills/engineering/tdd \
     | tar -x -C /tmp --strip-components=2 --no-same-owner
   rm -rf tdd && mv /tmp/tdd ./tdd
   ```

   Or, for a repo whose skills are all `verbatim`, `cp -r` straight from the cached clone.
3. Re-apply any edit listed under "Local edits that a re-sync would clobber".
4. Update `scripts/skill-sources.tsv`: set the skill's `pinned_sha` to the commit you just synced, and
   refresh its `local_state` and `notes`.
5. Refresh the tables in this README to match, and note the new "last compared" date.
6. Commit to `eagle4302/agent-skills`.

Tell the agent to do these steps in one go — for example: *"run `scripts/check-skill-updates.sh`, and if
anything is `upstream-ahead`, sync it and follow README.md's sync procedure."*

## Manifest of record

`scripts/skill-sources.tsv` is authoritative — it is the file the script reads. This README renders the
same facts for humans. When they disagree, fix the README, not the TSV. Columns:

```
local_dir  source  upstream_path  pinned_sha  local_state  notes
```

`local_state` is one of `verbatim`, `modified`, `divergent`, `local-only`.

## Pi frontmatter notes

- Pi accepts the Agent Skills fields `name`, `description`, `license`, `compatibility`, `metadata`,
  `allowed-tools`, and `disable-model-invocation`. 22 of the skills here carry
  `disable-model-invocation: true` straight from upstream — keep it.
- `argument-hint` (used by `claude-handoff`, `handoff`, `loop-me`, `teach`) is a Claude Code field that
  Pi does not read. It is harmless in Pi, used by Claude Code (see "Using these skills from Claude Code"),
  and left in place to stay close to upstream.
- Skills with a `description` are the only ones Pi loads; a missing or malformed `description` means the
  skill is silently skipped. If you add a skill, check the startup diagnostics or `/skill:<name>`.
