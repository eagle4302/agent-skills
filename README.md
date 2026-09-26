# Skills

This directory is the Pi user-level skills root (`~/.pi/agent/skills`). It holds 49 skills — most of
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

## Sources at a glance

All four upstream repos last compared on **2026-09-26** by `scripts/check-skill-updates.sh`.

| Upstream repo | Upstream layout | Skills installed | Pinned commit |
|---|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/<category>/<name>/` for `engineering`, `productivity`, `misc`, `in-progress` | 37 | `c55ee460` (2026-09-18) |
| [humanlayer/skills](https://github.com/humanlayer/skills) | `plugins/<plugin>/skills/<name>/` | 1 | `ca7c8088` (2026-09-17) |
| [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | `skills/<name>/` | 6 | `3ccff533` (2026-09-15) |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `skills/<name>/` | 1 (divergent copy) | `2686b620` |
| authored in this repo | — | 4 | — |

`dirname`-style names match upstream for every skill, so a skill's upstream path is usually
`<layout prefix>/<skill dir name>/`.

## Provenance by skill

### mattpocock/skills — pinned `c55ee46073ed923f86ce59a5eb3b6d895095d1b7`

All 37 copies are byte-identical to upstream (`verbatim`).

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
| `prototype` | `skills/engineering/prototype` |
| `research` | `skills/engineering/research` |
| `resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` |
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
| `implement-spec` | `skills/in-progress/implement-spec` |
| `loop-me` | `skills/in-progress/loop-me` |
| `retro` | `skills/in-progress/retro` — synced 2026-09-26, was behind upstream |
| `setup-ts-deep-modules` | `skills/in-progress/setup-ts-deep-modules` |
| `writing-beats` | `skills/in-progress/writing-beats` |
| `writing-fragments` | `skills/in-progress/writing-fragments` |
| `writing-shape` | `skills/in-progress/writing-shape` |

Not installed from this repo: `pr` (`skills/in-progress/pr`).

### humanlayer/skills — pinned `ca7c8088db69e315a8b2deea43820270457f8f3c`

| Skill | Upstream path | Local state |
|---|---|---|
| `show-me` | `plugins/show-me/skills/show-me` | modified — see below |

Not installed from this repo: `build-iterated-agentic-loop`, `design-control-loop`, `improve-claude-md`,
`narrow-react-prop-types`, `visual-pr`.

### kepano/obsidian-skills — pinned `3ccff5338ea700537839b21900aa5358a0402c98`

| Skill | Upstream path | Local state |
|---|---|---|
| `defuddle` | `skills/defuddle` | modified — see below |
| `json-canvas` | `skills/json-canvas` | verbatim |
| `knap` | `skills/knap` | verbatim |
| `obsidian-bases` | `skills/obsidian-bases` | verbatim |
| `obsidian-cli` | `skills/obsidian-cli` | verbatim |
| `obsidian-markdown` | `skills/obsidian-markdown` | verbatim |

### addyosmani/agent-skills — compared against `2686b620fc1fed2e8f60c704839c766b8594c6b6`

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

### Authored in this repo

No upstream found as of 2026-09-26 — checked by directory name and by the `name:` frontmatter field
against all four repos above.

| Skill | Notes |
|---|---|
| `agents-team` | team/lead-plus-specialists workflow, built on `pi-subagents` |
| `ai-loop` | bounded spec-build-review loop |
| `consult` | read-only advisor model at decision checkpoints |
| `ssh-captain` | drive remote dev/build/test boxes over SSH |

## Local edits that a re-sync would clobber

Three skills intentionally differ from upstream. Copying upstream over them loses the edit; merge instead.

| Skill | Edit | Why it matters |
|---|---|---|
| `show-me` | Removed `disable-model-invocation: true` from the frontmatter **and** did not copy upstream's `agents/openai.yaml` (`policy: allow_implicit_invocation: false`) | Both files say "user-invoked only". Their absence means `show-me` is eligible for automatic model selection here. Pi does support `disable-model-invocation` (see `pi-coding-agent/docs/skills.md`), so this is a deliberate difference, not a portability fix. |
| `defuddle` | The `description` was rewritten into a longer routing description (adds "use instead of WebFetch", and the "not for `.md` URLs" caveat) | Description text is what the model routes on. Do not let a sync revert it to upstream's one-liner. |
| `code-review-and-quality` | Body rewritten and condensed relative to upstream (`SKILL.md` only; 360 lines locally vs 396 upstream, different frontmatter) | Upstream renamed/rewrote sections. Treat an upstream update as a source of ideas, not a patch to apply. |

Everything else is `verbatim`, which makes a clean `cp -r` the correct sync for those skills.

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
  Pi does not read. It is harmless and is left in place to stay close to upstream.
- Skills with a `description` are the only ones Pi loads; a missing or malformed `description` means the
  skill is silently skipped. If you add a skill, check the startup diagnostics or `/skill:<name>`.
