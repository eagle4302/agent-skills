# Skills

This directory is the shared user-level skills root (`~/.agents/skills`). It holds 77 skills — most of
them copied from public upstream repos, the rest authored here. DSH reads it directly, Claude Code
reaches it through the junction below, and OpenCode treats it as a global compatibility source.

Pi's documented root is `~/.pi/agent/skills`. On this machine that path is a `.lnk` shortcut rather
than a directory, so replace it with a junction before relying on Pi loading these skills.

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

## Prompts

Reusable instruction blocks that are not skills live in `prompts/`: the architecture-block installer
and the CodeGraph/Jev/Recap block. `prompts/README.md` says what each one writes into a harness's
global rules file.

## Sources at a glance

The last full comparison by `scripts/check-skill-updates.sh` ran on **2026-10-29**. It synced every
`upstream-ahead` skill — 5 from `mattpocock/skills` (`code-review`, `codebase-design`, `research`,
`setup-matt-pocock-skills`, `implement-spec`) and 8 from `earthtojake/text-to-cad` (`cad`, `dxf`,
`engineering-drawing`, `gcode`, `sdf`, `srdf`, `step-parts`, `urdf`) — and merged the 4 conflicts:
`grilling`, `wayfinder` and `improve-codebase-architecture` each only gained an upstream "with a fresh
context window" line, and `slint` changed one reference file; local edits were kept. On top of those,
`earthtojake/text-to-cad` was added and pinned on **2026-10-28**, `morluto/rea` on **2026-10-29** from the
installed `rea-agents` 6.8.0 package, and the four UI-framework repos on **2026-10-23**.
`chief-of-staff` remains `hold`: upstream `5beb35b` only adds a wiki-memory section to an `in-progress`
skill, so the update check reports it as held, not upstream-ahead.

| Upstream repo | Upstream layout | Skills installed | Pinned commit |
|---|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/<category>/<name>/` for `engineering`, `productivity`, `misc`, `in-progress` | 38 | `a496f55` (2026-10-29) |
| [humanlayer/skills](https://github.com/humanlayer/skills) | `plugins/<plugin>/skills/<name>/` | 4 | `653b641` (2026-10-08) |
| [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | `skills/<name>/` | 6 | `3ccff533` (2026-09-15) |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `skills/<name>/` | 1 (divergent copy) | `aeac41d` (2026-10-13) |
| [typesafe-ai/skills](https://github.com/typesafe-ai/skills) | `skills/<name>/` | 1 | `302eea6` (2026-10-23) |
| [slint-ui/slint](https://github.com/slint-ui/slint) | `ai-plugins/skills/<name>/` inside the Slint monorepo | 1 | `dca61c9` (2026-10-29) |
| [TheQtCompanyRnD/agent-skills](https://github.com/TheQtCompanyRnD/agent-skills) | `skills/<name>/` | 2 | `6845f02` (2026-10-20) |
| [AlstonChan/agent-skills](https://github.com/AlstonChan/agent-skills) | `skills/<name>/` | 1 | `d6a82cf` (2026-10-22) |
| [wshaddix/dotnet-skills](https://github.com/wshaddix/dotnet-skills) | `skills/<name>/` | 1 | `09da68d` (2026-02-27) |
| [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad) | `skills/<name>/` | 12 | `a7cf2c4` (2026-10-29) |
| [morluto/rea](https://github.com/morluto/rea) | `.agents/skills/<name>/` inside the REA monorepo | 1 (publish variant) | `160d821` (2026-10-25) |
| authored in this repo | — | 9 | — |

`dirname`-style names match upstream for every skill, so a skill's upstream path is usually
`<layout prefix>/<skill dir name>/`.

## Provenance by skill

### mattpocock/skills — pinned `a496f5513d4a4cf889bc48e189e579f4b0bdf6aa`

Most of the 38 copies are byte-identical to upstream (`verbatim`); nine carry a local edit (the
grilling family and its callers, plus `ask-matt`'s 2026-10-29 router additions — see "Local edits that a
re-sync would clobber").
`resolving-merge-conflicts` was removed upstream in v1.3 (commit `daa01d8`), so its local copy was
deleted; `implement-spec` and `retro` graduated from `in-progress/` to `engineering/`.

The 2026-10-18 sync moved the pin from `d81f3a1` to `49dd158` and refreshed 13 skills: eleven
`verbatim` copies (`ask-matt`, `code-review`, `diagnosing-bugs`, `implement`,
`setup-matt-pocock-skills`, `tdd`, `to-tickets`, `wizard`, `handoff`, `teach`, `claude-handoff`) plus
`grilling` and `wayfinder`, which carry a local edit and were merged by hand. Everything else in this
repo was already identical to `49dd158`.

The 2026-10-29 sync moved the pin to `a496f55`. It copied the five `upstream-ahead` skills verbatim
(`code-review`, `codebase-design`, `research`, `setup-matt-pocock-skills`, `implement-spec`) and
hand-merged the three conflicts: `grilling`, `wayfinder` and `improve-codebase-architecture` each only
gained "with a fresh context window" in one sentence upstream, and every local ask-tool pointer was
kept. `ask-matt` was edited here the same day to route the seven user-invoked skills it had missed, so
its manifest state moved from `verbatim` to `modified`.

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

`rpi` and `visual-pr` said "only use when the user explicitly invokes this skill by name" in their
`description` only. On 2026-10-29 each gained the real `disable-model-invocation: true` plus an
`agents/openai.yaml` policy, so no harness auto-invokes them. For each of the three newer skills only the
skill directory came over: the plugin-level
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

**Known optional pointer.** `code-review-and-quality/SKILL.md:169` closes a paragraph with "For a
project-wide mutation score, see `constraint-driven-development`", which is not installed. It is not a
`pr`-style gap: the sentences before it instruct the agent to invert a condition, run the suite and name
the missing test case, and only the project-wide score points outside the skill. Checked 2026-10-18 with
a Jev call — `optional_see_also` at confidence 1.00 against the `same_as_pr` shape, `blocks_instructed_step`
0.20, and the remaining-gap class `optional_pointers_only` at 0.91. Left uninstalled on purpose.
Installing it would add two more optional pointers of the same kind: its own overview names
`test-driven-development` and `security-and-hardening`, also not installed.

### typesafe-ai/skills — pinned `302eea662c54bca6730873fe245bec1d69ebc23d`

| Skill | Upstream path | Local state |
|---|---|---|
| `typesafe-ai` | `skills/typesafe-ai` | verbatim |

The repo holds one skill (Release v0.6.2, synced 2026-10-27 from v0.5.7; `SKILL.md` was rewritten around
"judgments from Jev, decisions in code"). The Claude Code `typesafe` plugin is a separate install and
stays at its own version. The local copy matches the pin; the working tree carries CRLF
because this box runs `core.autocrlf=true`, which `scripts/check-skill-updates.sh` ignores.

### UI frameworks: Slint, Qt/QML, WPF — added 2026-10-23

Added for WPF (.NET 8+), QML, and Slint desktop work. Four are `verbatim` and `slint` carries one local
addition. Every skill directory was read in full before it was copied. The popular web-oriented UI skills (`anthropics/skills` `frontend-design`,
`ui-ux-pro-max`, `impeccable`, `taste-skill`) were looked at the same day and left out: they target HTML/CSS,
and their descriptions fire on any "build a UI" request, so they would compete with `qt-ui-design`.

| Skill | Upstream repo and path | License | Local state |
|---|---|---|---|
| `slint` | `slint-ui/slint` `ai-plugins/skills/slint` | Slint's triple license: GPL-3.0-only OR Slint Royalty-free 2.0 OR Slint Software 3.0 | modified — see below |
| `qt-qml` | `TheQtCompanyRnD/agent-skills` `skills/qt-qml` | LicenseRef-Qt-Commercial OR BSD-3-Clause (`LICENSE.txt` in the skill) | verbatim |
| `qt-ui-design` | `TheQtCompanyRnD/agent-skills` `skills/qt-ui-design` | LicenseRef-Qt-Commercial OR BSD-3-Clause (`LICENSE.txt` in the skill) | verbatim |
| `wpf-design-system` | `AlstonChan/agent-skills` `skills/wpf-design-system` | MIT | verbatim |
| `dotnet-wpf-modern` | `wshaddix/dotnet-skills` `skills/dotnet-wpf-modern` | MIT, per the README; the fork carries no `LICENSE` file | verbatim |

**`slint`.** Only the skill directory came over. Slint's plugin also ships `hooks/` (a Codex-only
post-edit `slint-viewer --check` on touched `.slint` files) and two MCP servers (`slint-docs`, `slint-preview`); none of them is installed.
`SKILL.md` says the `slint-docs` server is "usually" available because the plugin declares it; without it
the skill falls back to fetching `slint.dev/docs`, so nothing breaks. Runtime checks need `slint-viewer`
or `slint-lsp` on `PATH` (`tools-install.md`). The skill also asks the user, once the app runs, whether to
star the Slint repo via `gh api` — it asks first, so it is left as upstream wrote it. The script clones
the whole Slint monorepo the first time it checks this skill, so expect that first run to be slow.

The local addition makes up for the missing plugin. `official-tooling.md` (new) tells the agent to check,
once per session, for `slint-viewer`, `slint-lsp`, the `slint-docs` MCP server, and an editor extension, and
then to offer the missing ones in a single message, with commands from official sources only. It never
installs anything without a yes, and it does not repeat the offer after the user declines. It also names the
full plugin (`/plugin marketplace add slint-ui/ai-plugins`, then `/plugin install slint@slint`) and warns that
installing the plugin duplicates this skill. `SKILL.md` gains a three-line pointer above workflow step 1 and
one row in its reference table; upstream text is unchanged. The 2026-10-27 sync (`301a9b8` → `a853159`)
was a three-way merge: upstream added two preview lines to workflow step 3 and fixed the compile-argument
notes in `reference/web-embedding.md`, and both local additions applied cleanly. The 2026-10-29 sync
(`a853159` → `dca61c9`) changed only `reference/web-embedding.md`; the merge was clean and the local
tooling pointer stayed.

The skill is pinned to the monorepo's `master` (plugin `1.19.0`), which runs ahead of the latest release
(`v1.18.1`). Slint's install guide publishes the plugin from
[slint-ui/ai-plugins](https://github.com/slint-ui/ai-plugins), a generated mirror that tracks the release
line. Its `SKILL.md` and `tools-install.md` differ slightly, and it has no `web-embedding.md`. Both sets of
release-asset names in the two copies (`slint-viewer-windows-x86_64.zip` and
`slint-viewer-x86_64-pc-windows-msvc.zip`) exist on `v1.18.1`.

**`qt-qml`, `qt-ui-design`.** Both declare `disable-model-invocation: false` explicitly. `qt-qml` scans for
a `run_qmlPreview` MCP tool on every use and, if one is connected, follows `references/qmlpreview.md`
(Qt 6.12+). `platforms/windsurf.md` is upstream's Windsurf rule file and is unused here. `qt-ui-design` is
not QML-specific; section 4 (embedded/MCU, actuator confirmation, persistent alarms) also applies to
WPF and Slint HMI screens. Not installed from this repo: `qt-qml-review`, `qt-qml-docs`, `qt-qml-test`,
`qt-qml-test-run`, `qt-qml-profiler`, `qt-canvas2d`, `qt-cmake-project`, `qt-cpp-review`, `qt-cpp-docs`,
`qt-figma-token-extraction`, `qt-figma-component-generation`.

**`dotnet-wpf-modern`.** This is a fork of `Aaronontheweb/dotnet-skills`; the WPF skills exist only in the
fork, which has had no commits since 2026-02-27. Its intro links six sibling skills that are not installed
(`dotnet-wpf-migration`, `dotnet-ui-testing-core`, `dotnet-winui`, `dotnet-native-aot`, `dotnet-ui-chooser`,
`dotnet-accessibility`). They are optional pointers: each one tells the agent where a neighbouring topic
lives, and no step in the skill depends on it. **Known inaccuracy:** the Performance section says WPF on
.NET 8+ renders through DirectX 11 by default. WPF still renders through DirectX 9 (milcore) on .NET 8 and 9.
The rest of the skill does not depend on that claim, so the copy stays verbatim.

### earthtojake/text-to-cad — pinned `a7cf2c470e345d6b6a2fe373a73e0420ff64ad2a`

Added and pinned on 2026-10-28. Twelve skills covering the part-making chain — parametric CAD and its
exports (`cad`), 2D DXF drawings (`dxf`), shop drawings (`engineering-drawing`), manufacturability review
(`dfm`, `dfam-check`), slicing and Bambu Lab printing (`gcode`, `bambu-labs`), SendCutSend ordering
(`sendcutsend`), catalog part lookup (`step-parts`), and robot and simulator descriptions (`urdf`, `srdf`,
`sdf`). All twelve are `verbatim`, and together they are every skill in the upstream `skills/` directory.
Each directory ships its own MIT `LICENSE`, and `agents/openai.yaml` came over unchanged. Four skills carry
Python helpers (`dfam-check`, `dfm`, `gcode`, `step-parts`), and `dfam-check` and `dfm` add a
`requirements.txt` for their review tools.

The 2026-10-29 sync moved the pin to `a7cf2c4`: eight skills had upstream changes (CAD snapshot review,
DXF / drawing / SDF / SRDF / URDF skill text, step-parts, and the Orca preset helper). All were copied
verbatim.

| Skill | Upstream path | Local state |
|---|---|---|
| `bambu-labs` | `skills/bambu-labs` | verbatim |
| `cad` | `skills/cad` | verbatim |
| `dfam-check` | `skills/dfam-check` | verbatim |
| `dfm` | `skills/dfm` | verbatim |
| `dxf` | `skills/dxf` | verbatim |
| `engineering-drawing` | `skills/engineering-drawing` | verbatim |
| `gcode` | `skills/gcode` | verbatim |
| `sdf` | `skills/sdf` | verbatim |
| `sendcutsend` | `skills/sendcutsend` | verbatim |
| `srdf` | `skills/srdf` | verbatim |
| `step-parts` | `skills/step-parts` | verbatim |
| `urdf` | `skills/urdf` | verbatim |

### morluto/rea — pinned `160d821ac9a0310afcb8d1fc427862dd6508add5`

Added on 2026-10-29 from the `rea-agents` 6.8.0 npm package that supplies the REA MCP server. The package
ships `skills/reverse-engineer-anything/`; the same directory lives at `.agents/skills/` in the repo, and the
pin is the `rea-agents-6.8.0` tag (published 2026-10-25).

| Skill | Upstream path | Local state |
|---|---|---|
| `reverse-engineer-anything` | `.agents/skills/reverse-engineer-anything` | hold (installed package 6.8.0; repo moved to `1ef5918`, not followed) |

All seven `references/*.md` files are byte-identical to the tag. `SKILL.md` is the publish variant: it adds
`tool_count: 229` to the frontmatter and pins the fallback commands to `npx -y rea-agents@6.8.0` where the
repo says `@latest` — five lines added, six removed, no prose rewritten. The manifest state is `hold`, not
`modified`: a re-sync installs a newer `rea-agents` package and copies its skill directory, then bumps this
pin. Do not merge from the repo tree — the repo moved to `1ef5918`, but the installed package stays 6.8.0
until it is updated on purpose.

REA rewrites these docs when it updates and leaves a `*.rea.backup` beside each rewritten file; the pattern
is in `.gitignore`. The backups on disk are the pre-rewrite copies — do not commit them.

### Authored in this repo

No upstream found as of 2026-10-29 — checked by directory name and by the `name:` frontmatter field against
every upstream repo above, and by a filesystem search for a second copy of each skill.

| Skill | Notes |
|---|---|
| `agents-team` | team/lead-plus-specialists workflow, built on `pi-subagents` |
| `ai-loop` | bounded spec-build-review loop |
| `consult` | read-only advisor model at decision checkpoints |
| `context-first` | lookup order for dev work: CodeGraph → TypeSafe Jev (narrow and batch classification) → Obsidian vault → plan and edit |
| `field-handoff` | office ↔ field handoff file (and paste-ready field-agent prompt) between the office and the real machine |
| `field-office-checklist` | MetalAutoUQDwpf only: list what still needs the real machine vs the office, field items layered by who can verify them |
| `freecad-cad` | FreeCAD as the verification and post-processing back end around `freecad-mcp`: OCCT part building, invalid-solid debugging, STEP round-trips, FEM and drawings, plus a bridge to text-to-cad models |
| `git-janitor` | sweep a messy working tree: commit, push, .gitignore, or delete each stray entry |
| `ssh-captain` | drive remote dev/build/test boxes over SSH |

## Local edits that a re-sync would clobber

These skills intentionally differ from upstream. Copying upstream over them loses the edit; merge instead.
Each edit has a sentinel in `scripts/local-edits.json` and, for `modified` skills, a diff to re-apply in
`patches/<skill>.patch`; `scripts/lint-skills.mjs` fails when either goes stale. Re-apply stays explicit:
this table is the instruction and `patches/README.md` has the commands.

| Skill | Edit | Why it matters |
|---|---|---|
| `show-me` | Removed upstream's `disable-model-invocation: true` and did not copy its `agents/openai.yaml` (`policy: allow_implicit_invocation: false`); deleted the upstream plugin leftovers (`.claude-plugin/`, `skills/show-me/`); rewrote the description with trigger branches; replaced `Bash(open …)` with a per-OS opener | The skill is model-invoked here on purpose. Its description is the only trigger, and `Bash(open …)` is Claude Code notation for a macOS command that fails on this Windows box. |
| `rpi` | Added `disable-model-invocation: true` and `agents/openai.yaml` with `policy.allow_implicit_invocation: false` | Upstream only says "only use when the user explicitly invokes this skill by name" in prose, so every harness would still auto-invoke it. |
| `visual-pr` | Same edit as `rpi` | Same reason. |
| `slint` | Added `official-tooling.md`, a three-line pointer to it above workflow step 1 in `SKILL.md`, and one row for it in `SKILL.md`'s reference-files table | Only the skill is installed, not Slint's plugin, so nothing else tells the agent to offer `slint-viewer`, `slint-lsp`, or the `slint-docs` MCP server. A sync that copies `SKILL.md` over drops the pointer and leaves the new file orphaned. Copy the rest of the tree, then re-add both `SKILL.md` lines. |
| `defuddle` | The `description` was rewritten into a longer routing description (adds "use instead of WebFetch", and the "not for `.md` URLs" caveat) | Description text is what the model routes on. Do not let a sync revert it to upstream's one-liner. |
| `code-review-and-quality` | Body rewritten and condensed relative to upstream (`SKILL.md` only; 362 lines locally vs 396 upstream, different frontmatter) | Upstream renamed/rewrote sections. Treat an upstream update as a source of ideas, not a patch to apply. The 2026-10-04 sync folded upstream's mutation-testing paragraph in at `1401c8b`. On 2026-10-29 two pointers to uninstalled skills were removed and the description now names the code-review branch. |
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

**It compares trees, so it cannot see a skill referenced by name but absent.** That is the shape of the
`pr` gap: `ask-matt` handed the PR body to `/pr` while `pr` was uninstalled. `--sources` lists upstream
skills that are not installed, but nothing connects that list to the skills that mention them.
`node scripts/lint-skills.mjs` checks the installed skills for references to names that are not
installed; known debt lives in `scripts/known-absent-refs.txt`. As of 2026-10-29 that file records
`council-mode` in `consult` and `@plan-writing` / `@ask-questions-if-underspecified` in `ai-loop`.

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
| `held` | manifest `local_state` is `hold`: upstream may move, this copy is deliberately pinned | none |

## Linting

```bash
node scripts/lint-skills.mjs           # errors fail the run; warnings are reported
node scripts/lint-skills.mjs --strict  # warnings fail too (use in CI or before a sync)
```

Checks: frontmatter parses and `name` matches the directory; the description is present and at most
1024 characters; no nested `SKILL.md`; `disable-model-invocation` agrees with `agents/openai.yaml`;
the manifest and the skill directories agree; the README's counts agree with the tree; every local edit
in `scripts/local-edits.json` is still applied; every `patches/*.patch` still reverse-applies; and no
skill names a name that is neither installed nor allowlisted in `scripts/known-absent-refs.txt`.

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
3. Re-apply any edit listed under "Local edits that a re-sync would clobber": `git apply patches/<skill>.patch`
   for a `modified` skill, by hand for a `divergent` one. The sentinels in `scripts/local-edits.json` tell
   you whether it survived; run the linter afterwards.
4. Update `scripts/skill-sources.tsv`: set the skill's `pinned_sha` to the commit you just synced, and
   refresh its `local_state` and `notes`.
5. Refresh the tables in this README to match, and note the new "last compared" date.
6. Run `node scripts/lint-skills.mjs --strict`, then commit to `eagle4302/agent-skills`.

Tell the agent to do these steps in one go — for example: *"run `scripts/check-skill-updates.sh`, and if
anything is `upstream-ahead`, sync it and follow README.md's sync procedure."*

## Manifest of record

`scripts/skill-sources.tsv` is authoritative — it is the file the script reads. This README renders the
same facts for humans. When they disagree, fix the README, not the TSV. Columns:

```
local_dir  source  upstream_path  pinned_sha  local_state  notes
```

`local_state` is one of `verbatim`, `modified`, `divergent`, `local-only`, `hold`. `hold` marks a copy pinned on purpose: the update check reports it as held instead of upstream-ahead.

## Pi frontmatter notes

- Pi accepts the Agent Skills fields `name`, `description`, `license`, `compatibility`, `metadata`,
  `allowed-tools`, and `disable-model-invocation`. 25 of the skills here carry
  `disable-model-invocation: true` — 23 straight from upstream, plus `rpi` and `visual-pr`, which
  were made user-invoked here. Keep it.
- `argument-hint` (used by `claude-handoff`, `handoff`, `loop-me`, `teach`) is a Claude Code field that
  Pi does not read. It is harmless in Pi, used by Claude Code (see "Using these skills from Claude Code"),
  and left in place to stay close to upstream.
- Skills with a `description` are the only ones Pi loads; a missing or malformed `description` means the
  skill is silently skipped. If you add a skill, check the startup diagnostics or `/skill:<name>`.
